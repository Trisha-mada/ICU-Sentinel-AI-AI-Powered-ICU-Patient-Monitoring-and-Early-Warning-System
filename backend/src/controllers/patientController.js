const { pool, isConfigured } = require('../config/database');

// Fixed list of exactly 12 ICU beds
const FIXED_ICU_BEDS = [
  'ICU-01', 'ICU-02', 'ICU-03', 'ICU-04',
  'ICU-05', 'ICU-06', 'ICU-07', 'ICU-08',
  'ICU-09', 'ICU-10', 'ICU-11', 'ICU-12'
];

/**
 * Check if DB is configured and available
 */
function checkDbReady(res) {
  if (!isConfigured) {
    res.status(503).json({
      error: true,
      message: 'Database connection is not configured in backend/.env. Please configure DATABASE_URL.'
    });
    return false;
  }
  return true;
}

/**
 * Helper to check if an ICU bed is currently occupied by an active (non-discharged) patient
 * Returns the conflicting occupant details or null if vacant
 */
async function checkBedOccupancy(clientOrPool, bedNumber, excludePatientId = null) {
  const query = `
    SELECT 
      a.id AS "admissionId",
      a.patient_id AS "patientId",
      a.bed_number AS "bedNumber",
      a.status,
      p.full_name AS "patientName"
    FROM icu_admissions a
    JOIN patients p ON p.id = a.patient_id
    WHERE LOWER(TRIM(a.bed_number)) = LOWER(TRIM($1))
      AND a.status != 'Discharged'
      ${excludePatientId ? 'AND a.patient_id != $2' : ''}
    ORDER BY a.created_at DESC
    LIMIT 1;
  `;
  const params = excludePatientId ? [bedNumber, excludePatientId] : [bedNumber];
  const result = await clientOrPool.query(query, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * GET /api/patients/next-id
 * Predicts the next sequential 3-digit patient ID (e.g. 001, 002, 003...)
 * Uses PostgreSQL sequence state combined with existing patient records
 */
async function getNextPatientId(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        LPAD(
          GREATEST(
            COALESCE((
              SELECT CASE 
                WHEN NOT is_called THEN last_value
                ELSE last_value + 1
              END
              FROM patient_id_seq
            ), 1),
            COALESCE((
              SELECT MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::bigint) + 1 
              FROM patients 
              WHERE id ~ '^\\d+$'
            ), 1)
          )::text, 
          3, 
          '0'
        ) AS "nextPatientId";
    `;

    const result = await pool.query(query);
    const nextPatientId = result.rows[0]?.nextPatientId || '001';

    res.status(200).json({
      success: true,
      nextPatientId
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/beds/status (and /api/beds/status)
 * Returns all 12 fixed ICU beds (ICU-01 through ICU-12) with occupancy and occupant details
 */
async function getBedStatuses(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        a.id AS "admissionId",
        a.patient_id AS "patientId",
        a.bed_number AS "bedNumber",
        a.status,
        a.diagnosis,
        a.admission_date AS "admissionDate",
        a.admission_time AS "admissionTime",
        a.ventilator_attached AS "ventilatorAttached",
        p.full_name AS "patientName",
        p.age,
        p.gender,
        p.mrn,
        v.heart_rate AS "latestHeartRate",
        v.bp_systolic AS "latestBpSystolic",
        v.bp_diastolic AS "latestBpDiastolic",
        v.spo2 AS "latestSpo2",
        v.respiratory_rate AS "latestRespiratoryRate",
        v.temperature AS "latestTemperature",
        v.recorded_at AS "lastObservationTime"
      FROM icu_admissions a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN LATERAL (
        SELECT heart_rate, bp_systolic, bp_diastolic, spo2, respiratory_rate, temperature, recorded_at
        FROM vital_observations
        WHERE patient_id = a.patient_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) v ON true
      WHERE a.status != 'Discharged'
      ORDER BY a.bed_number ASC;
    `;

    const result = await pool.query(query);
    const occupiedMap = new Map();
    for (const row of result.rows) {
      occupiedMap.set(row.bedNumber, row);
    }

    const beds = FIXED_ICU_BEDS.map(bedNumber => {
      const occupant = occupiedMap.get(bedNumber);
      if (occupant) {
        return {
          bedNumber,
          status: 'Occupied',
          isOccupied: true,
          admissionId: occupant.admissionId,
          patientId: occupant.patientId,
          patientName: occupant.patientName,
          age: occupant.age,
          gender: occupant.gender,
          mrn: occupant.mrn,
          diagnosis: occupant.diagnosis,
          admissionStatus: occupant.status,
          admissionDate: occupant.admissionDate ? new Date(occupant.admissionDate).toISOString().split('T')[0] : 'N/A',
          admissionTime: occupant.admissionTime ? new Date(occupant.admissionTime).toISOString() : null,
          ventilatorAttached: !!occupant.ventilatorAttached,
          lastObservationTime: occupant.lastObservationTime,
          latestVitals: {
            heartRate: occupant.latestHeartRate ? Number(occupant.latestHeartRate) : null,
            bloodPressure: occupant.latestBpSystolic ? `${occupant.latestBpSystolic}/${occupant.latestBpDiastolic}` : null,
            spo2: occupant.latestSpo2 ? Number(occupant.latestSpo2) : null,
            respiratoryRate: occupant.latestRespiratoryRate ? Number(occupant.latestRespiratoryRate) : null,
            temperature: occupant.latestTemperature ? Number(occupant.latestTemperature) : null
          }
        };
      }
      return {
        bedNumber,
        status: 'Available',
        isOccupied: false,
        admissionId: null,
        patientId: null,
        patientName: null,
        age: null,
        gender: null,
        mrn: null,
        diagnosis: null,
        admissionStatus: null,
        admissionDate: null,
        admissionTime: null,
        ventilatorAttached: false,
        lastObservationTime: null,
        latestVitals: null
      };
    });

    const occupiedCount = beds.filter(b => b.isOccupied).length;
    const availableCount = 12 - occupiedCount;

    res.status(200).json({
      success: true,
      totalBeds: 12,
      occupiedCount,
      availableCount,
      allBedsOccupied: occupiedCount >= 12,
      data: beds
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients
 * List active ICU patients with admission details and telemetry.
 * Set ?includeDischarged=true to include past patients.
 */
async function getAllPatients(req, res, next) {
  if (!checkDbReady(res)) return;

  const includeDischarged = req.query.includeDischarged === 'true';

  try {
    const query = `
      SELECT 
        p.id,
        p.mrn,
        p.full_name AS "name",
        p.age,
        p.gender,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        a.id AS "admissionId",
        a.bed_number AS "bedNumber",
        a.diagnosis,
        a.status,
        a.admission_date AS "admissionDate",
        a.admission_time AS "admissionTime",
        a.discharge_date AS "dischargeDate",
        a.discharge_notes AS "dischargeNotes",
        a.ventilator_attached AS "ventilatorAttached",
        v.recorded_at AS "lastObservationTime",
        v.heart_rate AS "latestHeartRate",
        v.bp_systolic AS "latestBpSystolic",
        v.bp_diastolic AS "latestBpDiastolic",
        v.spo2 AS "latestSpo2",
        v.respiratory_rate AS "latestRespiratoryRate",
        v.temperature AS "latestTemperature",
        v.data_source AS "latestVitalsSource"
      FROM patients p
      ${includeDischarged ? 'LEFT JOIN' : 'JOIN'} LATERAL (
        SELECT id, bed_number, diagnosis, status, admission_date, admission_time, discharge_date, discharge_notes, ventilator_attached
        FROM icu_admissions
        WHERE patient_id = p.id
          ${includeDischarged ? '' : "AND status != 'Discharged'"}
        ORDER BY created_at DESC
        LIMIT 1
      ) a ON true
      LEFT JOIN LATERAL (
        SELECT recorded_at, heart_rate, bp_systolic, bp_diastolic, spo2, respiratory_rate, temperature, data_source
        FROM vital_observations
        WHERE patient_id = p.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) v ON true
      ${includeDischarged ? '' : "WHERE a.id IS NOT NULL AND a.status != 'Discharged'"}
      ORDER BY 
        CASE 
          WHEN a.status = 'Critical' THEN 1
          WHEN a.status = 'Alert' THEN 2
          WHEN a.status = 'Stable' THEN 3
          ELSE 4
        END,
        COALESCE(a.bed_number, p.id) ASC;
    `;

    const result = await pool.query(query);
    
    const patients = result.rows.map(row => ({
      id: row.id,
      mrn: row.mrn,
      name: row.name,
      age: row.age,
      gender: row.gender,
      bedNumber: row.bedNumber || 'Unassigned',
      diagnosis: row.diagnosis || 'ICU Admission',
      status: row.status || 'Observation',
      admissionDate: row.admissionDate ? new Date(row.admissionDate).toISOString().split('T')[0] : 'N/A',
      admissionTime: row.admissionTime ? new Date(row.admissionTime).toISOString() : null,
      admissionId: row.admissionId,
      dischargeDate: row.dischargeDate ? new Date(row.dischargeDate).toISOString() : null,
      dischargeNotes: row.dischargeNotes || null,
      ventilatorAttached: !!row.ventilatorAttached,
      isDemoData: false,
      dataSource: 'Neon PostgreSQL (Live DB)',
      lastUpdated: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (row.admissionTime ? new Date(row.admissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Admitted'),
      lastUpdatedTimestamp: row.lastObservationTime || row.admissionTime || row.createdAt,
      vitals: {
        heartRate: {
          value: row.latestHeartRate ? Number(row.latestHeartRate) : null,
          unit: 'bpm',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: row.latestVitalsSource || 'Neon DB',
          status: row.latestHeartRate ? (row.latestHeartRate > 120 || row.latestHeartRate < 45 ? 'critical' : row.latestHeartRate > 100 || row.latestHeartRate < 55 ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestHeartRate ? (row.latestHeartRate > 100 ? 'Tachycardia' : row.latestHeartRate < 55 ? 'Bradycardia' : 'Normal Sinus') : 'No reading',
          isStale: false
        },
        bloodPressure: {
          systolic: row.latestBpSystolic ? Number(row.latestBpSystolic) : null,
          diastolic: row.latestBpDiastolic ? Number(row.latestBpDiastolic) : null,
          mean: (row.latestBpSystolic && row.latestBpDiastolic) ? Math.round((Number(row.latestBpSystolic) + 2 * Number(row.latestBpDiastolic)) / 3) : null,
          unit: 'mmHg',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: row.latestVitalsSource || 'Neon DB',
          status: row.latestBpSystolic ? (row.latestBpSystolic < 90 || row.latestBpSystolic > 180 ? 'critical' : (row.latestBpSystolic > 140 || row.latestBpDiastolic > 90) ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestBpSystolic ? `${row.latestBpSystolic}/${row.latestBpDiastolic}` : 'No reading',
          isStale: false
        },
        spo2: {
          value: row.latestSpo2 ? Number(row.latestSpo2) : null,
          unit: '%',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: row.latestVitalsSource || 'Neon DB',
          status: row.latestSpo2 ? (row.latestSpo2 < 90 ? 'critical' : (row.latestSpo2 < 95 ? 'warning' : 'normal')) : 'normal',
          statusLabel: row.latestSpo2 ? `${row.latestSpo2}%` : 'No reading',
          isStale: false
        },
        respiratoryRate: {
          value: row.latestRespiratoryRate ? Number(row.latestRespiratoryRate) : null,
          unit: 'breaths/min',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: row.latestVitalsSource || 'Neon DB',
          status: row.latestRespiratoryRate ? (row.latestRespiratoryRate > 30 || row.latestRespiratoryRate < 8 ? 'critical' : (row.latestRespiratoryRate > 22 || row.latestRespiratoryRate < 12) ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestRespiratoryRate ? `${row.latestRespiratoryRate} bpm` : 'No reading',
          isStale: false
        },
        temperature: {
          value: row.latestTemperature ? Number(row.latestTemperature) : null,
          unit: '°C',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: row.latestVitalsSource || 'Neon DB',
          status: row.latestTemperature ? (row.latestTemperature >= 38.8 || row.latestTemperature < 35.0 ? 'critical' : row.latestTemperature > 37.8 ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestTemperature ? `${row.latestTemperature}°C` : 'No reading',
          isStale: false
        }
      }
    }));

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/history
 * List all discharged ICU admissions and clinical records history
 */
async function getPatientHistory(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        a.id AS "admissionId",
        a.patient_id AS "patientId",
        a.bed_number AS "bedNumber",
        a.diagnosis,
        a.status,
        a.admission_date AS "admissionDate",
        a.admission_time AS "admissionTime",
        a.discharge_date AS "dischargeDate",
        a.discharge_notes AS "dischargeNotes",
        a.ventilator_attached AS "ventilatorAttached",
        a.created_at AS "createdAt",
        p.full_name AS "patientName",
        p.age,
        p.gender,
        p.mrn,
        (SELECT count(*) FROM vital_observations WHERE admission_id = a.id OR (admission_id IS NULL AND patient_id = a.patient_id)) AS "observationsCount",
        (SELECT count(*) FROM clinical_notes WHERE admission_id = a.id OR (admission_id IS NULL AND patient_id = a.patient_id)) AS "notesCount",
        (SELECT count(*) FROM medication_records WHERE admission_id = a.id OR (admission_id IS NULL AND patient_id = a.patient_id)) AS "medicationsCount",
        (SELECT count(*) FROM fluid_records WHERE admission_id = a.id OR (admission_id IS NULL AND patient_id = a.patient_id)) AS "fluidsCount",
        (SELECT count(*) FROM lab_results WHERE admission_id = a.id OR (admission_id IS NULL AND patient_id = a.patient_id)) AS "labsCount"
      FROM icu_admissions a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.status = 'Discharged'
      ORDER BY a.discharge_date DESC NULLS LAST, a.created_at DESC;
    `;

    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(r => ({
        ...r,
        admissionDate: r.admissionDate ? new Date(r.admissionDate).toISOString().split('T')[0] : 'N/A',
        admissionTimeFormatted: r.admissionTime ? new Date(r.admissionTime).toLocaleString() : 'N/A',
        dischargeDateFormatted: r.dischargeDate ? new Date(r.dischargeDate).toLocaleString() : 'N/A'
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/:id
 * Retrieve a specific patient record by ID
 */
async function getPatientById(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;

  try {
    const query = `
      SELECT 
        p.id,
        p.mrn,
        p.full_name AS "name",
        p.age,
        p.gender,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        a.id AS "admissionId",
        a.bed_number AS "bedNumber",
        a.diagnosis,
        a.status,
        a.admission_date AS "admissionDate",
        a.admission_time AS "admissionTime",
        a.discharge_date AS "dischargeDate",
        a.discharge_notes AS "dischargeNotes",
        a.ventilator_attached AS "ventilatorAttached"
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT id, bed_number, diagnosis, status, admission_date, admission_time, discharge_date, discharge_notes, ventilator_attached
        FROM icu_admissions
        WHERE patient_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) a ON true
      WHERE p.id = $1;
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: `Patient with ID '${id}' not found in database.`
      });
    }

    const patient = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        ...patient,
        admissionDate: patient.admissionDate ? new Date(patient.admissionDate).toISOString().split('T')[0] : 'N/A',
        admissionTime: patient.admissionTime ? new Date(patient.admissionTime).toISOString() : null,
        isDemoData: false,
        dataSource: 'Neon PostgreSQL (Live DB)'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients
 * Register a new patient and create an ICU admission with strict 12-bed validation,
 * concurrency-safe sequential Patient ID generation, and future-timestamp rejection.
 */
async function createPatient(req, res, next) {
  if (!checkDbReady(res)) return;

  const {
    id,
    patient_id,
    patientId,
    mrn,
    full_name,
    fullName,
    name,
    age,
    gender,
    bed_number,
    bedNumber,
    diagnosis,
    admission_date,
    admissionDate,
    admission_time,
    admissionTime,
    status = 'Stable',
    ventilator_attached,
    ventilatorAttached
  } = req.body;

  const inputId = (id || patient_id || patientId || '').toString().trim();
  const patientName = (full_name || fullName || name || '').toString().trim();
  const patientMrn = mrn ? mrn.toString().trim() : null;
  const patientBed = (bed_number || bedNumber || '').toString().trim();
  const patientDiag = (diagnosis || '').toString().trim();
  const isVentilated = ventilator_attached !== undefined ? !!ventilator_attached : !!ventilatorAttached;

  // 1. Basic Demographics Validation
  if (!patientName || patientName.length < 2) {
    return res.status(400).json({
      error: true,
      message: 'Patient full name is required (at least 2 characters).'
    });
  }

  const parsedAge = age !== undefined && age !== null && age !== '' ? parseInt(age, 10) : null;
  if (parsedAge === null || isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
    return res.status(400).json({
      error: true,
      message: 'Age must be a valid integer between 0 and 130.'
    });
  }

  // 2. Strict 12-Bed Identifier Validation
  if (!patientBed) {
    return res.status(400).json({
      error: true,
      message: 'ICU Bed Number is required for admission.'
    });
  }

  if (!FIXED_ICU_BEDS.includes(patientBed)) {
    return res.status(400).json({
      error: true,
      message: `Invalid ICU Bed '${patientBed}'. Bed number must be one of the 12 fixed beds: ${FIXED_ICU_BEDS.join(', ')}.`
    });
  }

  if (!patientDiag) {
    return res.status(400).json({
      error: true,
      message: 'Admitting diagnosis is required for ICU admission.'
    });
  }

  // 3. Admission Date & Time Validation
  const admDateInput = (admission_date || admissionDate || '').toString().trim();
  const admTimeInput = (admission_time || admissionTime || '').toString().trim();

  let parsedAdmissionTimestamp = null;
  let storedAdmissionDate = null;

  if (admDateInput && admTimeInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(admTimeInput)) {
      parsedAdmissionTimestamp = new Date(`${admDateInput}T${admTimeInput}`);
    } else {
      parsedAdmissionTimestamp = new Date(admTimeInput);
    }
    storedAdmissionDate = admDateInput;
  } else if (admDateInput) {
    // If only date is provided, default time to current local time or start of that date
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    parsedAdmissionTimestamp = new Date(`${admDateInput}T${currentTimeStr}`);
    storedAdmissionDate = admDateInput;
  } else {
    parsedAdmissionTimestamp = new Date();
    storedAdmissionDate = parsedAdmissionTimestamp.toISOString().split('T')[0];
  }

  if (isNaN(parsedAdmissionTimestamp.getTime())) {
    return res.status(400).json({
      error: true,
      message: 'Invalid admission date or time format.'
    });
  }

  // Reject future admission timestamps (allow 2 minutes buffer for client-server clock skew)
  const nowWithBuffer = new Date(Date.now() + 2 * 60 * 1000);
  if (parsedAdmissionTimestamp > nowWithBuffer) {
    return res.status(400).json({
      error: true,
      message: 'Admission date and time cannot be in the future.'
    });
  }

  const validStatuses = ['Stable', 'Alert', 'Critical', 'Observation', 'Discharged'];
  const admissionStatus = validStatuses.includes(status) ? status : 'Stable';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 4. Enforce 12-Bed Total Occupancy Limit
    const activeAdmissionsCountRes = await client.query(
      "SELECT count(*) FROM icu_admissions WHERE status != 'Discharged';"
    );
    const activeAdmissionsCount = parseInt(activeAdmissionsCountRes.rows[0].count, 10);

    if (activeAdmissionsCount >= 12) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: 'All 12 ICU beds are currently occupied.'
      });
    }

    // 5. Check Bed Occupancy conflict against other active patients
    const bedConflict = await checkBedOccupancy(client, patientBed, inputId || null);
    if (bedConflict) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: `ICU Bed '${patientBed}' is currently occupied by active patient ${bedConflict.patientId} (${bedConflict.patientName}). Please select an available bed.`
      });
    }

    // 6. Check if patient already exists and has an active admission
    let finalPatientId = inputId;
    let isNewRegistration = false;

    if (finalPatientId) {
      const patientActiveCheck = await client.query(
        "SELECT id, bed_number FROM icu_admissions WHERE patient_id = $1 AND status != 'Discharged';",
        [finalPatientId]
      );
      if (patientActiveCheck.rows.length > 0) {
        const currentActive = patientActiveCheck.rows[0];
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: true,
          message: `Patient '${finalPatientId}' already occupies active bed '${currentActive.bed_number}'. A patient can occupy only one active ICU bed at a time. Discharge or end the current stay first.`
        });
      }

      const existCheck = await client.query('SELECT id FROM patients WHERE id = $1', [finalPatientId]);
      if (existCheck.rows.length === 0) {
        isNewRegistration = true;
        const numVal = parseInt(finalPatientId, 10);
        if (!isNaN(numVal) && numVal > 0) {
          await client.query("SELECT setval('patient_id_seq', GREATEST(last_value, $1), true) FROM patient_id_seq;", [numVal]);
        }
      }
    } else {
      isNewRegistration = true;
    }

    // If new patient registration and beds full
    if (isNewRegistration && activeAdmissionsCount >= 12) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: 'All 12 ICU beds are currently occupied.'
      });
    }

    // 7. Check MRN Uniqueness across different patients
    if (patientMrn) {
      const mrnCheck = await client.query(
        'SELECT id, full_name FROM patients WHERE mrn = $1 AND id != $2',
        [patientMrn, finalPatientId || '']
      );
      if (mrnCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: true,
          message: `Medical Record Number '${patientMrn}' is already assigned to patient ${mrnCheck.rows[0].id} (${mrnCheck.rows[0].full_name}).`
        });
      }
    }

    // 8. Safely consume next patient ID from sequence if registering new without ID
    if (!finalPatientId) {
      const seqRes = await client.query("SELECT LPAD(nextval('patient_id_seq')::text, 3, '0') AS next_id;");
      finalPatientId = seqRes.rows[0].next_id;
    }

    // 9. Upsert Patient Record
    let patientData = null;
    if (!isNewRegistration) {
      // Update demographics of existing patient
      const updatePatientQuery = `
        UPDATE patients
        SET 
          full_name = COALESCE($2, full_name),
          age = COALESCE($3, age),
          gender = COALESCE($4, gender),
          mrn = COALESCE($5, mrn),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, mrn, full_name AS "name", age, gender, created_at AS "createdAt", updated_at AS "updatedAt";
      `;
      const updateRes = await client.query(updatePatientQuery, [
        finalPatientId,
        patientName,
        parsedAge,
        gender || 'Unspecified',
        patientMrn
      ]);
      patientData = updateRes.rows[0];
    } else {
      // Insert new patient record
      const insertPatientQuery = `
        INSERT INTO patients (id, mrn, full_name, age, gender)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, mrn, full_name AS "name", age, gender, created_at AS "createdAt";
      `;
      const insertRes = await client.query(insertPatientQuery, [
        finalPatientId,
        patientMrn || null,
        patientName,
        parsedAge,
        gender || 'Unspecified'
      ]);
      patientData = insertRes.rows[0];
    }

    // 10. Insert the new ICU Admission Record
    const insertAdmissionQuery = `
      INSERT INTO icu_admissions (
        patient_id, 
        bed_number, 
        diagnosis, 
        admission_date, 
        admission_time, 
        status, 
        ventilator_attached
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        bed_number AS "bedNumber", 
        diagnosis, 
        status, 
        ventilator_attached AS "ventilatorAttached", 
        admission_date AS "admissionDate",
        admission_time AS "admissionTime";
    `;
    const admissionRes = await client.query(insertAdmissionQuery, [
      finalPatientId,
      patientBed,
      patientDiag,
      storedAdmissionDate,
      parsedAdmissionTimestamp.toISOString(),
      admissionStatus,
      isVentilated
    ]);
    const admissionData = admissionRes.rows[0];

    await client.query('COMMIT');

    const createdPatient = {
      id: patientData.id,
      mrn: patientData.mrn,
      name: patientData.name,
      age: patientData.age,
      gender: patientData.gender,
      createdAt: patientData.createdAt,
      admissionId: admissionData.id,
      bedNumber: admissionData.bedNumber,
      diagnosis: admissionData.diagnosis,
      status: admissionData.status,
      ventilatorAttached: !!admissionData.ventilatorAttached,
      admissionDate: storedAdmissionDate,
      admissionTime: parsedAdmissionTimestamp.toISOString(),
      isDemoData: false,
      dataSource: 'Neon PostgreSQL (Live DB)',
      lastUpdated: 'Just registered',
      lastUpdatedTimestamp: parsedAdmissionTimestamp.toISOString(),
      vitals: {
        heartRate: { value: null, unit: 'bpm', timestamp: 'N/A', source: 'Neon DB', status: 'normal', statusLabel: 'No reading', isStale: false },
        bloodPressure: { systolic: null, diastolic: null, mean: null, unit: 'mmHg', timestamp: 'N/A', source: 'Neon DB', status: 'normal', statusLabel: 'No reading', isStale: false },
        spo2: { value: null, unit: '%', timestamp: 'N/A', source: 'Neon DB', status: 'normal', statusLabel: 'No reading', isStale: false },
        respiratoryRate: { value: null, unit: 'breaths/min', timestamp: 'N/A', source: 'Neon DB', status: 'normal', statusLabel: 'No reading', isStale: false },
        temperature: { value: null, unit: '°C', timestamp: 'N/A', source: 'Neon DB', status: 'normal', statusLabel: 'No reading', isStale: false }
      }
    };

    res.status(201).json({
      success: true,
      message: !isNewRegistration
        ? `Existing patient ${createdPatient.name} (ID: ${createdPatient.id}) admitted to ${createdPatient.bedNumber} successfully.`
        : `Patient ${createdPatient.name} (ID: ${createdPatient.id}) registered and admitted to ${createdPatient.bedNumber} successfully.`,
      data: createdPatient
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: true,
        message: 'A duplicate patient ID, MRN, or active bed conflict occurred in the database.'
      });
    }
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/patients/:id/discharge (and /api/admissions/:id/discharge)
 * Non-destructive discharge of an active ICU patient:
 * Sets admission status = 'Discharged', records discharge timestamp & notes,
 * frees the assigned ICU bed, and preserves all clinical observations, notes, meds, fluids, and labs.
 */
