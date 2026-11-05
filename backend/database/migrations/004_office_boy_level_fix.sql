-- Overtime - Office Boy level 0.5 + approval routing fix
-- Date: 2026-11-05
-- Target: MariaDB 10.11+
--
-- Business rule:
--   Office Boy (HCGA) job level value 0.50 -> General Affair (Staff level 1.00)
--   Normal Staff level 1.00 -> Manager according to the existing STAFF_TO_MANAGER rule.
--
-- This migration:
--   1) Makes job-level-value columns decimal-capable.
--   2) Ensures requester_job_position_name exists.
--   3) Corrects OFFICE_BOY_TO_GENERAL_AFFAIRS to level 0.50 + position Office Boy.
--   4) Repairs existing pending Office Boy requests that were routed to Manager HCGA.

-- -----------------------------------------------------------------------------
-- A. SCHEMA: support fractional job levels such as 0.50
-- DDL statements commit implicitly in MariaDB, so data repair transaction starts
-- after these statements.
-- -----------------------------------------------------------------------------

ALTER TABLE approval_rules
  ADD COLUMN IF NOT EXISTS requester_job_position_name VARCHAR(100) NULL AFTER department_id;

ALTER TABLE approval_rules
  MODIFY COLUMN requester_min_job_level_value DECIMAL(6,2) NOT NULL,
  MODIFY COLUMN requester_max_job_level_value DECIMAL(6,2) NOT NULL,
  MODIFY COLUMN intermediate_job_level_value DECIMAL(6,2) NULL;

ALTER TABLE requests
  MODIFY COLUMN employee_job_level_value_snapshot DECIMAL(6,2) NULL;

ALTER TABLE request_approvals
  MODIFY COLUMN approver_job_level_value_snapshot DECIMAL(6,2) NULL;

-- -----------------------------------------------------------------------------
-- B. DATA/RULE REPAIR
-- -----------------------------------------------------------------------------

START TRANSACTION;

-- Correct the Office Boy rule.
UPDATE approval_rules
SET
  requester_min_job_level_value = 0.50,
  requester_max_job_level_value = 0.50,
  department_id = 1,
  requester_job_position_name = 'Office Boy',
  approver_scope_type = 'SPECIFIC_USER',
  approver_department_id = NULL,
  approver_job_level_name = 'd715b794-9390-4603-a696-b212a5c7f666',
  approval_type = 'OB_TO_GA',
  use_intermediate_approver = 0,
  intermediate_job_level_value = NULL,
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'OFFICE_BOY_TO_GENERAL_AFFAIRS';

-- Keep Staff routing starting at level 1.00.
-- Do not change its existing max value/department behavior.
UPDATE approval_rules
SET
  requester_min_job_level_value = 1.00,
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'STAFF_TO_MANAGER'
  AND requester_min_job_level_value <> 1.00;

-- Repair only still-pending Office Boy requests from the users whose PilarGroup
-- job positions were normalized from OB / OB/GA to Office Boy.
-- This does NOT touch approved/rejected/canceled requests or other HCGA staff.
UPDATE requests
SET
  employee_job_position_snapshot = 'Office Boy',
  employee_job_level_value_snapshot = 0.50,
  approval_type = 'OB_TO_GA',
  current_approver_id = 'd715b794-9390-4603-a696-b212a5c7f666',
  updated_at = CURRENT_TIMESTAMP
WHERE status = 'SUBMITTED'
  AND employee_id IN (
    'c5f30406-ebbf-4efd-b5b4-9e9a3d917da2',
    '3a4be2a8-83e9-4fee-8176-95aaf859b568',
    'cc37cc39-4a1c-4c04-9fd7-75f8e45da94f',
    '4fbe178b-3fd0-4ed4-b965-d87abbcdb6d3',
    '90f17028-ba17-4a07-8037-a553c089be01',
    'c4888ba4-fdd5-4677-bd6b-003fab69cb33',
    '5da978b8-ffed-4fa1-bbaf-fd088ce0cc82',
    'e3b6c2b4-e49d-497d-9ab2-c5fc00e39c40'
  )
  AND UPPER(REPLACE(TRIM(employee_job_position_snapshot), ' ', '')) IN (
    'OB',
    'OB/GA',
    'OFFICEBOY'
  );

-- Repair the corresponding still-pending approval rows.
UPDATE request_approvals ra
JOIN requests r ON r.id = ra.request_id
SET
  ra.approver_id = 'd715b794-9390-4603-a696-b212a5c7f666',
  ra.approver_name_snapshot = 'Mohammad Fadly V Delon Syam',
  ra.approver_job_position_snapshot = 'General Affair',
  ra.approver_job_level_name_snapshot = 'Staff',
  ra.approver_job_level_value_snapshot = 1.00,
  ra.updated_at = CURRENT_TIMESTAMP
WHERE r.status = 'SUBMITTED'
  AND r.approval_type = 'OB_TO_GA'
  AND ra.status = 'PENDING'
  AND r.employee_id IN (
    'c5f30406-ebbf-4efd-b5b4-9e9a3d917da2',
    '3a4be2a8-83e9-4fee-8176-95aaf859b568',
    'cc37cc39-4a1c-4c04-9fd7-75f8e45da94f',
    '4fbe178b-3fd0-4ed4-b965-d87abbcdb6d3',
    '90f17028-ba17-4a07-8037-a553c089be01',
    'c4888ba4-fdd5-4677-bd6b-003fab69cb33',
    '5da978b8-ffed-4fa1-bbaf-fd088ce0cc82',
    'e3b6c2b4-e49d-497d-9ab2-c5fc00e39c40'
  );

-- Verification before commit.
SELECT
  id,
  code,
  requester_min_job_level_value,
  requester_max_job_level_value,
  department_id,
  requester_job_position_name,
  approver_scope_type,
  approver_job_level_name,
  approval_type,
  is_active
FROM approval_rules
WHERE code IN ('OFFICE_BOY_TO_GENERAL_AFFAIRS', 'STAFF_TO_MANAGER')
ORDER BY id;

SELECT
  r.id,
  r.request_number,
  r.employee_id,
  r.employee_name_snapshot,
  r.employee_job_position_snapshot,
  r.employee_job_level_name_snapshot,
  r.employee_job_level_value_snapshot,
  r.approval_type,
  r.current_approver_id,
  ra.approver_id,
  ra.approver_name_snapshot,
  ra.approver_job_position_snapshot,
  ra.approver_job_level_name_snapshot,
  ra.approver_job_level_value_snapshot,
  ra.status AS approval_status
FROM requests r
JOIN request_approvals ra ON ra.request_id = r.id
WHERE r.status = 'SUBMITTED'
  AND r.employee_id IN (
    'c5f30406-ebbf-4efd-b5b4-9e9a3d917da2',
    '3a4be2a8-83e9-4fee-8176-95aaf859b568',
    'cc37cc39-4a1c-4c04-9fd7-75f8e45da94f',
    '4fbe178b-3fd0-4ed4-b965-d87abbcdb6d3',
    '90f17028-ba17-4a07-8037-a553c089be01',
    'c4888ba4-fdd5-4677-bd6b-003fab69cb33',
    '5da978b8-ffed-4fa1-bbaf-fd088ce0cc82',
    'e3b6c2b4-e49d-497d-9ab2-c5fc00e39c40'
  )
ORDER BY r.id;

COMMIT;
