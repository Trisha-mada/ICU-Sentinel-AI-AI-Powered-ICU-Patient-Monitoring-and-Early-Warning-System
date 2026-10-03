const { pool, isConfigured } = require('../config/database');

function checkDbReady(res) {
  if (!isConfigured) {
    res.status(503).json({
      error: true,
      message: 'Database connection is not configured in backend/.env.'
    });
    return false;
  }
  return true;
}

/**
 * GET /api/patients/:id/vitals
 * Retrieve telemetry snapshots history for a specific patient from 'telemetry_snapshots'
 */
async function getPatientVitals(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        recorded_at AS "recordedAt",
        heart_rate AS "heartRate",
        sbp AS "bpSystolic",
        dbp AS "bpDiastolic",
        map AS "bpMean",
        spo2,
        resp AS "respiratoryRate"
      FROM telemetry_snapshots
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [id, limit]);
    
    // Format for frontend charts & telemetry logs
    const formatted = result.rows.map(row => ({
      id: row.id,
      patientId: row.patientId,
      timestamp: row.recordedAt ? new Date(row.recordedAt).toLocaleString() : 'N/A',
      timeLabel: row.recordedAt ? new Date(row.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      recordedAt: row.recordedAt,
      hr: row.heartRate !== null ? Number(row.heartRate) : null,
      bpSys: row.bpSystolic !== null ? Number(row.bpSystolic) : null,
      bpDia: row.bpDiastolic !== null ? Number(row.bpDiastolic) : null,
      bpMean: row.bpMean !== null ? Number(row.bpMean) : null,
      spo2: row.spo2 !== null ? Number(row.spo2) : null,
      rr: row.respiratoryRate !== null ? Number(row.respiratoryRate) : null,
      source: 'Neon PostgreSQL (telemetry_snapshots)',
      notes: '',
      staff: 'Telemetry Monitor',
      isDemoData: false
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to compute clinical deterioration risk probability and early warning flag
 */
function evaluateDeteriorationRisk({ hr, sbp, dbp, map, spo2, resp, shockIndex, deltaMap }) {
  let risk = 0.05; // Normal baseline

  if (map !== null && map < 65) risk += 0.35;
  else if (sbp !== null && sbp < 90) risk += 0.30;
  else if (sbp !== null && sbp > 180) risk += 0.15;

  if (hr !== null && (hr > 120 || hr < 45)) risk += 0.25;
  else if (hr !== null && (hr > 100 || hr < 55)) risk += 0.10;

  if (spo2 !== null && spo2 < 90) risk += 0.30;
  else if (spo2 !== null && spo2 < 94) risk += 0.12;

  if (resp !== null && (resp > 30 || resp < 8)) risk += 0.25;
  else if (resp !== null && (resp > 22 || resp < 10)) risk += 0.10;

  if (shockIndex !== null && shockIndex >= 0.9) risk += 0.20;
  else if (shockIndex !== null && shockIndex >= 0.8) risk += 0.10;

  if (deltaMap !== null && deltaMap <= -15) risk += 0.15;

  const riskProbability = Math.min(0.99, Math.max(0.01, parseFloat(risk.toFixed(2))));
  const isEarlyWarning = riskProbability >= 0.60 || 
    (shockIndex !== null && shockIndex >= 0.9) || 
    (spo2 !== null && spo2 < 90) || 
    (map !== null && map < 65);

  return { riskProbability, isEarlyWarning };
}

/**
 * POST /api/patients/:id/vitals
 * Record a telemetry snapshot in 'telemetry_snapshots' and evaluate 'deterioration_alerts'
 */
async function recordVitalObservation(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;
  const {
    heart_rate,
    heartRate: camelHeartRate,
    hr,
    sbp,
    bp_systolic,
    bpSys,
    bpSystolic: camelBpSystolic,
    dbp,
    bp_diastolic,
    bpDia,
    bpDiastolic: camelBpDiastolic,
    map,
    bp_mean,
    bpMean,
    spo2,
    resp,
    respiratory_rate,
    respiratoryRate: camelRespiratoryRate,
    rr,
    recorded_at,
    recordedAt,
    date,
    time
  } = req.body;

  // Helper parser for numeric fields
  const parseNum = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) ? Number(val) : null;

  const heartRate = parseNum(heart_rate !== undefined ? heart_rate : (camelHeartRate !== undefined ? camelHeartRate : hr));
  const bpSystolic = parseNum(sbp !== undefined ? sbp : (bp_systolic !== undefined ? bp_systolic : (camelBpSystolic !== undefined ? camelBpSystolic : bpSys)));
  const bpDiastolic = parseNum(dbp !== undefined ? dbp : (bp_diastolic !== undefined ? bp_diastolic : (camelBpDiastolic !== undefined ? camelBpDiastolic : bpDia)));
  
  let mapVal = parseNum(map !== undefined ? map : (bp_mean !== undefined ? bp_mean : bpMean));
  if (mapVal === null && bpSystolic !== null && bpDiastolic !== null) {
    mapVal = Math.round((bpSystolic + 2 * bpDiastolic) / 3);
  }

  const spo2Val = parseNum(spo2);
  const respVal = parseNum(resp !== undefined ? resp : (respiratory_rate !== undefined ? respiratory_rate : rr));

  // Verify that at least one measurement is provided
  if (heartRate === null && bpSystolic === null && spo2Val === null && respVal === null && mapVal === null) {
    return res.status(400).json({
      error: true,
      message: 'At least one telemetry measurement (heart_rate, sbp, dbp, map, spo2, or resp) must be provided.'
    });
  }

  // Determine timestamp
  let recordTime = new Date();
  if (recorded_at || recordedAt) {
    recordTime = new Date(recorded_at || recordedAt);
  } else if (date && time) {
    recordTime = new Date(`${date}T${time}`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify patient exists in 'patients' table
    const patientCheck = await client.query(
      'SELECT patient_id, bed_id, status FROM patients WHERE patient_id = $1;',
      [id]
    );
    if (patientCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: true,
        message: `Patient '${id}' not found in database.`
      });
    }

    // 2. Insert into 'telemetry_snapshots'
    const insertQuery = `
      INSERT INTO telemetry_snapshots (
        patient_id,
        recorded_at,
        heart_rate,
        spo2,
        sbp,
        map,
        dbp,
        resp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        patient_id AS "patientId",
        recorded_at AS "recordedAt",
        heart_rate AS "heartRate",
        spo2,
        sbp AS "bpSystolic",
        map AS "bpMean",
        dbp AS "bpDiastolic",
        resp AS "respiratoryRate";
    `;

    const result = await client.query(insertQuery, [
      id,
      recordTime.toISOString(),
      heartRate,
      spo2Val,
      bpSystolic,
      mapVal,
      bpDiastolic,
      respVal
    ]);

    const createdSnapshot = result.rows[0];

    // 3. Compute Shock Index (HR / SBP)
    let shockIndex = null;
    if (heartRate !== null && bpSystolic !== null && bpSystolic > 0) {
      shockIndex = parseFloat((heartRate / bpSystolic).toFixed(3));
    }

    // 4. Compute Delta 1h MAP
    let delta1hMap = null;
    if (mapVal !== null) {
      const prevMapRes = await client.query(`
        SELECT map, recorded_at 
        FROM telemetry_snapshots 
        WHERE patient_id = $1 
          AND recorded_at < $2 
          AND map IS NOT NULL 
        ORDER BY recorded_at DESC 
        LIMIT 1;
      `, [id, recordTime.toISOString()]);

      if (prevMapRes.rows.length > 0 && prevMapRes.rows[0].map !== null) {
        delta1hMap = parseFloat((mapVal - Number(prevMapRes.rows[0].map)).toFixed(1));
      }
    }

    // 5. Evaluate Deterioration Risk & Insert Alert if Triggered
    const { riskProbability, isEarlyWarning } = evaluateDeteriorationRisk({
      hr: heartRate,
      sbp: bpSystolic,
      dbp: bpDiastolic,
      map: mapVal,
      spo2: spo2Val,
      resp: respVal,
      shockIndex,
      deltaMap: delta1hMap
    });

    let alertRecord = null;
    if (isEarlyWarning || riskProbability >= 0.50) {
      const alertInsertQuery = `
        INSERT INTO deterioration_alerts (
          patient_id,
          triggered_at,
          risk_probability,
          is_early_warning,
          shock_index,
          delta_1h_map,
          acknowledged
        ) VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING 
          id,
          patient_id AS "patientId",
          triggered_at AS "triggeredAt",
          risk_probability AS "riskProbability",
          is_early_warning AS "isEarlyWarning",
          shock_index AS "shockIndex",
          delta_1h_map AS "delta1hMap",
          acknowledged;
      `;

      const alertRes = await client.query(alertInsertQuery, [
        id,
        recordTime.toISOString(),
        riskProbability,
        isEarlyWarning,
        shockIndex,
        delta1hMap
      ]);
      alertRecord = alertRes.rows[0];

      // Update patient status if critical or alert
      const newStatus = riskProbability >= 0.75 ? 'Critical' : (riskProbability >= 0.50 ? 'Alert' : 'ACTIVE');
      await client.query(
        "UPDATE patients SET status = $1 WHERE patient_id = $2 AND status != 'DISCHARGED';",
        [newStatus, id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Telemetry snapshot recorded successfully.',
      data: {
        id: createdSnapshot.id,
        patientId: createdSnapshot.patientId,
        recordedAt: createdSnapshot.recordedAt,
        hr: createdSnapshot.heartRate !== null ? Number(createdSnapshot.heartRate) : null,
        bpSys: createdSnapshot.bpSystolic !== null ? Number(createdSnapshot.bpSystolic) : null,
        bpDia: createdSnapshot.bpDiastolic !== null ? Number(createdSnapshot.bpDiastolic) : null,
        bpMean: createdSnapshot.bpMean !== null ? Number(createdSnapshot.bpMean) : null,
        spo2: createdSnapshot.spo2 !== null ? Number(createdSnapshot.spo2) : null,
        rr: createdSnapshot.respiratoryRate !== null ? Number(createdSnapshot.respiratoryRate) : null,
        shockIndex,
        delta1hMap,
        deteriorationAlert: alertRecord,
        source: 'Neon PostgreSQL (telemetry_snapshots)',
        isDemoData: false
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getPatientVitals,
  recordVitalObservation
};