async function dischargePatient(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;
  const {
    discharge_date,
    dischargeDate,
    discharge_time,
    dischargeTime,
    discharge_notes,
    dischargeNotes,
    disposition
  } = req.body;

  const dDateInput = (discharge_date || dischargeDate || '').toString().trim();
  const dTimeInput = (discharge_time || dischargeTime || '').toString().trim();

  let parsedDischargeTimestamp = null;

  if (dDateInput && dTimeInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(dTimeInput)) {
      parsedDischargeTimestamp = new Date(`${dDateInput}T${dTimeInput}`);
    } else {
      parsedDischargeTimestamp = new Date(dTimeInput);
    }
  } else if (dDateInput) {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    parsedDischargeTimestamp = new Date(`${dDateInput}T${currentTimeStr}`);
  } else {
    parsedDischargeTimestamp = new Date();
  }

  if (isNaN(parsedDischargeTimestamp.getTime())) {
    return res.status(400).json({
      error: true,
      message: 'Invalid discharge date or time format.'
    });
  }

  // Reject future discharge timestamp
  const nowWithBuffer = new Date(Date.now() + 2 * 60 * 1000);
  if (parsedDischargeTimestamp > nowWithBuffer) {
    return res.status(400).json({
      error: true,
      message: 'Discharge date and time cannot be in the future.'
    });
  }

  const notesText = [
    (discharge_notes || dischargeNotes || '').trim(),
    disposition ? `Disposition: ${disposition.trim()}` : null
  ].filter(Boolean).join(' | ') || 'Discharged from ICU.';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Locate active admission for this patient (or matching admission ID)
    const findAdmQuery = `
      SELECT 
        a.id, 
        a.patient_id AS "patientId", 
        a.bed_number AS "bedNumber", 
        a.admission_date AS "admissionDate", 
        a.admission_time AS "admissionTime",
        p.full_name AS "patientName"
      FROM icu_admissions a
      JOIN patients p ON p.id = a.patient_id
      WHERE (a.patient_id = $1 OR a.id::text = $1)
        AND a.status != 'Discharged'
      ORDER BY a.created_at DESC
      LIMIT 1;
    `;
    const admRes = await client.query(findAdmQuery, [id]);

    if (admRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: true,
        message: `No active ICU admission found for patient/admission '${id}'. The patient may already be discharged.`
      });
    }

    const activeAdm = admRes.rows[0];

    // 2. Validate discharge timestamp is not earlier than admission timestamp
    const admissionTime = new Date(activeAdm.admissionTime || activeAdm.admissionDate);
    if (parsedDischargeTimestamp < admissionTime) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: true,
        message: 'Discharge time cannot be earlier than admission time.'
      });
    }

    // 3. Update status to 'Discharged', save timestamp and notes (releases unique index on bed)
    const updateAdmissionQuery = `
      UPDATE icu_admissions
      SET 
        status = 'Discharged',
        discharge_date = $2,
        discharge_notes = $3
      WHERE id = $1
      RETURNING 
        id AS "admissionId", 
        patient_id AS "patientId", 
        bed_number AS "bedNumber", 
        status, 
        admission_date AS "admissionDate", 
        admission_time AS "admissionTime", 
        discharge_date AS "dischargeDate", 
        discharge_notes AS "dischargeNotes";
    `;
    const updateRes = await client.query(updateAdmissionQuery, [
      activeAdm.id,
      parsedDischargeTimestamp.toISOString(),
      notesText
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Patient ${activeAdm.patientName} (${activeAdm.patientId}) successfully discharged from ${activeAdm.bedNumber}. Bed is now available.`,
      data: updateRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/patients/:id/admissions
 * Retrieve all admission records (active and past) for a patient
 */
async function getPatientAdmissions(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        bed_number AS "bedNumber",
        diagnosis,
        admission_date AS "admissionDate",
        admission_time AS "admissionTime",
        discharge_date AS "dischargeDate",
        discharge_notes AS "dischargeNotes",
        status,
        ventilator_attached AS "ventilatorAttached",
        created_at AS "createdAt"
      FROM icu_admissions
      WHERE patient_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [id]);
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(r => ({
        ...r,
        admissionDate: r.admissionDate ? new Date(r.admissionDate).toISOString().split('T')[0] : 'N/A',
        admissionTime: r.admissionTime ? new Date(r.admissionTime).toISOString() : null,
        dischargeDate: r.dischargeDate ? new Date(r.dischargeDate).toISOString() : null
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients/:id/admissions
 * Create a new admission record for an existing patient with validation
 */
async function createPatientAdmission(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;
  const {
    bed_number,
    bedNumber,
    diagnosis,
    admission_date,
    admissionDate,
    admission_time,
    admissionTime,
    status = 'Stable',
    ventilator_attached,
    ventilatorAttached
  } = req.body;

  const bed = (bed_number || bedNumber || '').toString().trim();
  const diag = (diagnosis || '').toString().trim();

  if (!bed) {
    return res.status(400).json({
      error: true,
      message: 'Bed number is required for ICU admission.'
    });
  }

  if (!FIXED_ICU_BEDS.includes(bed)) {
    return res.status(400).json({
      error: true,
      message: `Invalid ICU Bed '${bed}'. Bed number must be one of: ${FIXED_ICU_BEDS.join(', ')}.`
    });
  }

  if (!diag) {
    return res.status(400).json({
      error: true,
      message: 'Admitting diagnosis is required for ICU admission.'
    });
  }

  const admDateInput = (admission_date || admissionDate || '').toString().trim();
  const admTimeInput = (admission_time || admissionTime || '').toString().trim();

  let parsedAdmissionTimestamp = null;
  let storedAdmissionDate = null;

  if (admDateInput && admTimeInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(admTimeInput)) {
      parsedAdmissionTimestamp = new Date(`${admDateInput}T${admTimeInput}`);
    } else {
      parsedAdmissionTimestamp = new Date(admTimeInput);
    }
    storedAdmissionDate = admDateInput;
  } else if (admDateInput) {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    parsedAdmissionTimestamp = new Date(`${admDateInput}T${currentTimeStr}`);
    storedAdmissionDate = admDateInput;
  } else {
    parsedAdmissionTimestamp = new Date();
    storedAdmissionDate = parsedAdmissionTimestamp.toISOString().split('T')[0];
  }

  if (isNaN(parsedAdmissionTimestamp.getTime())) {
    return res.status(400).json({
      error: true,
      message: 'Invalid admission date or time format.'
    });
  }

  const nowWithBuffer = new Date(Date.now() + 2 * 60 * 1000);
  if (parsedAdmissionTimestamp > nowWithBuffer) {
    return res.status(400).json({
      error: true,
      message: 'Admission date and time cannot be in the future.'
    });
  }

  const isVentilated = ventilator_attached !== undefined ? !!ventilator_attached : !!ventilatorAttached;
  const validStatuses = ['Stable', 'Alert', 'Critical', 'Observation', 'Discharged'];
  const admissionStatus = validStatuses.includes(status) ? status : 'Stable';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check patient existence
    const patientRes = await client.query('SELECT id, full_name FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: true,
        message: `Patient '${id}' not found in database.`
      });
    }

    // 2. Check 12 beds active limit
    const countRes = await client.query("SELECT count(*) FROM icu_admissions WHERE status != 'Discharged';");
    if (parseInt(countRes.rows[0].count, 10) >= 12) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: 'All 12 ICU beds are currently occupied.'
      });
    }

    // 3. Check if patient already has an active admission
    const patientActiveRes = await client.query(
      "SELECT id, bed_number FROM icu_admissions WHERE patient_id = $1 AND status != 'Discharged';",
      [id]
    );
    if (patientActiveRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: `Patient '${id}' already has an active ICU admission in bed '${patientActiveRes.rows[0].bed_number}'.`
      });
    }

    // 4. Validate bed occupancy against other active patients
    const bedConflict = await checkBedOccupancy(client, bed, id);
    if (bedConflict) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: `ICU Bed '${bed}' is currently occupied by active patient ${bedConflict.patientId} (${bedConflict.patientName}). Please select an available bed.`
      });
    }

    const query = `
      INSERT INTO icu_admissions (
        patient_id, 
        bed_number, 
        diagnosis, 
        admission_date, 
        admission_time, 
        status, 
        ventilator_attached
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        patient_id AS "patientId",
        bed_number AS "bedNumber",
        diagnosis,
        admission_date AS "admissionDate",
        admission_time AS "admissionTime",
        status,
        ventilator_attached AS "ventilatorAttached",
        created_at AS "createdAt";
    `;

    const result = await client.query(query, [
      id,
      bed,
      diag,
      storedAdmissionDate,
      parsedAdmissionTimestamp.toISOString(),
      admissionStatus,
      isVentilated
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Admission record created successfully for bed ${bed}.`,
      data: {
        ...result.rows[0],
        admissionDate: storedAdmissionDate,
        admissionTime: parsedAdmissionTimestamp.toISOString()
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({
        error: true,
        message: `ICU Bed '${bed}' is already occupied.`
      });
    }
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  FIXED_ICU_BEDS,
  getNextPatientId,
  getBedStatuses,
  getAllPatients,
  getPatientHistory,
  getPatientById,
  createPatient,
  getPatientAdmissions,
  createPatientAdmission,
  dischargePatient
};
