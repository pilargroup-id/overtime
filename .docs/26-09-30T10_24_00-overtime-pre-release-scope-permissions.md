# Overtime - Pre-Release Fix: Approval Rule, Master Permission, and Scoped Request Management

**Date:** 2026-09-30 10:24 WIB  
**Scope:** Backend + Frontend + database migration for `approval_rules.approver_scope_type`  
**Status:** Revised source prepared for release review

## 1. Goals

This revision covers three requested changes:

1. Clean up the `SPECIFIC_USER` implementation in Approval Rules and stop duplicating PilarGroup directory resources inside the Overtime application.
2. Restrict Master Compensation Types so `REQUEST_CREATE_SCOPED` cannot access the master. Master access requires `REQUEST_CREATE_ALL`.
3. Extend `REQUEST_CREATE_SCOPED` from create-only behavior into request-management scope. A scoped user can see, edit, and cancel eligible overtime requests belonging to employees inside the granted scope, even when those employees submitted the requests themselves.

National Holiday behavior is not changed in this revision.

---

## 2. Database Change

The only schema change required for this release is the existing Approval Rule enum extension:

```sql
approver_scope_type ENUM(
  'SAME_DEPARTMENT',
  'GLOBAL',
  'SPECIFIC_DEPARTMENT',
  'SPECIFIC_USER'
)
```

No new column is introduced.

### Temporary storage convention for `SPECIFIC_USER`

Because the current schema has no `approver_user_id` column, a `SPECIFIC_USER` rule stores the selected PilarGroup user UUID in:

```text
approval_rules.approver_job_level_name
```

Interpretation:

| approver_scope_type | `approver_job_level_name` contains |
|---|---|
| `SAME_DEPARTMENT` | Job level/position target name |
| `GLOBAL` | Job level/position target name |
| `SPECIFIC_DEPARTMENT` | Job level/position target name |
| `SPECIFIC_USER` | PilarGroup canonical user UUID |

This is intentionally backward-compatible with the current one-column database change. A future schema cleanup may introduce a dedicated `approver_user_id`, but that is outside this release.

---

## 3. Approval Rules - PilarGroup Directory Integration

### Problem found

The submitted source registered these Overtime master resources:

```text
/master/departments
/master/job-levels
/master/users
```

However, the corresponding backend route files were not present in the uploaded backend. This can fail application startup when `src/routes/master/index.js` requires missing modules.

The frontend also declared API resources for those three Overtime endpoints even though the authoritative directory already exists in PilarGroup.

### Final architecture

The browser must not call the PilarGroup internal directory endpoint with `X-Internal-Secret` directly.

Final flow:

```text
Approval Rule Create/Edit dialog
        |
        v
GET /api/master/approval-rules/options
        |
        v
Overtime Backend
        |
        v
DirectoryService
        |
        v
PilarGroup internal directory
GET /api/internal/directory/users
X-Internal-Secret: <server-side secret>
```

The Overtime backend already owns `DirectoryService`, so the internal secret remains server-side.

### Approval Rule options response

`GET /api/master/approval-rules/options` returns UI-ready directory data:

```json
{
  "success": true,
  "data": {
    "users": [],
    "departments": [],
    "job_levels": []
  }
}
```

`departments` and `job_levels` are derived from the essential user directory payload. No separate Overtime `/users`, `/departments`, or `/job-levels` master endpoints are required.

### `SPECIFIC_USER` validation

When create/update uses:

```json
{
  "approver_scope_type": "SPECIFIC_USER",
  "approver_user_id": "<pilar-user-uuid>"
}
```

Backend validates that the user exists and is active in PilarGroup before saving the rule.

The Approval Resolver then resolves the exact user UUID instead of searching by job level.

---

## 4. Master Compensation Types Authorization

### Previous issue

The frontend sidebar configured Compensation Type with effectively:

```text
any permission => allowed
```

Therefore a user having only:

```text
REQUEST_CREATE_SCOPED
```

could see/open Master Compensation Types.

The backend master endpoint was also protected only by authentication + Overtime application access, so hiding the menu alone would not be sufficient.

