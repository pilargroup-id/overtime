-- Overtime approval rule fix v2: requester job position targeting
-- Safe to run on MariaDB 10.11 even if the column already exists.
-- No transaction wrapper is used because ALTER TABLE causes implicit commit in MariaDB.

-- 1) Add requester_job_position_name only when it does not exist.
SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'approval_rules'
    AND COLUMN_NAME = 'requester_job_position_name'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE approval_rules ADD COLUMN requester_job_position_name VARCHAR(100) NULL AFTER department_id',
  'SELECT ''requester_job_position_name already exists'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Verify the column exists before updating data.
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'approval_rules'
  AND COLUMN_NAME = 'requester_job_position_name';

-- 3) Restrict the Office Boy-specific rule to Office Boy requesters.
UPDATE approval_rules
SET requester_job_position_name = 'Office Boy',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'OFFICE_BOY_TO_GENERAL_AFFAIRS';

-- 4) Verify approval rules after migration.
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
