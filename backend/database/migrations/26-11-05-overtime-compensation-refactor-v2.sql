-- Overtime - Compensation Model Refactor v2
-- Date: 2026-11-05
-- Target: MariaDB 10.11
--
-- IMPORTANT PRECONDITION:
-- Run this after operational overtime data has been cleared for go-live.
-- requests MUST be empty because requests.compensation_type_id references compensation_types.id.
-- Do NOT disable FOREIGN_KEY_CHECKS to force this migration through.

SELECT COUNT(*) AS requests_must_be_zero
FROM requests;

-- This DELETE intentionally fails if requests still reference compensation_types.
DELETE FROM compensation_types;

-- Support both the original schema and the previous compensation-refactor draft.
ALTER TABLE compensation_types
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS leave_days,
  ADD COLUMN IF NOT EXISTS fixed_amount DECIMAL(15,2) NULL AFTER compensation_kind,
  DROP INDEX IF EXISTS uq_compensation_kind;

ALTER TABLE compensation_types AUTO_INCREMENT = 1;

INSERT INTO compensation_types (
  code,
  name,
  compensation_kind,
  fixed_amount,
  description,
  is_active
) VALUES
  (
    'LEAVE',
    'Cuti',
    'LEAVE',
    NULL,
    'Dihitung otomatis dari durasi overtime: 4 sampai kurang dari 8 jam = 0.5 hari; 8 sampai kurang dari 12 jam = 1 hari; 12 jam atau lebih = 1.5 hari. National Holiday multiplier tetap berlaku.',
    1
  ),
  (
    'MONEY',
    'Uang',
    'MONEY',
    NULL,
    'Nominal diinput manual per overtime request. National Holiday multiplier tidak diterapkan ke nominal.',
    1
  ),
  (
    'MEAL_ALLOWANCE_ONLY',
    'HANYA UANG MAKAN',
    'MONEY',
    25000.00,
    'Nominal otomatis Rp25.000. Input nominal manual diabaikan dan National Holiday multiplier tidak diterapkan.',
    1
  );

SELECT
  id,
  code,
  name,
  compensation_kind,
  fixed_amount,
  description,
  is_active
FROM compensation_types
ORDER BY id;
