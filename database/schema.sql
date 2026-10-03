-- ==========================================================================
-- ICU Sentinel — Initial Database Schema
-- Database: Neon PostgreSQL (neondb)
-- ==========================================================================

-- Sequence for sequential 3-digit patient IDs (001, 002, 003...)
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH 1 INCREMENT BY 1;

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(50) PRIMARY KEY,
    mrn VARCHAR(50) UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 130),
    gender VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ICU Admissions & Bed Allocations
CREATE TABLE IF NOT EXISTS icu_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_number VARCHAR(30) NOT NULL,
    diagnosis TEXT NOT NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    admission_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP WITH TIME ZONE,
    discharge_notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Stable' CHECK (status IN ('Stable', 'Alert', 'Critical', 'Observation', 'Discharged')),
    ventilator_attached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes and Active Admission Constraints
CREATE INDEX IF NOT EXISTS idx_admissions_bed ON icu_admissions(bed_number);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON icu_admissions(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bed_unique ON icu_admissions(bed_number) WHERE status != 'Discharged';
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_patient_unique ON icu_admissions(patient_id) WHERE status != 'Discharged';

-- 3. Vital Sign Observations (Continuous Telemetry & Spot Checks)
CREATE TABLE IF NOT EXISTS vital_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES icu_admissions(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heart_rate NUMERIC(5, 1) CHECK (heart_rate >= 0 AND heart_rate <= 300),
    bp_systolic NUMERIC(5, 1) CHECK (bp_systolic >= 0 AND bp_systolic <= 350),
    bp_diastolic NUMERIC(5, 1) CHECK (bp_diastolic >= 0 AND bp_diastolic <= 250),
    bp_mean NUMERIC(5, 1),
    spo2 NUMERIC(4, 1) CHECK (spo2 >= 0 AND spo2 <= 100),
    respiratory_rate NUMERIC(4, 1) CHECK (respiratory_rate >= 0 AND respiratory_rate <= 100),
    temperature NUMERIC(4, 2) CHECK (temperature >= 25.0 AND temperature <= 45.0),
    -- Ventilator parameters (when ventilated)
    ventilator_mode VARCHAR(50),
    peep NUMERIC(4, 1),
    fio2 NUMERIC(4, 1),
    tidal_volume NUMERIC(6, 1),
    peak_pressure NUMERIC(4, 1),
    -- Metadata & Data Provenance
    data_source VARCHAR(100) NOT NULL DEFAULT 'Manual Entry',
    is_stale BOOLEAN DEFAULT FALSE,
    notes TEXT,
    staff_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_time ON vital_observations(patient_id, recorded_at DESC);

-- 4. Clinical & Nursing Assessment Notes
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES icu_admissions(id) ON DELETE SET NULL,
    note_type VARCHAR(100) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    findings TEXT NOT NULL,
    plan TEXT,
    gcs_score VARCHAR(50),
    pupils VARCHAR(100),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_patient_time ON clinical_notes(patient_id, recorded_at DESC);

-- 5. Medication Administration Records (MAR)
CREATE TABLE IF NOT EXISTS medication_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES icu_admissions(id) ON DELETE SET NULL,
    medication_name VARCHAR(150) NOT NULL,
    prescribed_dose VARCHAR(50),
    administered_dose VARCHAR(50) NOT NULL,
    dose_unit VARCHAR(30) NOT NULL,
    route VARCHAR(80) NOT NULL,
    frequency VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Administered',
    admin_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    staff_name VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meds_patient_time ON medication_records(patient_id, admin_time DESC);

-- 6. Fluid Intake & Output (I/O) & Urine Records
CREATE TABLE IF NOT EXISTS fluid_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES icu_admissions(id) ON DELETE SET NULL,
    interval_label VARCHAR(100) NOT NULL,
    oral_intake_ml NUMERIC(8, 2) DEFAULT 0,
    iv_intake_ml NUMERIC(8, 2) DEFAULT 0,
    other_intake_ml NUMERIC(8, 2) DEFAULT 0,
    total_intake_ml NUMERIC(8, 2) GENERATED ALWAYS AS (COALESCE(oral_intake_ml, 0) + COALESCE(iv_intake_ml, 0) + COALESCE(other_intake_ml, 0)) STORED,
    urine_output_ml NUMERIC(8, 2) DEFAULT 0,
    other_output_ml NUMERIC(8, 2) DEFAULT 0,
    total_output_ml NUMERIC(8, 2) GENERATED ALWAYS AS (COALESCE(urine_output_ml, 0) + COALESCE(other_output_ml, 0)) STORED,
    net_balance_ml NUMERIC(8, 2) GENERATED ALWAYS AS ((COALESCE(oral_intake_ml, 0) + COALESCE(iv_intake_ml, 0) + COALESCE(other_intake_ml, 0)) - (COALESCE(urine_output_ml, 0) + COALESCE(other_output_ml, 0))) STORED,
    urine_appearance VARCHAR(100),
    catheter_status VARCHAR(100),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    staff_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fluids_patient_time ON fluid_records(patient_id, recorded_at DESC);

-- 7. Laboratory & Blood Gas (ABG) Results
CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES icu_admissions(id) ON DELETE SET NULL,
    panel_name VARCHAR(100) NOT NULL,
    test_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    collection_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Entered',
    staff_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_labs_patient_time ON lab_results(patient_id, collection_time DESC);
