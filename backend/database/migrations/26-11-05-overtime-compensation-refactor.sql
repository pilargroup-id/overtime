-- Overtime - Compensation Model Refactor
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

-- Master compensation no longer owns nominal amount or leave-day value.
-- MONEY amount is entered per overtime request.
-- LEAVE value is calculated from overtime duration by the backend.
ALTER TABLE compensation_types
  DROP COLUMN amount,
  DROP COLUMN leave_days,
  ADD UNIQUE KEY uq_compensation_kind (compensation_kind);

ALTER TABLE compensation_types AUTO_INCREMENT = 1;

INSERT INTO compensation_types (
  code,
  name,
  compensation_kind,
  description,
  is_active
) VALUES
  (
    'LEAVE',
    'Cuti',
    'LEAVE',
    'Dihitung otomatis dari durasi overtime: 4 sampai kurang dari 8 jam = 0.5 hari; 8 jam atau lebih = 1 hari. National Holiday multiplier tetap berlaku.',
    1
  ),
  (
    'MONEY',
    'Uang',
    'MONEY',
    'Nominal diinput manual per overtime request. Tidak ada kalkulasi durasi dan National Holiday multiplier tidak diterapkan ke nominal.',
    1
  );

SELECT
  id,
  code,
  name,
  compensation_kind,
  description,
  is_active
FROM compensation_types
ORDER BY id;
