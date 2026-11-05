# Overtime Compensation Refactor

Canonical timestamp: `26-11-05T10:50:00`

## Scope

Refactor compensation flow before Overtime go-live so compensation master no longer stores individual nominal/rate variants.

Final compensation kinds remain exactly:

- `LEAVE` — displayed as **Cuti**
- `MONEY` — displayed as **Uang**

This update changes database structure, backend calculation/validation, frontend request forms, approval/report query compatibility, and National Holiday option access for normal Overtime users.

## Final business rules

### LEAVE / Cuti

Backend derives leave compensation from actual overtime duration:

- `< 240 minutes` (`< 4 hours`) → invalid
- `240–479 minutes` (`4 hours` to `< 8 hours`) → base `0.5` day
- `>= 480 minutes` (`>= 8 hours`) → base `1` day

National Holiday multiplier remains applicable to LEAVE.

Examples:

- 4 hours, normal day → base `0.5`, final `0.5`
- 4 hours, National Holiday `2x` → base `0.5`, final `1.0`
- 8 hours, normal day → base `1.0`, final `1.0`
- 8 hours, National Holiday `2x` → base `1.0`, final `2.0`

Stored request snapshot:

```text
compensation_multiplier            = effective holiday multiplier
compensation_amount_snapshot       = NULL
compensation_leave_days_snapshot   = base leave days
final_compensation_amount          = NULL
final_compensation_leave_days      = base leave days * multiplier
```

### MONEY / Uang

Nominal is manually entered per request using request payload field:

```json
{
  "compensation_type_id": 2,
  "compensation_amount": 250000
}
```

Rules:

- amount is mandatory for `MONEY`
- amount must be numeric and greater than `0`
- maximum 2 decimal places are accepted by backend validation
- overtime duration does not calculate the money amount
- National Holiday multiplier does **not** multiply MONEY
- request can still be classified as `NATIONAL_HOLIDAY`; only monetary calculation skips the multiplier

Stored request snapshot:

```text
compensation_multiplier            = 1
compensation_amount_snapshot       = manual input amount
compensation_leave_days_snapshot   = NULL
final_compensation_amount          = manual input amount
final_compensation_leave_days      = NULL
```

Example:

```text
Manual amount        : 250000
National Holiday     : 2x
Final money          : 250000
compensation_multiplier stored: 1
```

## Database change

`compensation_types` no longer owns calculation values.

Removed columns:

```text
amount
leave_days
```

The master becomes metadata only:

```text
id
code
name
compensation_kind
is_active
description
created_at
updated_at
```

A unique key is added to `compensation_kind`, so the master cannot proliferate into many MONEY/LEAVE variants:

```sql
UNIQUE KEY uq_compensation_kind (compensation_kind)
```

Production seed after migration:

```text
LEAVE | Cuti | LEAVE
MONEY | Uang | MONEY
```

The `requests` table requires no new column. Existing snapshot/final columns are reused.

### Migration order

Run `26-11-05-overtime-compensation-refactor.sql` **after operational Overtime data is cleared for go-live**.

The SQL intentionally does not disable foreign-key checks. If `requests` still references `compensation_types`, deletion of old compensation rows must fail rather than create orphaned request data.

Expected precondition:

```sql
SELECT COUNT(*) FROM requests;
-- expected: 0
```

## Backend changes

### `src/services/overtime/request.service.js`

Create, bulk create, and edit use the same compensation resolver.

For `MONEY`:

- validates `compensation_amount`
- ignores National Holiday multiplier for amount calculation
- stores multiplier `1`

For `LEAVE`:

- validates minimum 4-hour duration
- derives base leave days from duration
- applies National Holiday multiplier

Bulk payload now supports `compensation_amount` both globally (`equalize`) and per item.

### `src/models/master/compensation-type.model.js`

Removed all reads/writes for master `amount` and `leave_days`.

### `src/services/master/compensation-type.service.js`

Removed amount/leave-day validation from master CRUD.

A duplicate compensation kind is rejected so only one MONEY and one LEAVE master row can exist.

### `src/models/overtime/request.model.js`

Detail query no longer reads `ct.amount` or `ct.leave_days` because those columns are removed.

Compatibility aliases now come from request snapshots:

```text
compensation_amount      <- compensation_amount_snapshot
compensation_leave_days  <- compensation_leave_days_snapshot
```

### `src/models/overtime/approval.model.js`

Approval list/detail no longer falls back to removed master amount/leave-day fields. It reads request snapshots only.

### `src/models/overtime/report.model.js`

Report list/detail no longer falls back to removed master amount/leave-day fields. It reads request snapshots only.

## National Holiday form-access fix

Normal Overtime users must not consume the protected master-management endpoint:

```text
GET /api/master/national-holidays
```

A read-only option endpoint is added:

```http
GET /api/overtime/requests/national-holiday-options
```

Authentication requirements:

```text
authenticate
requireApp('overtime')
```

It returns active National Holiday records for request form preview/calculation without granting master-management permission.

Frontend create/edit/bulk request dialogs now use this endpoint.

