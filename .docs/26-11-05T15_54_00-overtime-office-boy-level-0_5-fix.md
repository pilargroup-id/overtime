# Overtime - Office Boy level 0.5 approval fix

## Correct business rule

- **Office Boy** belongs to HCGA and has `job_level_value = 0.50`.
- Office Boy overtime approval goes to **General Affair**.
- Current specific approver: **Mohammad Fadly V Delon Syam** (`d715b794-9390-4603-a696-b212a5c7f666`).
- General Affair is **Staff**, `job_level_value = 1.00`.
- Normal Staff (`1.00`) continues through the existing `STAFF_TO_MANAGER` rule.

## Root cause

The earlier routing assumed Office Boy was level `1`. In addition, Overtime database job-level-value columns were integer-oriented, while the real hierarchy includes `0.50`.

The previous requester-job-position patch is still required because it prevents all HCGA Staff from matching the special Office Boy rule. The Office Boy rule now requires both:

- `requester_job_position_name = Office Boy`
- requester level `0.50 .. 0.50`

## Backend files

Only the affected backend files are included:

- `src/models/master/approval-rule.model.js`
- `src/services/master/approval-rule.service.js`
- `src/services/overtime/approval-resolver.service.js`

No frontend files are included.

## Database changes

The migration changes these level columns to `DECIMAL(6,2)`:

- `approval_rules.requester_min_job_level_value`
- `approval_rules.requester_max_job_level_value`
- `approval_rules.intermediate_job_level_value`
- `requests.employee_job_level_value_snapshot`
- `request_approvals.approver_job_level_value_snapshot`

It then corrects `OFFICE_BOY_TO_GENERAL_AFFAIRS` to level `0.50` and `Office Boy`.

## Existing production data repair

Only `SUBMITTED` requests for the eight known employees whose PilarGroup position was normalized from `OB` / `OB/GA` to `Office Boy` are eligible for rerouting. The migration additionally requires the old Overtime snapshot to be `OB`, `OB/GA`, or `Office Boy`.

Those pending requests are changed to:

- requester position snapshot: `Office Boy`
- requester level value snapshot: `0.50`
- approval type: `OB_TO_GA`
- current approver: Mohammad Fadly V Delon Syam
- approver position: `General Affair`
- approver level: `Staff`
- approver level value: `1.00`

Approved, rejected, canceled, and unrelated HCGA Staff requests are not rerouted.

## PilarGroup prerequisite for future requests

Overtime consumes employee hierarchy from the PilarGroup directory. For future Office Boy requests to be fully consistent, PilarGroup must return the employee as:

- `job_position = Office Boy`
- `job_level_value = 0.50`

If PilarGroup still returns `job_level_value = 1`, Overtime will correctly support decimals but the new request will still arrive with the wrong source level.

## Deployment order

1. Ensure PilarGroup Office Boy master data uses `job_position = Office Boy` and level value `0.50`.
2. Replace only the affected backend files from the package.
3. Run `26-11-05-overtime-office-boy-level-0_5-fix.sql` on production MariaDB.
4. Restart `overtime-api`.
5. Verify the rule and existing pending request rows using the SELECT output included at the end of the migration.
6. Test one new Office Boy request and one normal HCGA Staff request.

Expected:

- Office Boy `0.50` -> General Affair / Staff `1.00`
- HCGA Staff `1.00` -> Manager HCGA
