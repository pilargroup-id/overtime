# Overtime Compensation Refactor v2

Canonical timestamp: `26-11-05T13:31:00`

## Scope

Update the pre-go-live compensation refactor. Backend and database only; frontend is intentionally out of scope for this patch.

The compensation master now contains three selectable rows while the underlying compensation kinds remain only `LEAVE` and `MONEY`:

- `LEAVE` — **Cuti**
- `MONEY` — **Uang** (manual amount)
- `MEAL_ALLOWANCE_ONLY` — **HANYA UANG MAKAN** (`MONEY`, fixed Rp25.000)

## Final business rules

### LEAVE / Cuti

Backend derives base leave compensation from actual overtime duration:

- `< 240 minutes` (`< 4 hours`) -> invalid
- `240-479 minutes` (`4 hours` to `< 8 hours`) -> base `0.5` day
- `480-719 minutes` (`8 hours` to `< 12 hours`) -> base `1.0` day
- `>= 720 minutes` (`>= 12 hours`) -> base `1.5` days

National Holiday multiplier remains applicable to LEAVE.

Examples with normal day:

```text
4 hours  -> 0.5 day
8 hours  -> 1.0 day
12 hours -> 1.5 days
```

Examples with National Holiday multiplier `2x`:

```text
4 hours  -> 0.5 x 2 = 1.0 day
8 hours  -> 1.0 x 2 = 2.0 days
12 hours -> 1.5 x 2 = 3.0 days
```

Stored snapshot:

```text
compensation_multiplier            = effective holiday multiplier
compensation_amount_snapshot       = NULL
compensation_leave_days_snapshot   = base leave days
final_compensation_amount          = NULL
final_compensation_leave_days      = base leave days x multiplier
```

### MONEY / Uang

This is the generic manual-money option.

- request must provide `compensation_amount`
- amount must be numeric and greater than `0`
- duration does not calculate the money amount
- National Holiday multiplier is skipped
- final amount equals manual input

Stored snapshot:

```text
compensation_multiplier            = 1
compensation_amount_snapshot       = manual amount
compensation_leave_days_snapshot   = NULL
final_compensation_amount          = manual amount
final_compensation_leave_days      = NULL
```

### HANYA UANG MAKAN

This row uses:

```text
code              = MEAL_ALLOWANCE_ONLY
compensation_kind = MONEY
fixed_amount      = 25000.00
```

Backend behavior:

- amount is always Rp25.000
- manual `compensation_amount` is not required and is ignored if supplied
- overtime duration does not calculate the amount
- National Holiday multiplier is skipped
- final amount is always Rp25.000

Stored snapshot:

```text
compensation_multiplier            = 1
compensation_amount_snapshot       = 25000.00
compensation_leave_days_snapshot   = NULL
final_compensation_amount          = 25000.00
final_compensation_leave_days      = NULL
```

## Database design

`compensation_types` becomes a type/configuration master. The old generic calculation columns are removed:

```text
amount
leave_days
```

A new nullable field is used only when a MONEY option has a system-defined amount:

```sql
fixed_amount DECIMAL(15,2) NULL
```

`fixed_amount = NULL` means MONEY amount must be entered on the request. A positive `fixed_amount` means backend uses the master amount automatically.

The previous draft's unique constraint on `compensation_kind` is removed because two active MONEY rows are now valid.

Production seed:

```text
LEAVE               | Cuti             | LEAVE | NULL
MONEY               | Uang             | MONEY | NULL
MEAL_ALLOWANCE_ONLY | HANYA UANG MAKAN | MONEY | 25000.00
```

The `requests` table requires no new columns. Existing snapshot/final columns continue to hold the value used at submission time.

## Backend changes

### `src/models/master/compensation-type.model.js`

- includes `fixed_amount` in list/detail/create/update data
- allows multiple rows with `compensation_kind = MONEY`

### `src/services/master/compensation-type.service.js`

- accepts nullable `fixed_amount`
- `fixed_amount`, when supplied, must be positive with maximum 2 decimal places
- LEAVE cannot have `fixed_amount`
- no longer rejects multiple rows of the same `compensation_kind`
- `code` remains unique

### `src/services/overtime/request.service.js`

Compensation calculation is centralized for create, bulk create, and edit.

For MONEY:

1. If master `fixed_amount` is positive, backend uses it and ignores manual amount.
2. Otherwise backend requires valid `compensation_amount` from the request.
3. `compensation_multiplier` is stored as `1` and National Holiday does not change the amount.

For LEAVE:

```text
< 4 hours       -> validation error
4 to < 8 hours  -> 0.5 day
8 to < 12 hours -> 1.0 day
>= 12 hours     -> 1.5 days
```

National Holiday multiplier remains applied after base leave days are derived.

## National Holiday behavior

No recurrence change is included. National Holiday lookup remains exact-date as in the current baseline.

Money-type compensation, including HANYA UANG MAKAN, skips National Holiday multiplication. LEAVE continues to use it.

## Migration

Use:

```text
26-11-05-overtime-compensation-refactor-v2.sql
```

Run only after operational Overtime request data is cleared for go-live. `requests` must be empty so old compensation master rows can be removed safely.

The migration is written to tolerate either:

- the original compensation schema (`amount`, `leave_days` still exist), or
- the previous compensation-refactor draft (those columns already removed and `uq_compensation_kind` may exist).

It deletes old master compensation rows and seeds exactly the three rows listed above.

## Files affected in v2

Only these backend files changed relative to compensation refactor v1:

```text
src/models/master/compensation-type.model.js
src/services/master/compensation-type.service.js
src/services/overtime/request.service.js
```

The v2 ZIP intentionally contains only those three revised files. If compensation refactor v1 has not yet been applied, apply the remaining v1 backend affected files first (request/approval/report query compatibility and request option routes), then overlay the three v2 files. The v2 SQL supersedes the v1 SQL; do not run both migrations.

## Frontend handoff note

Frontend was intentionally not modified in this v2 patch. The FE must eventually distinguish:

```text
LEAVE               -> no money input; display calculated leave preview
MONEY               -> show manual amount input
MEAL_ALLOWANCE_ONLY -> hide/lock manual amount and show Rp25.000
```

Backend remains authoritative for all final validation and snapshots.