### Final rule

Master Compensation Types requires:

```text
REQUEST_CREATE_ALL + GLOBAL
```

Enforcement exists in two layers:

1. Frontend navigation/page guard.
2. Backend permission middleware on `/api/master/compensation-types`.

A user with only `REQUEST_CREATE_SCOPED` receives `403` from the master endpoint even if the URL/API is called manually.

### Important: no implicit IT bypass

The reviewed source contains no automatic rule such as:

```text
Department IT => automatically access master
```

Therefore this revision does **not** add an implicit IT bypass. IT users must also have the required `REQUEST_CREATE_ALL` permission if they need Master Compensation Types.

If implicit IT master access is desired later, it should be implemented as an explicit authorization rule rather than inferred from department name/id in the UI.

### Compensation options for ordinary overtime forms

Ordinary users still need to select an active compensation type when creating/editing overtime. They must not need master permission for that.

A separate read-only endpoint is provided:

```http
GET /api/overtime/requests/compensation-options
```

This endpoint returns active compensation options for Overtime forms and display labels.

Master CRUD remains:

```http
GET    /api/master/compensation-types
GET    /api/master/compensation-types/:id
POST   /api/master/compensation-types
PUT    /api/master/compensation-types/:id
```

and requires `REQUEST_CREATE_ALL`.

---

## 5. `REQUEST_CREATE_SCOPED` Request Visibility and Management

### Required example

Given:

```text
User A: REQUEST_CREATE_SCOPED / DEPARTMENT X
User B: no special permission / DEPARTMENT X
User C: no special permission / DEPARTMENT X
```

Required behavior:

- A creates request for B -> visible to A and B.
- A creates request for C -> visible to A and C.
- B creates SELF request -> now visible to A and B.
- C creates SELF request -> now visible to A and C.
- A can edit/cancel B/C request when the normal request-state rules allow it.

### Previous behavior

Request list access was effectively limited to:

```sql
submitted_by = current_user
OR employee_id = current_user
```

Therefore `REQUEST_CREATE_SCOPED` controlled who A could create a request for, but did not expand A's request dashboard/manage scope.

### Final access model

Accessible requests are the union of:

```text
1. Request submitted by current user
2. Request belongs to current user
3. REQUEST_CREATE_SCOPED scope matches request company/department
4. REQUEST_CREATE_ALL scope matches request scope
```

Scope behavior:

| Permission | Scope | Request access |
|---|---|---|
| none | - | Own/submitted-by-self only |
| `REQUEST_CREATE_SCOPED` | `DEPARTMENT` | Own + requests whose `department_id` matches |
| `REQUEST_CREATE_SCOPED` | `COMPANY` | Own + requests whose `company_id` matches |
| `REQUEST_CREATE_ALL` | `GLOBAL` | All requests |
| `REPORT_MANAGE` | `GLOBAL` | Does not grant request edit/cancel management by itself |

### Detail, edit, and cancel use the same scope

The same server-side management authorization is used by:

```text
GET /api/overtime/requests/:id
PUT /api/overtime/requests/:id
PUT /api/overtime/requests/:id/cancel
```

This prevents a mismatch where a scoped request is visible in the dashboard but cannot be opened or managed.

### Existing edit safety remains active

Scoped access does not bypass request lifecycle rules.

Edit remains allowed only when:

```text
request.status = SUBMITTED
AND no approval has already been processed
```

Cancel remains allowed only while the request is still `SUBMITTED`.

---

## 6. Request Dashboard Filters

The existing request list now applies permission scope first.

`request_scope` remains usable as an additional filter:

```text
mine   => employee_id = current user
others => employee_id != current user
```

For a scoped User A:

- unfiltered request dashboard can contain A + B + C according to A's grant;
- `mine` contains A's own employee requests;
- `others` contains accessible employee requests other than A's own.

---

## 7. Frontend Corrections

### Removed unnecessary API resources

Removed frontend resources for:

```text
/master/users
/master/departments
/master/job-levels
```

Approval Rule dialogs now make one call:

```text
api.approvalRules.options()
```

