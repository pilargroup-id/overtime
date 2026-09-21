# Overtime - Edit Submitted Request

**Date:** 2026-09-21  
**Scope:** Backend update - edit overtime request while still eligible for editing  
**Status:** Implemented  
**Database migration:** Not required  
**National Holiday recurring YEARLY/ONCE:** Not included in this update

---

## 1. Objective

Add backend support so an overtime form that has already been submitted can still be edited while the request is still in the `SUBMITTED` stage and no approval has been processed.

This update does **not** change the existing National Holiday master behavior. National Holiday lookup remains exact-date based on the current `holiday_date` implementation.

---

## 2. New Endpoint

```http
PUT /api/overtime/requests/:id
```

Middleware remains consistent with the existing overtime request module:

```text
authenticate
requireApp('overtime')
```

### Example request

```json
{
  "day_type": "WORKDAY",
  "work_date": "2026-09-22",
  "start_time": "18:00",
  "end_date": "2026-09-22",
  "end_time": "21:00",
  "task_description": "Maintenance server",
  "result_description": "Maintenance completed",
  "compensation_type_id": 1
}
```

`end_date` may be omitted. When omitted:

- if `end_time >= start_time`, backend uses `work_date` as `end_date`;
- if `end_time < start_time`, backend resolves `end_date` to the next day.

---

## 3. Edit Eligibility Rules

A request can be edited only when all conditions below are satisfied:

1. Request exists.
2. Authenticated user is one of:
   - `submitted_by`, or
   - `employee_id`.
3. `requests.status = 'SUBMITTED'`.
4. Every row in `request_approvals` for the request is still `PENDING`.
5. The new `work_date` remains in the same year as `requests.sequence_year`.

### Approval guard

Backend locks and checks the request approval rows inside the same database transaction.

Any approval row whose status is not `PENDING` makes the request non-editable.

Examples:

| Approval status found | Editable |
|---|---:|
| All `PENDING` | Yes |
| Any `APPROVED` | No |
| Any `REJECTED` | No |
| Any `CANCELED` | No |

This prevents the requester from changing overtime details after an approver has already acted on the previous version of the request.

---

## 4. Editable Fields

The update endpoint accepts and recalculates the following form data:

| Field | Rule |
|---|---|
| `day_type` | Required. `WORKDAY`, `HOLIDAY`, `WEEKEND`, or resolved `NATIONAL_HOLIDAY` |
| `work_date` | Required, `YYYY-MM-DD` |
| `start_time` | Required, `HH:mm` or `HH:mm:ss` |
| `end_date` | Optional; backend can resolve it automatically |
| `end_time` | Required, `HH:mm` or `HH:mm:ss` |
| `task_description` | Required |
| `result_description` | Required |
| `compensation_type_id` | Required and must reference an active compensation type |

The endpoint behaves as a full form update for the editable form fields. FE should send the complete current form state instead of only the changed field.

---

## 5. Fields That Are Not Editable

The edit endpoint does not change request identity, employee identity, organization snapshots, numbering, or approval routing.

The following data stays unchanged:

```text
id
sequence_year
sequence_number
request_number
source_type
submitted_by
employee_id
employee_internal_id_snapshot
employee_name_snapshot
employee_job_position_snapshot
employee_job_level_id_snapshot
employee_job_level_name_snapshot
employee_job_level_value_snapshot
employee_employment_type_code_snapshot
company_id
company_code_snapshot
company_name_snapshot
department_id
department_code_snapshot
department_name_snapshot
department_class_snapshot
status
approval_type
current_approver_id
talenta_status
talenta_processed_by
talenta_processed_at
submitted_at
approved_at
rejected_at
canceled_at
```

If the employee itself is wrong, the intended flow is to cancel the request and create a new one instead of changing `employee_id` on an existing request.

---

## 6. Same-Year Restriction

`work_date` may be edited, but it cannot be moved to a different year from `sequence_year`.

Example:

```text
request_number = OVT-IT-26-00001
sequence_year  = 2026
```

Allowed:

```text
2026-09-22 -> 2026-10-05
```

Rejected:

```text
2026-09-22 -> 2027-01-05
```

The backend returns a validation error and instructs the user to cancel and create a new request.

Reason: the request number and sequence are already tied to the original year.

---

## 7. Backend Recalculation on Edit

The edit endpoint does not perform a raw form-field update only. Derived overtime data is recalculated by the backend.

Flow:

```text
request payload
    |
    +-> validate input
    |
    +-> validate backdate limit
    |
    +-> resolve end_date
    |
    +-> calculate total_minutes
    |
    +-> validate active compensation type
    |
    +-> check National Holiday using existing exact-date lookup
    |
    +-> resolve day_type
    |
    +-> resolve compensation multiplier
    |
    +-> recalculate compensation snapshots/final values
    |
    +-> transaction + ownership/status/approval validation
    |
    +-> update requests
    |
    +-> write request_logs
```

### Recalculated database fields

