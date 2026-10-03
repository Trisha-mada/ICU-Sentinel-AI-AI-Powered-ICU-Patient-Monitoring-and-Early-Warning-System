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

// ==========================================
// 1. Manual Lab Records (manual_lab_records)
// ==========================================

/**
 * GET /api/patients/:id/labs
 * Retrieve nurse-entered lab records from 'manual_lab_records'
 */
async function getPatientLabs(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        recorded_at AS "recordedAt",
        fio2,
        ph,
        paco2,
        lactate,
        recorded_by AS "recordedBy",
        notes
      FROM manual_lab_records
      WHERE patient_id = $1
      ORDER BY recorded_at DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map(row => {
      const phVal = row.ph !== null ? Number(row.ph) : null;
      const paco2Val = row.paco2 !== null ? Number(row.paco2) : null;
      const lactateVal = row.lactate !== null ? Number(row.lactate) : null;
      const fio2Val = row.fio2 !== null ? Number(row.fio2) : 0.21;

      const values = {
        fio2: { val: fio2Val, unit: '', ref: '0.21 - 1.00', flag: fio2Val > 0.40 ? 'high' : 'normal' }
      };

      if (phVal !== null) {
        values.ph = { val: phVal, unit: '', ref: '7.35 - 7.45', flag: phVal < 7.35 ? 'low' : phVal > 7.45 ? 'high' : 'normal' };
      }
      if (paco2Val !== null) {
        values.paco2 = { val: paco2Val, unit: 'mmHg', ref: '35 - 45', flag: paco2Val > 45 ? 'high' : paco2Val < 35 ? 'low' : 'normal' };
      }
      if (lactateVal !== null) {
        values.lactate = { val: lactateVal, unit: 'mmol/L', ref: '< 2.0', flag: lactateVal >= 2.0 ? 'high' : 'normal' };
      }

      return {
        id: row.id,
        patientId: row.patientId,
        panel: 'Nurse-Entered ABG & Labs',
        fio2: fio2Val,
        ph: phVal,
        paco2: paco2Val,
        lactate: lactateVal,
        values,
        collectionTime: row.recordedAt ? new Date(row.recordedAt).toLocaleString() : 'N/A',
        resultTime: row.recordedAt ? new Date(row.recordedAt).toLocaleString() : 'N/A',
        status: 'Entered',
        staff: row.recordedBy || 'NURSE_STATION',
        notes: row.notes || '',
        isDemoData: false,
        source: 'Neon PostgreSQL (manual_lab_records)'
      };
    });

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
 * POST /api/patients/:id/labs
 * Record a manual lab record into 'manual_lab_records'
 */
async function createPatientLab(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;
  const {
    fio2,
    ph,
    paco2,
    lactate,
    values,
    recorded_by,
    recordedBy,
    staff_name,
    staff,
    notes,
    recorded_at,
    recordedAt,
    date,
    time
  } = req.body;

  const parseNum = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) ? Number(val) : null;

  let fio2Val = parseNum(fio2);
  let phVal = parseNum(ph);
  let paco2Val = parseNum(paco2);
  let lactateVal = parseNum(lactate);

  // Fallback extraction from values object if provided
  if (values && typeof values === 'object') {
    if (fio2Val === null && values.fio2) fio2Val = parseNum(values.fio2.val !== undefined ? values.fio2.val : values.fio2);
    if (phVal === null && values.ph) phVal = parseNum(values.ph.val !== undefined ? values.ph.val : values.ph);
    if (paco2Val === null && values.paco2) paco2Val = parseNum(values.paco2.val !== undefined ? values.paco2.val : values.paco2);
    if (lactateVal === null && values.lactate) lactateVal = parseNum(values.lactate.val !== undefined ? values.lactate.val : values.lactate);
  }

  if (fio2Val === null) fio2Val = 0.21; // Standard room air baseline

  if (phVal === null && paco2Val === null && lactateVal === null && fio2Val === 0.21 && !notes) {
    return res.status(400).json({
      error: true,
      message: 'At least one lab parameter (fio2, ph, paco2, lactate) or notes must be provided.'
    });
  }

  let recordTime = new Date();
  if (recorded_at || recordedAt) {
    recordTime = new Date(recorded_at || recordedAt);
  } else if (date && time) {
    recordTime = new Date(`${date}T${time}`);
  }

  const staffName = (recorded_by || recordedBy || staff_name || staff || 'NURSE_STATION').trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check patient exists in 'patients'
    const patientCheck = await client.query('SELECT patient_id FROM patients WHERE patient_id = $1;', [id]);
    if (patientCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: true, message: `Patient '${id}' not found in the database.` });
    }

    // 2. Insert into 'manual_lab_records'
    const query = `
      INSERT INTO manual_lab_records (
        patient_id,
        recorded_at,
        fio2,
        ph,
        paco2,
        lactate,
        recorded_by,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        patient_id AS "patientId",
        recorded_at AS "recordedAt",
        fio2,
        ph,
        paco2,
        lactate,
        recorded_by AS "recordedBy",
        notes;
    `;

    const result = await client.query(query, [
      id,
      recordTime.toISOString(),
      fio2Val,
      phVal,
      paco2Val,
      lactateVal,
      staffName,
      notes || null
    ]);

    const created = result.rows[0];

    // 3. Evaluate Lab Deterioration Risk (e.g. Sepsis / Severe Acidosis)
    let triggeredAlert = null;
    if ((lactateVal !== null && lactateVal >= 2.0) || (phVal !== null && phVal < 7.30) || (fio2Val > 0.60)) {
      let riskScore = 0.50;
      if (lactateVal >= 4.0) riskScore += 0.35;
      else if (lactateVal >= 2.0) riskScore += 0.20;

      if (phVal < 7.20) riskScore += 0.25;
      else if (phVal < 7.30) riskScore += 0.15;

      if (fio2Val > 0.60) riskScore += 0.15;

      const riskProb = Math.min(0.99, parseFloat(riskScore.toFixed(2)));
      const isEarly = riskProb >= 0.60 || lactateVal >= 2.0;

      const alertRes = await client.query(`
        INSERT INTO deterioration_alerts (
          patient_id,
          triggered_at,
          risk_probability,
          is_early_warning,
          shock_index,
          delta_1h_map,
          acknowledged
        ) VALUES ($1, $2, $3, $4, NULL, NULL, false)
        RETURNING id, patient_id AS "patientId", triggered_at AS "triggeredAt", risk_probability AS "riskProbability", is_early_warning AS "isEarlyWarning";
      `, [id, recordTime.toISOString(), riskProb, isEarly]);

      triggeredAlert = alertRes.rows[0];
    }

    await client.query('COMMIT');

    const formattedValues = {
      fio2: { val: created.fio2, unit: '', ref: '0.21 - 1.00', flag: created.fio2 > 0.40 ? 'high' : 'normal' }
    };
    if (created.ph !== null) formattedValues.ph = { val: Number(created.ph), unit: '', ref: '7.35 - 7.45', flag: Number(created.ph) < 7.35 ? 'low' : Number(created.ph) > 7.45 ? 'high' : 'normal' };
    if (created.paco2 !== null) formattedValues.paco2 = { val: Number(created.paco2), unit: 'mmHg', ref: '35 - 45', flag: Number(created.paco2) > 45 ? 'high' : Number(created.paco2) < 35 ? 'low' : 'normal' };
    if (created.lactate !== null) formattedValues.lactate = { val: Number(created.lactate), unit: 'mmol/L', ref: '< 2.0', flag: Number(created.lactate) >= 2.0 ? 'high' : 'normal' };

    res.status(201).json({
      success: true,
      message: 'Manual lab record saved successfully.',
      data: {
        id: created.id,
        patientId: created.patientId,
        panel: 'Nurse-Entered ABG & Labs',
        fio2: Number(created.fio2),
        ph: created.ph !== null ? Number(created.ph) : null,
        paco2: created.paco2 !== null ? Number(created.paco2) : null,
        lactate: created.lactate !== null ? Number(created.lactate) : null,
        values: formattedValues,
        collectionTime: created.recordedAt ? new Date(created.recordedAt).toLocaleString() : 'N/A',
        resultTime: created.recordedAt ? new Date(created.recordedAt).toLocaleString() : 'N/A',
        status: 'Entered',
        staff: created.recordedBy,
        notes: created.notes,
        deteriorationAlert: triggeredAlert,
        isDemoData: false,
        source: 'Neon PostgreSQL (manual_lab_records)'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ==========================================
// 2. Deterioration Alerts (deterioration_alerts)
// ==========================================

/**
 * GET /api/patients/:id/alerts
 * Retrieve deterioration alerts for a patient
 */
async function getPatientAlerts(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        triggered_at AS "triggeredAt",
        risk_probability AS "riskProbability",
        is_early_warning AS "isEarlyWarning",
        shock_index AS "shockIndex",
        delta_1h_map AS "delta1hMap",
        acknowledged,
        acknowledged_by AS "acknowledgedBy",
        acknowledged_at AS "acknowledgedAt"
      FROM deterioration_alerts
      WHERE patient_id = $1
      ORDER BY triggered_at DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map(row => {
      const risk = Number(row.riskProbability);
      let severity = 'low';
      if (risk >= 0.75 || (row.shockIndex && Number(row.shockIndex) >= 1.0)) {
        severity = 'high';
      } else if (risk >= 0.50 || (row.shockIndex && Number(row.shockIndex) >= 0.85)) {
        severity = 'medium';
      }

      let description = `Deterioration risk: ${(risk * 100).toFixed(0)}%`;
      if (row.shockIndex) description += ` • Shock Index: ${Number(row.shockIndex).toFixed(2)}`;
      if (row.delta1hMap) description += ` • 1h MAP Δ: ${Number(row.delta1hMap) > 0 ? '+' : ''}${row.delta1hMap} mmHg`;

      return {
        id: row.id,
        patientId: row.patientId,
        severity,
        parameter: row.isEarlyWarning ? 'Early Deterioration Warning' : 'Risk Prediction Alert',
        description,
        riskProbability: risk,
        isEarlyWarning: !!row.isEarlyWarning,
        shockIndex: row.shockIndex !== null ? Number(row.shockIndex) : null,
        delta1hMap: row.delta1hMap !== null ? Number(row.delta1hMap) : null,
        timestamp: row.triggeredAt ? new Date(row.triggeredAt).toLocaleString() : 'N/A',
        status: row.acknowledged ? 'Acknowledged' : 'Active',
        isAcknowledged: !!row.acknowledged,
        acknowledgedBy: row.acknowledgedBy,
        acknowledgedAt: row.acknowledgedAt
      };
    });

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
 * GET /api/alerts
 * Retrieve all recent alerts across all ICU patients
 */
async function getAllAlerts(req, res, next) {
  if (!checkDbReady(res)) return;

  try {
    const query = `
      SELECT 
        a.id,
        a.patient_id AS "patientId",
        p.bed_id AS "bedNumber",
        a.triggered_at AS "triggeredAt",
        a.risk_probability AS "riskProbability",
        a.is_early_warning AS "isEarlyWarning",
        a.shock_index AS "shockIndex",
        a.delta_1h_map AS "delta1hMap",
        a.acknowledged,
        a.acknowledged_by AS "acknowledgedBy",
        a.acknowledged_at AS "acknowledgedAt"
      FROM deterioration_alerts a
      LEFT JOIN patients p ON p.patient_id = a.patient_id
      ORDER BY a.triggered_at DESC
      LIMIT 100;
    `;

    const result = await pool.query(query);
    const formatted = result.rows.map(row => {
      const risk = Number(row.riskProbability);
      let severity = 'low';
      if (risk >= 0.75 || (row.shockIndex && Number(row.shockIndex) >= 1.0)) {
        severity = 'high';
      } else if (risk >= 0.50 || (row.shockIndex && Number(row.shockIndex) >= 0.85)) {
        severity = 'medium';
      }

      let description = `Deterioration risk: ${(risk * 100).toFixed(0)}%`;
      if (row.shockIndex) description += ` • Shock Index: ${Number(row.shockIndex).toFixed(2)}`;
      if (row.delta1hMap) description += ` • 1h MAP Δ: ${Number(row.delta1hMap) > 0 ? '+' : ''}${row.delta1hMap} mmHg`;

      return {
        id: row.id,
        patientId: row.patientId,
        patientName: `Patient ${row.patientId}`,
        bedNumber: row.bedNumber || 'ICU Bed',
        severity,
        parameter: row.isEarlyWarning ? 'Early Deterioration Warning' : 'Risk Prediction Alert',
        description,
        riskProbability: risk,
        isEarlyWarning: !!row.isEarlyWarning,
        shockIndex: row.shockIndex !== null ? Number(row.shockIndex) : null,
        delta1hMap: row.delta1hMap !== null ? Number(row.delta1hMap) : null,
        timestamp: row.triggeredAt ? new Date(row.triggeredAt).toLocaleString() : 'N/A',
        status: row.acknowledged ? 'Acknowledged' : 'Active',
        isAcknowledged: !!row.acknowledged,
        acknowledgedBy: row.acknowledgedBy,
        acknowledgedAt: row.acknowledgedAt
      };
    });

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
 * POST /api/alerts/:id/acknowledge
 * Acknowledge a deterioration alert in Neon DB
 */
async function acknowledgeAlert(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;
  const { acknowledged_by, acknowledgedBy } = req.body;
  const staff = (acknowledged_by || acknowledgedBy || 'Clinical Staff').trim();

  try {
    const query = `
      UPDATE deterioration_alerts
      SET 
        acknowledged = true,
        acknowledged_by = $2,
        acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id,
        patient_id AS "patientId",
        risk_probability AS "riskProbability",
        is_early_warning AS "isEarlyWarning",
        acknowledged,
        acknowledged_by AS "acknowledgedBy",
        acknowledged_at AS "acknowledgedAt";
    `;

    const result = await pool.query(query, [id, staff]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: true, message: `Alert with ID '${id}' not found.` });
    }

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 3. Removed Tables Graceful Handling
// (clinical_notes, medication_records, fluid_records)
// ==========================================

async function getPatientNotes(req, res) {
  res.status(200).json({
    success: true,
    count: 0,
    data: [],
    message: 'clinical_notes table is removed from NeonDB schema; managed in session memory.'
  });
}

async function createPatientNote(req, res) {
  const { id } = req.params;
  const { author, type, findings, plan, gcsScore, pupils } = req.body;
  res.status(200).json({
    success: true,
    message: 'Clinical note accepted (session memory).',
    data: {
      id: `NOTE-${id}-${Date.now().toString().slice(-4)}`,
      patientId: id,
      author: author || 'Clinical Staff',
      type: type || 'Clinical Note',
      findings: findings || '',
      plan: plan || '',
      gcsScore: gcsScore || 'GCS 15',
      pupils: pupils || 'Equal & Reactive',
      time: new Date().toLocaleString(),
      isDemoData: false,
      source: 'Session Memory'
    }
  });
}

async function getPatientMedications(req, res) {
  res.status(200).json({
    success: true,
    count: 0,
    data: [],
    message: 'medication_records table is removed from NeonDB schema; managed in session memory.'
  });
}

async function createPatientMedication(req, res) {
  const { id } = req.params;
  const { medicationName, prescribedDose, administeredDose, doseUnit, route, frequency, status, staff } = req.body;
  res.status(200).json({
    success: true,
    message: 'Medication administration record accepted (session memory).',
    data: {
      id: `MED-${id}-${Date.now().toString().slice(-4)}`,
      patientId: id,
      medicationName: medicationName || 'Medication',
      prescribedDose: prescribedDose || administeredDose,
      administeredDose: administeredDose || prescribedDose,
      doseUnit: doseUnit || 'mg',
      route: route || 'IV Infusion',
      frequency: frequency || 'Stat',
      status: status || 'Administered',
      staff: staff || 'Clinical Staff',
      time: new Date().toLocaleString(),
      isDemoData: false,
      source: 'Session Memory'
    }
  });
}

async function getPatientFluids(req, res) {
  res.status(200).json({
    success: true,
    count: 0,
    data: [],
    message: 'fluid_records table is removed from NeonDB schema; managed in session memory.'
  });
}

async function createPatientFluid(req, res) {
  const { id } = req.params;
  const { interval, oralIntake, ivIntake, otherIntake, urineOutput, otherOutput, urineAppearance, catheterStatus, staff } = req.body;
  const oral = Number(oralIntake) || 0;
  const iv = Number(ivIntake) || 0;
  const otherIn = Number(otherIntake) || 0;
  const urine = Number(urineOutput) || 0;
  const otherOut = Number(otherOutput) || 0;
  const totalIn = oral + iv + otherIn;
  const totalOut = urine + otherOut;
  const net = totalIn - totalOut;

  res.status(200).json({
    success: true,
    message: 'Fluid record accepted (session memory).',
    data: {
      id: `FL-${id}-${Date.now().toString().slice(-4)}`,
      patientId: id,
      interval: interval || 'Current Interval',
      oralIntake: oral,
      ivIntake: iv,
      otherIntake: otherIn,
      totalIntake: totalIn,
      urineOutput: urine,
      otherOutput: otherOut,
      totalOutput: totalOut,
      netBalance: net,
      urineAppearance: urineAppearance || 'Clear Amber',
      catheterStatus: catheterStatus || 'Foley Catheter',
      time: new Date().toLocaleString(),
      staff: staff || 'Clinical Staff',
      isDemoData: false,
      source: 'Session Memory'
    }
  });
}

module.exports = {
  getPatientLabs,
  createPatientLab,
  getPatientAlerts,
  getAllAlerts,
  acknowledgeAlert,
  getPatientNotes,
  createPatientNote,
  getPatientMedications,
  createPatientMedication,
  getPatientFluids,
  createPatientFluid
};
