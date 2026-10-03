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
 * Returns occupant details or null if vacant
 */
async function checkBedOccupancy(clientOrPool, bedId, excludePatientId = null) {
  const query = `
    SELECT 
      patient_id AS "patientId",
      bed_id AS "bedNumber",
      status,
      admission_time AS "admissionTime"
    FROM patients
    WHERE LOWER(TRIM(bed_id)) = LOWER(TRIM($1))
      AND (discharge_time IS NULL AND status != 'DISCHARGED')
      ${excludePatientId ? 'AND patient_id != $2' : ''}
    ORDER BY admission_time DESC
    LIMIT 1;
  `;
  const params = excludePatientId ? [bedId, excludePatientId] : [bedId];
  const result = await clientOrPool.query(query, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * GET /api/patients/next-id
 * Returns the next sequential 3-digit patient ID (e.g. 001, 002, 003...)
 */
async function getNextPatientId(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        LPAD(
          COALESCE(
            MAX(NULLIF(regexp_replace(patient_id, '\\D', '', 'g'), '')::bigint) + 1,
            1
          )::text, 
          3, 
          '0'
        ) AS "nextPatientId"
      FROM patients;
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
 * Returns all 12 fixed ICU beds (ICU-01 through ICU-12) with occupancy and latest telemetry
 */
async function getBedStatuses(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        p.patient_id AS "patientId",
        p.bed_id AS "bedNumber",
        p.status,
        p.admission_time AS "admissionTime",
        p.discharge_time AS "dischargeTime",
        t.heart_rate AS "latestHeartRate",
        t.sbp AS "latestBpSystolic",
        t.dbp AS "latestBpDiastolic",
        t.map AS "latestBpMean",
        t.spo2 AS "latestSpo2",
        t.resp AS "latestRespiratoryRate",
        t.recorded_at AS "lastObservationTime",
        a.risk_probability AS "latestRiskProbability",
        a.is_early_warning AS "isEarlyWarning",
        a.shock_index AS "shockIndex",
        a.delta_1h_map AS "delta1hMap"
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT heart_rate, sbp, dbp, map, spo2, resp, recorded_at
        FROM telemetry_snapshots
        WHERE patient_id = p.patient_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) t ON true
      LEFT JOIN LATERAL (
        SELECT risk_probability, is_early_warning, shock_index, delta_1h_map, triggered_at
        FROM deterioration_alerts
        WHERE patient_id = p.patient_id
        ORDER BY triggered_at DESC
        LIMIT 1
      ) a ON true
      WHERE p.discharge_time IS NULL AND p.status != 'DISCHARGED'
      ORDER BY p.bed_id ASC;
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
          status: occupant.status || 'Occupied',
          isOccupied: true,
          patientId: occupant.patientId,
          patientName: `Patient ${occupant.patientId}`,
          admissionDate: occupant.admissionTime ? new Date(occupant.admissionTime).toISOString().split('T')[0] : 'N/A',
          admissionTime: occupant.admissionTime ? new Date(occupant.admissionTime).toISOString() : null,
          lastObservationTime: occupant.lastObservationTime,
          riskProbability: occupant.latestRiskProbability !== null ? Number(occupant.latestRiskProbability) : null,
          isEarlyWarning: !!occupant.isEarlyWarning,
          shockIndex: occupant.shockIndex !== null ? Number(occupant.shockIndex) : null,
          delta1hMap: occupant.delta1hMap !== null ? Number(occupant.delta1hMap) : null,
          latestVitals: {
            heartRate: occupant.latestHeartRate !== null ? Number(occupant.latestHeartRate) : null,
            bloodPressure: occupant.latestBpSystolic !== null ? `${occupant.latestBpSystolic}/${occupant.latestBpDiastolic}` : null,
            systolic: occupant.latestBpSystolic !== null ? Number(occupant.latestBpSystolic) : null,
            diastolic: occupant.latestBpDiastolic !== null ? Number(occupant.latestBpDiastolic) : null,
            mean: occupant.latestBpMean !== null ? Number(occupant.latestBpMean) : null,
            spo2: occupant.latestSpo2 !== null ? Number(occupant.latestSpo2) : null,
            respiratoryRate: occupant.latestRespiratoryRate !== null ? Number(occupant.latestRespiratoryRate) : null
          }
        };
      }
      return {
        bedNumber,
        status: 'Available',
        isOccupied: false,
        patientId: null,
        patientName: null,
        admissionDate: null,
        admissionTime: null,
        lastObservationTime: null,
        riskProbability: null,
        isEarlyWarning: false,
        shockIndex: null,
        delta1hMap: null,
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
 * List active ICU patients with bed assignment and telemetry snapshots.
 * Set ?includeDischarged=true to include discharged patients.
 */
async function getAllPatients(req, res, next) {
  if (!checkDbReady(res)) return;

  const includeDischarged = req.query.includeDischarged === 'true';

  try {
    const query = `
      SELECT 
        p.patient_id,
        p.patient_id AS "id",
        p.patient_id AS "patientId",
        p.bed_id AS "bedNumber",
        p.bed_id AS "bed_id",
        p.status,
        p.admission_time AS "admissionTime",
        p.discharge_time AS "dischargeTime",
        t.recorded_at AS "lastObservationTime",
        t.heart_rate AS "latestHeartRate",
        t.sbp AS "latestBpSystolic",
        t.dbp AS "latestBpDiastolic",
        t.map AS "latestBpMean",
        t.spo2 AS "latestSpo2",
        t.resp AS "latestRespiratoryRate",
        a.risk_probability AS "latestRiskProbability",
        a.is_early_warning AS "isEarlyWarning",
        a.shock_index AS "shockIndex",
        a.delta_1h_map AS "delta1hMap"
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT recorded_at, heart_rate, sbp, dbp, map, spo2, resp
        FROM telemetry_snapshots
        WHERE patient_id = p.patient_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) t ON true
      LEFT JOIN LATERAL (
        SELECT risk_probability, is_early_warning, shock_index, delta_1h_map, triggered_at
        FROM deterioration_alerts
        WHERE patient_id = p.patient_id
        ORDER BY triggered_at DESC
        LIMIT 1
      ) a ON true
      ${includeDischarged ? '' : "WHERE p.discharge_time IS NULL AND p.status != 'DISCHARGED'"}
      ORDER BY 
        CASE 
          WHEN p.status = 'Critical' THEN 1
          WHEN p.status = 'Alert' THEN 2
          WHEN p.status = 'ACTIVE' THEN 3
          WHEN p.status = 'Stable' THEN 4
          ELSE 5
        END,
        p.bed_id ASC;
    `;

    const result = await pool.query(query);
    
    const patients = result.rows.map(row => ({
      id: row.patient_id,
      patient_id: row.patient_id,
      patientId: row.patient_id,
      name: `Patient ${row.patient_id}`,
      bedNumber: row.bedNumber || 'Unassigned',
      bed_id: row.bed_id || row.bedNumber,
      status: row.status || 'ACTIVE',
      admissionDate: row.admissionTime ? new Date(row.admissionTime).toISOString().split('T')[0] : 'N/A',
      admissionTime: row.admissionTime ? new Date(row.admissionTime).toISOString() : null,
      dischargeTime: row.dischargeTime ? new Date(row.dischargeTime).toISOString() : null,
      isDemoData: false,
      dataSource: 'Neon PostgreSQL (Live DB)',
      lastUpdated: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (row.admissionTime ? new Date(row.admissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Admitted'),
      lastUpdatedTimestamp: row.lastObservationTime || row.admissionTime,
      riskAssessment: {
        probability: row.latestRiskProbability !== null ? Number(row.latestRiskProbability) : null,
        isEarlyWarning: !!row.isEarlyWarning,
        shockIndex: row.shockIndex !== null ? Number(row.shockIndex) : null,
        delta1hMap: row.delta1hMap !== null ? Number(row.delta1hMap) : null
      },
      vitals: {
        heartRate: {
          value: row.latestHeartRate !== null ? Number(row.latestHeartRate) : null,
          unit: 'bpm',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: 'telemetry_snapshots',
          status: row.latestHeartRate ? (row.latestHeartRate > 120 || row.latestHeartRate < 45 ? 'critical' : row.latestHeartRate > 100 || row.latestHeartRate < 55 ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestHeartRate ? (row.latestHeartRate > 100 ? 'Tachycardia' : row.latestHeartRate < 55 ? 'Bradycardia' : 'Normal Sinus') : 'No reading',
          isStale: false
        },
        bloodPressure: {
          systolic: row.latestBpSystolic !== null ? Number(row.latestBpSystolic) : null,
          diastolic: row.latestBpDiastolic !== null ? Number(row.latestBpDiastolic) : null,
          mean: row.latestBpMean !== null ? Number(row.latestBpMean) : ((row.latestBpSystolic && row.latestBpDiastolic) ? Math.round((Number(row.latestBpSystolic) + 2 * Number(row.latestBpDiastolic)) / 3) : null),
          unit: 'mmHg',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: 'telemetry_snapshots',
          status: row.latestBpSystolic ? (row.latestBpSystolic < 90 || row.latestBpSystolic > 180 ? 'critical' : (row.latestBpSystolic > 140 || row.latestBpDiastolic > 90) ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestBpSystolic ? `${row.latestBpSystolic}/${row.latestBpDiastolic}` : 'No reading',
          isStale: false
        },
        spo2: {
          value: row.latestSpo2 !== null ? Number(row.latestSpo2) : null,
          unit: '%',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: 'telemetry_snapshots',
          status: row.latestSpo2 ? (row.latestSpo2 < 90 ? 'critical' : (row.latestSpo2 < 95 ? 'warning' : 'normal')) : 'normal',
          statusLabel: row.latestSpo2 ? `${row.latestSpo2}%` : 'No reading',
          isStale: false
        },
        respiratoryRate: {
          value: row.latestRespiratoryRate !== null ? Number(row.latestRespiratoryRate) : null,
          unit: 'breaths/min',
          timestamp: row.lastObservationTime ? new Date(row.lastObservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          source: 'telemetry_snapshots',
          status: row.latestRespiratoryRate ? (row.latestRespiratoryRate > 30 || row.latestRespiratoryRate < 8 ? 'critical' : (row.latestRespiratoryRate > 22 || row.latestRespiratoryRate < 12) ? 'warning' : 'normal') : 'normal',
          statusLabel: row.latestRespiratoryRate ? `${row.latestRespiratoryRate} bpm` : 'No reading',
          isStale: false
        },
        temperature: {
          value: null,
          unit: '°C',
          timestamp: 'N/A',
          source: 'telemetry_snapshots',
          status: 'normal',
          statusLabel: 'No reading',
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
 * List discharged ICU patients
 */
async function getPatientHistory(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        p.patient_id AS "patientId",
        p.patient_id AS "id",
        p.bed_id AS "bedNumber",
        p.status,
        p.admission_time AS "admissionTime",
        p.discharge_time AS "dischargeDate",
        (SELECT count(*) FROM telemetry_snapshots WHERE patient_id = p.patient_id) AS "observationsCount",
        (SELECT count(*) FROM manual_lab_records WHERE patient_id = p.patient_id) AS "labsCount",
        (SELECT count(*) FROM deterioration_alerts WHERE patient_id = p.patient_id) AS "alertsCount"
      FROM patients p
      WHERE p.discharge_time IS NOT NULL OR p.status = 'DISCHARGED'
      ORDER BY p.discharge_time DESC NULLS LAST;
    `;

    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(r => ({
        ...r,
        patientName: `Patient ${r.patientId}`,
        admissionDate: r.admissionTime ? new Date(r.admissionTime).toISOString().split('T')[0] : 'N/A',
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
 * Retrieve a specific patient record by patient_id
 */
async function getPatientById(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;

  try {
    const query = `
      SELECT 
        p.patient_id,
        p.patient_id AS "id",
        p.patient_id AS "patientId",
        p.bed_id AS "bedNumber",
        p.bed_id AS "bed_id",
        p.status,
        p.admission_time AS "admissionTime",
        p.discharge_time AS "dischargeTime",
        t.heart_rate AS "latestHeartRate",
        t.sbp AS "latestBpSystolic",
        t.dbp AS "latestBpDiastolic",
        t.map AS "latestBpMean",
        t.spo2 AS "latestSpo2",
        t.resp AS "latestRespiratoryRate",
        t.recorded_at AS "lastObservationTime"
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT recorded_at, heart_rate, sbp, dbp, map, spo2, resp
        FROM telemetry_snapshots
        WHERE patient_id = p.patient_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) t ON true
      WHERE p.patient_id = $1;
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
        name: `Patient ${patient.patient_id}`,
        admissionDate: patient.admissionTime ? new Date(patient.admissionTime).toISOString().split('T')[0] : 'N/A',
        admissionTime: patient.admissionTime ? new Date(patient.admissionTime).toISOString() : null,
        dischargeTime: patient.dischargeTime ? new Date(patient.dischargeTime).toISOString() : null,
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
 * Register a new patient / admit to an ICU bed in the 'patients' table.
 */
async function createPatient(req, res, next) {
  if (!checkDbReady(res)) return;

  const {
    id,
    patient_id,
    patientId,
    bed_id,
    bed_number,
    bedNumber,
    admission_time,
    admissionTime,
    admission_date,
    admissionDate,
    status = 'ACTIVE'
  } = req.body;

  let inputPatientId = (patient_id || patientId || id || '').toString().trim();
  const patientBed = (bed_id || bed_number || bedNumber || '').toString().trim();

  // 1. Validate ICU Bed
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

  // 2. Validate Admission Date / Time
  const admDateInput = (admission_date || admissionDate || '').toString().trim();
  const admTimeInput = (admission_time || admissionTime || '').toString().trim();

  let parsedAdmissionTimestamp = null;
  if (admDateInput && admTimeInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(admTimeInput)) {
      parsedAdmissionTimestamp = new Date(`${admDateInput}T${admTimeInput}`);
    } else {
      parsedAdmissionTimestamp = new Date(admTimeInput);
    }
  } else if (admTimeInput) {
    parsedAdmissionTimestamp = new Date(admTimeInput);
  } else if (admDateInput) {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    parsedAdmissionTimestamp = new Date(`${admDateInput}T${currentTimeStr}`);
  } else {
    parsedAdmissionTimestamp = new Date();
  }

  if (isNaN(parsedAdmissionTimestamp.getTime())) {
    return res.status(400).json({
      error: true,
      message: 'Invalid admission date or time format.'
    });
  }

  // Reject future admission timestamps (allow 2 minutes buffer)
  const nowWithBuffer = new Date(Date.now() + 2 * 60 * 1000);
  if (parsedAdmissionTimestamp > nowWithBuffer) {
    return res.status(400).json({
      error: true,
      message: 'Admission date and time cannot be in the future.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Acquire transaction-level advisory lock to serialize patient admission and prevent duplicate IDs / race conditions
    await client.query("SELECT pg_advisory_xact_lock(hashtext('patient_id_sequence_lock'));");

    // 3. Enforce 12-Bed Total Occupancy Limit
    const activePatientsCountRes = await client.query(
      "SELECT count(*) FROM patients WHERE discharge_time IS NULL AND status != 'DISCHARGED';"
    );
    const activePatientsCount = parseInt(activePatientsCountRes.rows[0].count, 10);

    if (activePatientsCount >= 12) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: 'All 12 ICU beds are currently occupied.'
      });
    }

    // 4. Check Bed Occupancy conflict against other active patients
    const bedConflict = await checkBedOccupancy(client, patientBed, inputPatientId || null);
    if (bedConflict) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: true,
        message: `ICU Bed '${patientBed}' is currently occupied by active patient ${bedConflict.patientId}. Please select an available bed.`
      });
    }

    // 5. Check or generate sequential patient_id
    if (!inputPatientId) {
      const seqRes = await client.query(`
        SELECT LPAD(
          COALESCE(
            MAX(NULLIF(regexp_replace(patient_id, '\\D', '', 'g'), '')::bigint) + 1,
            1
          )::text,
          3,
          '0'
        ) AS next_id
        FROM patients;
      `);
      inputPatientId = seqRes.rows[0].next_id;
    } else {
      // Verify whether inputPatientId already exists in the patients table
      const existingCheck = await client.query(
        "SELECT patient_id, bed_id, status, discharge_time FROM patients WHERE patient_id = $1;",
        [inputPatientId]
      );
      if (existingCheck.rows.length > 0) {
        const existing = existingCheck.rows[0];
        await client.query('ROLLBACK');
        if (!existing.discharge_time && existing.status !== 'DISCHARGED') {
          return res.status(409).json({
            error: true,
            message: `Patient '${inputPatientId}' already occupies active bed '${existing.bed_id}'. A patient can occupy only one active ICU bed at a time.`
          });
        } else {
          return res.status(409).json({
            error: true,
            message: `Patient ID '${inputPatientId}' already exists in database records (Discharged). Please use the next sequential ID or auto-generate.`
          });
        }
      }
    }

    // 6. Insert patient into 'patients' table (4-table schema)
    const insertQuery = `
      INSERT INTO patients (
        patient_id,
        bed_id,
        admission_time,
        discharge_time,
        status
      ) VALUES ($1, $2, $3, NULL, $4)
      RETURNING 
        patient_id AS "id",
        patient_id AS "patient_id",
        patient_id AS "patientId",
        bed_id AS "bedNumber",
        bed_id AS "bed_id",
        admission_time AS "admissionTime",
        discharge_time AS "dischargeTime",
        status;
    `;

    const admissionStatus = (status && ['ACTIVE', 'DISCHARGED', 'TRANSFERRED'].includes(String(status).toUpperCase()))
      ? String(status).toUpperCase()
      : 'ACTIVE';

    const insertRes = await client.query(insertQuery, [
      inputPatientId,
      patientBed,
      parsedAdmissionTimestamp.toISOString(),
      admissionStatus
    ]);

    await client.query('COMMIT');

    const created = insertRes.rows[0];
    res.status(201).json({
      success: true,
      message: `Patient ${created.patient_id} admitted to ${created.bedNumber} successfully.`,
      data: {
        ...created,
        name: `Patient ${created.patient_id}`,
        admissionDate: parsedAdmissionTimestamp.toISOString().split('T')[0],
        admissionTime: parsedAdmissionTimestamp.toISOString(),
        isDemoData: false,
        dataSource: 'Neon PostgreSQL (Live DB)'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/patients/:id/discharge (and /api/admissions/:id/discharge)
 * Discharge an active ICU patient by updating 'discharge_time' and 'status' in 'patients' table.
 */
async function dischargePatient(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;
  const {
    discharge_time,
    dischargeTime,
    discharge_date,
    dischargeDate
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
  } else if (dTimeInput) {
    parsedDischargeTimestamp = new Date(dTimeInput);
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find active patient record
    const findRes = await client.query(
      `SELECT patient_id, bed_id, admission_time 
       FROM patients 
       WHERE patient_id = $1 AND (discharge_time IS NULL AND status != 'DISCHARGED')
       LIMIT 1;`,
      [id]
    );

    if (findRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: true,
        message: `No active ICU patient found with ID '${id}'. The patient may already be discharged.`
      });
    }

    const activePatient = findRes.rows[0];

    // Validate discharge timestamp is not earlier than admission timestamp
    if (parsedDischargeTimestamp < new Date(activePatient.admission_time)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: true,
        message: 'Discharge time cannot be earlier than admission time.'
      });
    }

    // Update patient record
    const updateRes = await client.query(
      `UPDATE patients 
       SET 
         discharge_time = $1,
         status = 'DISCHARGED'
       WHERE patient_id = $2
       RETURNING 
         patient_id AS "id",
         patient_id AS "patient_id",
         patient_id AS "patientId",
         bed_id AS "bedNumber",
         status,
         admission_time AS "admissionTime",
         discharge_time AS "dischargeTime";`,
      [parsedDischargeTimestamp.toISOString(), activePatient.patient_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Patient ${activePatient.patient_id} successfully discharged from ${activePatient.bed_id}. Bed is now available.`,
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
 * Compatibility endpoint returning patient's admission info
 */
async function getPatientAdmissions(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        patient_id AS "patientId",
        patient_id AS "id",
        bed_id AS "bedNumber",
        admission_time AS "admissionTime",
        discharge_time AS "dischargeTime",
        status
      FROM patients
      WHERE patient_id = $1;
    `;

    const result = await pool.query(query, [id]);
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(r => ({
        ...r,
        admissionDate: r.admissionTime ? new Date(r.admissionTime).toISOString().split('T')[0] : 'N/A'
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients/:id/admissions
 * Compatibility endpoint mapping to patient admission
 */
async function createPatientAdmission(req, res, next) {
  req.body.patient_id = req.params.id;
  return createPatient(req, res, next);
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