### Fixed missing local files/imports

The uploaded frontend referenced files that were missing:

```text
./approvalRuleOptions.js
../../button/button-req-overtime/ButtonEditReqOvertime.jsx
```

Fixes:

- Added `approvalRuleOptions.js` as a UI-only mapping helper.
- Reused the existing generic `ButtonEdit.jsx` instead of creating a duplicate edit-button component.

### Compensation consumers

Non-master screens now use:

```text
api.overtimeRequests.compensationOptions()
```

Affected consumers:

- Create Overtime dialog
- Bulk Create Overtime dialog
- Edit Overtime dialog
- Request Overtime table
- Approval Overtime table
- Report table
- Report History table

Only the actual Compensation Type master page uses `api.compensationTypes` CRUD.

---

## 8. Files Changed

### Backend

```text
src/middleware/auth.middleware.js
src/routes/master/index.js
src/routes/master/compensation-type.routes.js
src/routes/master/approval-rule.routes.js
src/controllers/master/approval-rule.controller.js
src/services/master/approval-rule.service.js
src/routes/overtime/request.routes.js
src/controllers/overtime/request.controller.js
src/services/overtime/request.service.js
src/models/overtime/request.model.js
```

### Frontend

```text
src/App.jsx
src/services/api.js
src/components/layoute/Sidebar.jsx
src/components/Dialog/dialog-approval-rules/DialogCreateApprovalRules.jsx
src/components/Dialog/dialog-approval-rules/DialogEditApprovalRules.jsx
src/components/Dialog/dialog-approval-rules/approvalRuleOptions.js
src/components/Dialog/dialog-req-overtime/DialogCreateReqOvertime.jsx
src/components/Dialog/dialog-req-overtime/DialogCreateBulkReqOvertime.jsx
src/components/Dialog/dialog-req-overtime/DialogEditReqOvertime.jsx
src/components/table/dekstop/DataTableReqOvertime.jsx
src/components/table/dekstop/DataTableApprovalOvertime.jsx
src/components/table/dekstop/DataTableReport.jsx
src/components/table/dekstop/DataTableReportHistory.jsx
```

### Database

```text
approval_rules.approver_scope_type
```

No other database table is changed by this revision.

---

## 9. Unnecessary Release Artifacts Found in Frontend ZIP

The uploaded frontend contained temporary/build verification directories such as `.codex-vite-build*`, `.verification*`, and `tmp-vite-build*`.

These are not application source files and should not be committed or included in the production release artifact.

They are not included in the affected-file package produced for this revision.

---

## 10. Verification Performed

Backend:

- All backend `.js` files passed `node --check`.
- All backend relative `require(...)` paths were checked and resolve correctly after removing the invalid master route registrations.

Frontend static verification:

- Dependency graph reachable from `src/main.jsx` has no missing local imports after the fixes.
- No frontend source calls the PilarGroup internal directory endpoint directly.
- No frontend source references `/master/users`, `/master/departments`, or `/master/job-levels`.

Full Vite production build could not be executed in the isolated review environment because frontend dependencies were not available there (`vite: not found`). This is an environment/dependency limitation, not a successful build claim. Run the normal project `npm install`/`npm ci` and `npm run build` in the deployment/dev environment before release.

---

## 11. Release Checklist

1. Apply/verify the `SPECIFIC_USER` enum migration to `approval_rules`.
2. Replace only the affected backend files.
3. Replace/add only the affected frontend files.
4. Restart the Overtime backend.
5. Rebuild the frontend in the normal project environment.
6. Test Approval Rule create/edit using `SPECIFIC_USER`.
7. Test user with only `REQUEST_CREATE_SCOPED` cannot open/call Master Compensation Types.
8. Test user with `REQUEST_CREATE_ALL` can manage Master Compensation Types.
9. Test A/B/C department scenario:
   - B self-submits -> request appears to A.
   - C self-submits -> request appears to A.
   - A can open request detail.
   - A can edit while still eligible.
   - A can cancel while `SUBMITTED`.
10. Confirm B/C still see their own requests normally.