```text
day_type
work_date
start_time
end_date
end_time
total_minutes
task_description
result_description
compensation_type_id
compensation_multiplier
compensation_amount_snapshot
compensation_leave_days_snapshot
final_compensation_amount
final_compensation_leave_days
```

`updated_at` continues to be maintained by the existing database definition.

---

## 8. National Holiday Behavior in This Update

There is intentionally **no change** to National Holiday recurrence in this release.

Current backend lookup remains exact-date based.

Example current behavior:

```text
Master holiday_date = 2026-09-22

2026-09-22 -> matches National Holiday
2027-09-22 -> does not match
```

When an edited `work_date` exactly matches an active National Holiday record:

```text
day_type = NATIONAL_HOLIDAY
compensation_multiplier = national_holidays.multiplier
```

The compensation snapshots/final values are then recalculated using that multiplier.

### Deferred enhancement

A future update may introduce recurrence configuration such as:

```text
ONCE
YEARLY
```

That future change is explicitly outside the scope of this implementation.

---

## 9. National Holiday Input Protection

The edit endpoint does not allow FE to arbitrarily force `NATIONAL_HOLIDAY`.

If FE sends:

```json
{
  "day_type": "NATIONAL_HOLIDAY",
  "work_date": "2026-09-23"
}
```

but `2026-09-23` is not found as an active National Holiday, backend returns a validation error.

If the date is found in the master, backend itself resolves the final `day_type` to `NATIONAL_HOLIDAY` regardless of the normal day type supplied by FE.

---

## 10. Existing Backdate Rule Still Applies

Edit uses the existing maximum backdate rule:

```text
MAX_BACKDATE_MONTHS = 2
```

Therefore editing cannot be used to move `work_date` beyond the existing allowed backdate window.

---

## 11. Audit Log

Successful edits create a new `request_logs` row.

Values:

```text
action      = UPDATED
from_status = SUBMITTED
to_status   = SUBMITTED
note        = Submitted overtime request details updated
```

Actor information uses the authenticated user performing the edit.

No database migration is required because `request_logs.action` is already a `varchar` field.

---

## 12. Error Cases

### Request not found

```text
404 - Overtime request not found
```

### User is not requester/submitted actor

```text
403 - You are not allowed to edit this overtime request
```

### Request is no longer SUBMITTED

```text
400
status: Only SUBMITTED request can be edited
```

### Approval has already been processed

```text
400
approval: Request cannot be edited after an approval has been processed
```

### Work date moved to another year

```text
400
work_date: work_date cannot be moved to a different year; cancel and create a new request instead
```

### Invalid National Holiday override

```text
400
day_type: NATIONAL_HOLIDAY can only be used when work_date is an active national holiday
```

### Invalid time range

```text
400
time_range: End datetime must be greater than start datetime
```

### Compensation type invalid/inactive

```text
400
compensation_type_id: Active compensation type not found
```

---

## 13. Files Changed

Only backend files directly required by this feature were changed:

```text
backend/src/routes/overtime/request.routes.js
backend/src/controllers/overtime/request.controller.js
backend/src/services/overtime/request.service.js
backend/src/models/overtime/request.model.js
backend/src/models/overtime/approval.model.js
```

### Responsibility by file

#### `request.routes.js`
Adds:

```http
PUT /:id
```

#### `request.controller.js`
Adds `update()` controller and response/error handling.

#### `request.service.js`
Adds the main update business flow:

- payload validation;
- time calculation;
- active compensation validation;
- existing National Holiday resolution;
- compensation recalculation;
- transactional ownership/status/approval checks;
- same-year validation;
- update execution;
- audit log creation.

#### `request.model.js`
Adds `updateSubmitted()` for updating only editable request fields while requiring:

```sql
status = 'SUBMITTED'
```

#### `approval.model.js`
Adds `hasProcessedByRequestId()` to lock request approval rows and determine whether any approval is no longer `PENDING`.

---

## 14. Database Changes

No schema change is required for this feature.

Existing tables used:

```text
requests
request_approvals
request_logs
compensation_types
national_holidays
```

No migration SQL is included in this update.

---

## 15. Frontend Integration Notes

FE can use the existing request detail as the initial edit-form value, then submit the complete editable form to:

```http
PUT /api/overtime/requests/:id
```

Recommended FE behavior:

1. Show the Edit action for a `SUBMITTED` request.
2. Open existing request data in the edit form.
3. Do not expose employee/request-number/organization/approval fields as editable inputs.
4. Submit the complete editable form state.
5. If backend returns the approval/status validation error, close or refresh edit state because the approver may have acted after the page was loaded.
6. Always use the returned request data after a successful update because backend may recalculate `end_date`, `day_type`, multiplier, total minutes, and compensation values.

The backend remains the source of truth for edit eligibility; FE visibility of the Edit button is only a UX convenience and must not replace backend validation.

---

## 16. Final Scope Decision

Implemented now:

```text
Edit SUBMITTED overtime request
+ only before any approval is processed
+ derived values recalculated by backend
+ existing exact-date National Holiday logic retained
+ audit log recorded
```

Deferred:

```text
National Holiday recurrence:
ONCE / YEARLY
```
