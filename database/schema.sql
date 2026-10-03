-- ==========================================================================
-- ICU Sentinel — Database Schema
-- Database: Neon PostgreSQL (neondb)
-- 
-- Exactly 4 Tables:
-- 1. patients (Patient stay & bed allocation)
-- 2. manual_lab_records (Nurse-entered FiO2, pH, PaCO2, lactate)
-- 3. telemetry_snapshots (Persistent vital-sign telemetry history)
-- 4. deterioration_alerts (Risk predictions, early warnings, acknowledgments)
-- ==========================================================================

-- 1. Patients Table (Bed allocation & Stay status)
CREATE TABLE IF NOT EXISTS patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    bed_id VARCHAR(30) NOT NULL,
    admission_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discharge_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX IF NOT EXISTS idx_patients_bed_id ON patients(bed_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

-- 2. Manual Laboratory Records (Nurse-entered ABG / Labs)
CREATE TABLE IF NOT EXISTS manual_lab_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fio2 NUMERIC(4, 2) NOT NULL DEFAULT 0.21,
    ph NUMERIC(4, 2),
    paco2 NUMERIC(5, 1),
    lactate NUMERIC(5, 2),
    recorded_by VARCHAR(100) DEFAULT 'NURSE_STATION',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_manual_labs_patient_time ON manual_lab_records(patient_id, recorded_at DESC);

-- 3. Telemetry Snapshots (Vital Sign History)
CREATE TABLE IF NOT EXISTS telemetry_snapshots (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heart_rate NUMERIC(5, 1),
    spo2 NUMERIC(4, 1),
    sbp NUMERIC(5, 1),
    map NUMERIC(5, 1),
    dbp NUMERIC(5, 1),
    resp NUMERIC(4, 1)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_patient_time ON telemetry_snapshots(patient_id, recorded_at DESC);

-- 4. Deterioration Alerts (Risk Predictions & Early Warnings)
CREATE TABLE IF NOT EXISTS deterioration_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    risk_probability NUMERIC(4, 2) NOT NULL,
    is_early_warning BOOLEAN NOT NULL DEFAULT FALSE,
    shock_index NUMERIC(5, 3),
    delta_1h_map NUMERIC(5, 1),
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_time ON deterioration_alerts(patient_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON deterioration_alerts(acknowledged);
