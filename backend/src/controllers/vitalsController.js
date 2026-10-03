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
 * Retrieve vital sign observations history for a specific patient
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
        admission_id AS "admissionId",
        recorded_at AS "recordedAt",
        heart_rate AS "heartRate",
        bp_systolic AS "bpSystolic",
        bp_diastolic AS "bpDiastolic",
        bp_mean AS "bpMean",
        spo2,
        respiratory_rate AS "respiratoryRate",
        temperature,
        ventilator_mode AS "ventilatorMode",
        peep,
        fio2,
        tidal_volume AS "tidalVolume",
        peak_pressure AS "peakPressure",
        data_source AS "dataSource",
        is_stale AS "isStale",
        notes,
        staff_name AS "staffName",
        created_at AS "createdAt"
      FROM vital_observations
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [id, limit]);
    
    // Format for frontend charts & logs
    const formatted = result.rows.map(row => ({
      id: row.id,
      timestamp: row.recordedAt ? new Date(row.recordedAt).toLocaleString() : 'N/A',
      timeLabel: row.recordedAt ? new Date(row.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      recordedAt: row.recordedAt,
      hr: row.heartRate !== null ? Number(row.heartRate) : null,
      bpSys: row.bpSystolic !== null ? Number(row.bpSystolic) : null,
      bpDia: row.bpDiastolic !== null ? Number(row.bpDiastolic) : null,
      bpMean: row.bpMean !== null ? Number(row.bpMean) : null,
      spo2: row.spo2 !== null ? Number(row.spo2) : null,
      rr: row.respiratoryRate !== null ? Number(row.respiratoryRate) : null,
      temp: row.temperature !== null ? Number(row.temperature) : null,
      ventilatorParams: row.ventilatorMode ? {
        mode: row.ventilatorMode,
        peep: row.peep !== null ? Number(row.peep) : null,
        fio2: row.fio2 !== null ? Number(row.fio2) : null,
        tidalVolume: row.tidalVolume !== null ? Number(row.tidalVolume) : null,
        peakPressure: row.peakPressure !== null ? Number(row.peakPressure) : null
      } : null,
      source: row.dataSource || 'Neon PostgreSQL (Live DB)',
      notes: row.notes || '',
      staff: row.staffName || 'Clinical Staff',
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
 * POST /api/patients/:id/vitals
 * Record a manual vital observation
 */
async function recordVitalObservation(req, res, next) {
  if (!checkDbReady(res)) return;

  const { id } = req.params;
  const {
    admission_id,
    admissionId,
    heart_rate,
    hr,
    bp_systolic,
    bpSys,
    bp_diastolic,
    bpDia,
    bp_mean,
    bpMean,
    spo2,
    respiratory_rate,
    rr,
    temperature,
    temp,
    ventilator_mode,
    ventilatorMode,
    peep,
    fio2,
    tidal_volume,
    tidalVolume,
    peak_pressure,
    peakPressure,
    data_source,
    dataSource = 'Manual Entry (Bedside Charting)',
    notes,
    staff_name,
    staff,
    recorded_at,
    recordedAt,
    date,
    time
  } = req.body;

  // Extract and parse numeric values
  const parseNum = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) ? Number(val) : null;

  const heartRate = parseNum(heart_rate !== undefined ? heart_rate : hr);
  const bpSystolic = parseNum(bp_systolic !== undefined ? bp_systolic : bpSys);
  const bpDiastolic = parseNum(bp_diastolic !== undefined ? bp_diastolic : bpDia);
  let bpMeanVal = parseNum(bp_mean !== undefined ? bp_mean : bpMean);
  if (bpMeanVal === null && bpSystolic !== null && bpDiastolic !== null) {
    bpMeanVal = Math.round((bpSystolic + 2 * bpDiastolic) / 3);
  }

  const spo2Val = parseNum(spo2);
  const respRate = parseNum(respiratory_rate !== undefined ? respiratory_rate : rr);
  const tempVal = parseNum(temperature !== undefined ? temperature : temp);

  const ventMode = ventilator_mode || ventilatorMode || null;
  const peepVal = parseNum(peep);
  const fio2Val = parseNum(fio2);
  const tidalVolVal = parseNum(tidal_volume !== undefined ? tidal_volume : tidalVolume);
  const peakPresVal = parseNum(peak_pressure !== undefined ? peak_pressure : peakPressure);

  // Check that at least one measurement is provided
  if (heartRate === null && bpSystolic === null && spo2Val === null && respRate === null && tempVal === null && ventMode === null) {
    return res.status(400).json({
      error: true,
      message: 'At least one vital sign observation (HR, BP, SpO₂, RR, Temp, or Ventilator) must be provided.'
    });
  }

  // Validate check constraint bounds
  if (heartRate !== null && (heartRate < 0 || heartRate > 300)) {
    return res.status(400).json({ error: true, message: 'Heart rate must be between 0 and 300 bpm.' });
  }
  if (bpSystolic !== null && (bpSystolic < 0 || bpSystolic > 350)) {
    return res.status(400).json({ error: true, message: 'Systolic blood pressure must be between 0 and 350 mmHg.' });
  }
  if (bpDiastolic !== null && (bpDiastolic < 0 || bpDiastolic > 250)) {
    return res.status(400).json({ error: true, message: 'Diastolic blood pressure must be between 0 and 250 mmHg.' });
  }
  if (spo2Val !== null && (spo2Val < 0 || spo2Val > 100)) {
    return res.status(400).json({ error: true, message: 'SpO₂ must be between 0 and 100%.' });
  }
  if (respRate !== null && (respRate < 0 || respRate > 100)) {
    return res.status(400).json({ error: true, message: 'Respiratory rate must be between 0 and 100 breaths/min.' });
  }
  if (tempVal !== null && (tempVal < 25.0 || tempVal > 45.0)) {
    return res.status(400).json({ error: true, message: 'Temperature must be between 25.0°C and 45.0°C.' });
  }

  // Determine timestamp
  let recordTime = new Date();
  if (recorded_at || recordedAt) {
    recordTime = new Date(recorded_at || recordedAt);
  } else if (date && time) {
    recordTime = new Date(`${date}T${time}`);
  }

  const staffName = (staff_name || staff || 'Clinical Staff').trim();
  const sourceName = (data_source || dataSource || 'Manual Entry').trim();

  try {
    const insertQuery = `
      INSERT INTO vital_observations (
        patient_id,
        admission_id,
        recorded_at,
        heart_rate,
        bp_systolic,
        bp_diastolic,
        bp_mean,
        spo2,
        respiratory_rate,
        temperature,
        ventilator_mode,
        peep,
        fio2,
        tidal_volume,
        peak_pressure,
        data_source,
        notes,
        staff_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING 
        id,
        patient_id AS "patientId",
        admission_id AS "admissionId",
        recorded_at AS "recordedAt",
        heart_rate AS "heartRate",
        bp_systolic AS "bpSystolic",
        bp_diastolic AS "bpDiastolic",
        bp_mean AS "bpMean",
        spo2,
        respiratory_rate AS "respiratoryRate",
        temperature,
        ventilator_mode AS "ventilatorMode",
        peep,
        fio2,
        tidal_volume AS "tidalVolume",
        peak_pressure AS "peakPressure",
        data_source AS "dataSource",
        notes,
        staff_name AS "staffName",
        created_at AS "createdAt";
    `;

    const result = await pool.query(insertQuery, [
      id,
      admission_id || admissionId || null,
      recordTime,
      heartRate,
      bpSystolic,
      bpDiastolic,
      bpMeanVal,
      spo2Val,
      respRate,
      tempVal,
      ventMode,
      peepVal,
      fio2Val,
      tidalVolVal,
      peakPresVal,
      sourceName,
      notes || null,
      staffName
    ]);

    const created = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Vital observation recorded successfully.',
      data: {
        ...created,
        hr: created.heartRate !== null ? Number(created.heartRate) : null,
        bpSys: created.bpSystolic !== null ? Number(created.bpSystolic) : null,
        bpDia: created.bpDiastolic !== null ? Number(created.bpDiastolic) : null,
        bpMean: created.bpMean !== null ? Number(created.bpMean) : null,
        spo2: created.spo2 !== null ? Number(created.spo2) : null,
        rr: created.respiratoryRate !== null ? Number(created.respiratoryRate) : null,
        temp: created.temperature !== null ? Number(created.temperature) : null,
        isDemoData: false,
        source: created.dataSource
      }
    });
  } catch (err) {
    if (err.code === '23503') { // Foreign key constraint violation
      return res.status(404).json({
        error: true,
        message: `Patient '${id}' not found in the database.`
      });
    }
    next(err);
  }
}

module.exports = {
  getPatientVitals,
  recordVitalObservation
};
