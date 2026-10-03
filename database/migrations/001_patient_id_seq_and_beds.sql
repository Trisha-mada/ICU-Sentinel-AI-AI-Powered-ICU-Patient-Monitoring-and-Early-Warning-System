-- ==========================================================================
-- ICU Sentinel — Migration 001: Patient ID Sequence, Admission Timestamps, and Active Bed Constraints
-- ==========================================================================

-- 1. Create concurrency-safe sequence for sequential 3-digit patient IDs (001, 002, 003...)
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH 1 INCREMENT BY 1;

-- Ensure sequence value is in sync if existing numeric patient IDs exist
SELECT setval(
  'patient_id_seq', 
  COALESCE((SELECT MAX(CASE WHEN id ~ '^\d+$' THEN id::integer ELSE 0 END) FROM patients), 0) + 1, 
  false
);

-- 2. Add admission_time column to icu_admissions if not present
ALTER TABLE icu_admissions 
  ADD COLUMN IF NOT EXISTS admission_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Add discharge_notes column to icu_admissions if not present
ALTER TABLE icu_admissions 
  ADD COLUMN IF NOT EXISTS discharge_notes TEXT;

-- 4. Create partial unique index to guarantee at the database level that only one active patient occupies a bed
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bed_unique 
  ON icu_admissions (bed_number) 
  WHERE status != 'Discharged';

-- 5. Create partial unique index to guarantee a patient can only have one active ICU admission
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_patient_unique 
  ON icu_admissions (patient_id) 
  WHERE status != 'Discharged';
