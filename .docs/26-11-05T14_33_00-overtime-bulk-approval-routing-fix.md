# Overtime - Bulk Approval Routing Fix

## Scope

Backend + database only. No frontend files are changed.

## Incident

When a user with bulk-create permission created overtime requests for multiple HCGA employees, the requests were successfully created with `source_type = ALL_INPUT`, but they did not appear in the expected Manager approval list.

The database showed that the requests were not assigned to the Manager at all. They were assigned to the specific General Affair user configured by rule `OFFICE_BOY_TO_GENERAL_AFFAIRS`.

Examples from the incident showed employees with positions such as `HR Recruitment` and `General Affair` receiving:

- `approval_type = OB_TO_GA`
- `current_approver_id = d715b794-9390-4603-a696-b212a5c7f666`

The corresponding `request_approvals` rows also had that same user as `approver_id`.

## Root cause

Bulk creation was not the problem.

`bulkCreate()` calls the normal `create()` flow once for each target employee, so approval resolution is based on the target employee rather than the submitter.

The problem was the Approval Rule matcher. Before this fix, `findMatchingRule()` matched requester rules using only:

1. requester job level value;
2. requester department;
3. rule priority.

The `OFFICE_BOY_TO_GENERAL_AFFAIRS` rule was configured as:

- department: HCGA;
- requester level: 1 to 1;
- specific final approver: General Affair user.

There was no requester job-position condition in the schema. Therefore the rule effectively meant:

> Any HCGA employee with job level value 1 -> General Affair

instead of:

> HCGA Office Boy with job level value 1 -> General Affair

Because department-specific rules are preferred over generic rules, this rule won before the generic `STAFF_TO_MANAGER` rule.

## Fix

A nullable field is added to `approval_rules`:

```text
requester_job_position_name VARCHAR(100) NULL
```

Rule matching now uses:

- requester job level;
- requester department;
- optional requester job position;
- priority.

A rule with `requester_job_position_name` is more specific than a rule without it.

The Office Boy rule is updated to:

```text
code: OFFICE_BOY_TO_GENERAL_AFFAIRS
department_id: 1
requester job level: 1..1
requester_job_position_name: Office Boy
approver_scope_type: SPECIFIC_USER
```

Generic rules such as `STAFF_TO_MANAGER` remain with:

```text
requester_job_position_name = NULL
```

## Expected routing after fix

### HCGA Office Boy, level 1

Matches:

```text
OFFICE_BOY_TO_GENERAL_AFFAIRS
```

and is routed to the configured General Affair user.

### HCGA HR Recruitment, level 1

Does not match the Office Boy rule because `job_position != Office Boy`.

Falls back to:

```text
STAFF_TO_MANAGER
```

and is routed to the HCGA Manager.

### HCGA General Affair, level 1

Also does not match the Office Boy rule and falls back to `STAFF_TO_MANAGER`.

## Approval list behavior

No change is required in the Manager approval-list query.

The approval list intentionally filters:

```text
request_approvals.approver_id = authenticated user id
```

The Manager previously saw nothing because the wrong approver had already been stored during request creation. Once routing creates the correct `request_approvals.approver_id`, the existing Manager approval endpoint will return the request normally.

## Existing incorrectly routed requests

Requests already created before this patch keep their existing:

- `approval_type`;
- `current_approver_id`;
- `request_approvals.approver_id`.

The patch does not silently rewrite submitted workflow history.

For current test requests that were routed incorrectly, cancel them and recreate them after deployment/migration.

## Approval Rule API changes

Approval Rule create/update now accepts optional:

```json
{
  "requester_job_position_name": "Office Boy"
}
```

Use `null` when a rule applies to all requester positions within its existing department/job-level criteria.

Approval Rule options now also returns:

```json
{
  "job_positions": [
    "Office Boy",
    "HR Recruitment",
    "General Affair"
  ]
}
```

The values are derived from the existing PilarGroup directory users endpoint through the current backend directory service. No new directory endpoint is introduced.

## Files changed

```text
src/models/master/approval-rule.model.js
src/services/master/approval-rule.service.js
src/services/overtime/approval-resolver.service.js
```

Database migration:

```text
26-11-05-overtime-approval-rule-requester-job-position.sql
```

## Deployment order

1. Verify PilarGroup uses `Office Boy` as the exact `job_position` value for Office Boy employees.
2. Deploy the three affected backend files.
3. Run the SQL migration.
4. Restart the Overtime backend process.
5. Cancel/recreate any test requests that were previously routed as `OB_TO_GA` incorrectly.
6. Test a non-Office-Boy HCGA Staff bulk request; expected approver is the HCGA Manager.
7. Test an actual Office Boy request; expected approver is the configured General Affair user.

## Verification SQL

```sql
SELECT
  id,
  code,
  department_id,
  requester_min_job_level_value,
  requester_max_job_level_value,
  requester_job_position_name,
  approver_scope_type,
  approver_job_level_name,
  priority
FROM approval_rules
ORDER BY priority ASC, id ASC;
```

After creating new test requests:

```sql
SELECT
  r.id,
  r.request_number,
  r.source_type,
  r.employee_name_snapshot,
  r.employee_job_position_snapshot,
  r.approval_type,
  r.current_approver_id,
  ra.approver_id,
  ra.approver_name_snapshot,
  ra.status AS approval_status
FROM requests r
LEFT JOIN request_approvals ra ON ra.request_id = r.id
ORDER BY r.id DESC;
```
