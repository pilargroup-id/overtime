-- Overtime approval rule fix: requester job position targeting
-- Purpose:
--   Prevent department-specific rules such as OFFICE_BOY_TO_GENERAL_AFFAIRS
--   from matching every employee with the same department + job level.
--
-- Current production issue:
--   OFFICE_BOY_TO_GENERAL_AFFAIRS = department HCGA + level 1
--   therefore HR Recruitment / General Affair / other HCGA Staff also matched.
--
-- IMPORTANT:
--   'Office Boy' must match the exact PilarGroup directory job_position value
--   used by Office Boy employees. Comparison in backend is case-insensitive
--   and trims surrounding whitespace.

START TRANSACTION;

ALTER TABLE approval_rules
  ADD COLUMN IF NOT EXISTS requester_job_position_name VARCHAR(100) NULL
  AFTER department_id;

UPDATE approval_rules
SET requester_job_position_name = 'Office Boy',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'OFFICE_BOY_TO_GENERAL_AFFAIRS'
  AND (requester_job_position_name IS NULL OR TRIM(requester_job_position_name) = '');

-- Verification: only the Office Boy-specific rule should normally have a value.
SELECT
  id,
  code,
  name,
  requester_min_job_level_value,
  requester_max_job_level_value,
  department_id,
  requester_job_position_name,
  approver_scope_type,
  approver_job_level_name,
  priority,
  is_active
FROM approval_rules
ORDER BY priority ASC, id ASC;

COMMIT;