Important: this does **not** change National Holiday recurrence behavior. The backend still resolves National Holiday using exact `holiday_date`. The postponed `YEARLY / ONCE` design remains out of scope.

## Frontend request behavior

### Compensation selection

Request forms load only active compensation types through:

```http
GET /api/overtime/requests/compensation-options
```

Options represent type only, e.g.:

```text
Cuti (LEAVE)
Uang (MONEY)
```

### MONEY selected

Frontend shows editable numeric `Compensation Amount`.

Payload:

```json
{
  "compensation_type_id": 2,
  "compensation_amount": 250000
}
```

If Work Date is National Holiday, UI informs the user that MONEY is not multiplied.

### LEAVE selected

Amount input becomes a read-only leave preview.

Examples:

```text
3 hours  -> Minimal 4 jam
4 hours  -> 0.5 hari
8 hours  -> 1 hari
```

On National Holiday `2x`:

```text
4 hours -> 0.5 hari x 2 = 1 hari
8 hours -> 1 hari x 2 = 2 hari
```

Backend remains the source of truth; frontend preview does not replace backend validation.

## Master Compensation frontend

Master create/edit no longer asks for:

```text
Amount
Leave Days
```

The table no longer displays those columns.

The Compensation Type table also no longer presents a Delete action, consistent with the backend where Compensation Type has no `DELETE` route. Active/inactive lifecycle remains through `is_active` / update.

## Request endpoints affected

Existing endpoints keep their paths:

```http
POST /api/overtime/requests
POST /api/overtime/requests/bulk
PUT  /api/overtime/requests/:id
```

New optional request field for MONEY:

```text
compensation_amount
```

New read-only form endpoint:

```http
GET /api/overtime/requests/national-holiday-options
```

Existing read-only compensation endpoint remains:

```http
GET /api/overtime/requests/compensation-options
```

## Validation test matrix

### MONEY normal day

Input:

```text
Duration: 2 hours
Type: MONEY
Amount: 175000
```

Expected:

```text
HTTP success
amount snapshot = 175000
final amount = 175000
multiplier = 1
leave fields = NULL
```

### MONEY National Holiday 2x

Input:

```text
Duration: 5 hours
Type: MONEY
Amount: 250000
Holiday multiplier: 2
```

Expected:

```text
day_type = NATIONAL_HOLIDAY
amount snapshot = 250000
final amount = 250000
multiplier = 1
```

### MONEY missing amount

Expected HTTP `400` with validation error on:

```text
compensation_amount
```

### LEAVE below 4 hours

Input duration `239` minutes.

Expected HTTP `400`:

```text
LEAVE compensation requires at least 4 hours of overtime
```

### LEAVE 4 hours normal day

Expected:

```text
base leave = 0.5
final leave = 0.5
multiplier = 1
```

### LEAVE 4 hours National Holiday 2x

Expected:

```text
base leave = 0.5
final leave = 1.0
multiplier = 2
```

### LEAVE 8 hours normal day

Expected:

```text
base leave = 1
final leave = 1
```

### LEAVE 8 hours National Holiday 2x

Expected:

```text
base leave = 1
final leave = 2
multiplier = 2
```

### Edit MONEY -> LEAVE

Expected after update:

```text
amount snapshot/final amount = NULL
leave snapshot/final leave = recalculated
```

### Edit LEAVE -> MONEY

Expected after update:

```text
leave snapshot/final leave = NULL
manual compensation_amount is mandatory
amount snapshot/final amount = manual input
```

## Files changed

Backend:

```text
src/controllers/overtime/request.controller.js
src/models/master/compensation-type.model.js
src/models/overtime/approval.model.js
src/models/overtime/report.model.js
src/models/overtime/request.model.js
src/routes/overtime/request.routes.js
src/services/master/compensation-type.service.js
src/services/overtime/request.service.js
```

Frontend:

```text
src/services/api.js
src/components/Dialog/dialog-compensation/DialogCreateCompensation.jsx
src/components/Dialog/dialog-compensation/DialogEditCompensation.jsx
src/components/Dialog/dialog-req-overtime/DialogCreateReqOvertime.jsx
src/components/Dialog/dialog-req-overtime/DialogEditReqOvertime.jsx
src/components/Dialog/dialog-req-overtime/DialogCreateBulkReqOvertime.jsx
src/components/table/dekstop/DataTableCompensationType.jsx
```

Database:

```text
26-11-05-overtime-compensation-refactor.sql
```

## Verification performed

Backend:

- all revised JavaScript files pass `node --check`
- revised backend relative `require()` references resolve
- no remaining backend query references `ct.amount` or `ct.leave_days`

Frontend:

- revised files have valid local relative imports
- request dialogs no longer call protected `api.nationalHolidays.list()`
- old `compensationType.amount` / `compensationType.leave_days` form dependencies are removed
- delimiter/static structure checks pass on revised JSX/JS files

A full Vite build could not be completed in the artifact environment because dependency installation did not complete; run the normal project `npm ci` / `npm run build` in the development environment before deployment.
