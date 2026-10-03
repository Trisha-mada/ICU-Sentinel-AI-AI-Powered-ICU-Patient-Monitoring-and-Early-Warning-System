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
// 1. Clinical Notes
// ==========================================

async function getPatientNotes(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        admission_id AS "admissionId",
        note_type AS "type",
        author_name AS "author",
        findings,
        plan,
        gcs_score AS "gcsScore",
        pupils,
        recorded_at AS "recordedAt",
        created_at AS "createdAt"
      FROM clinical_notes
      WHERE patient_id = $1
      ORDER BY recorded_at DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map(row => ({
      id: row.id,
      time: row.recordedAt ? new Date(row.recordedAt).toLocaleString() : 'N/A',
      author: row.author,
      type: row.type,
      findings: row.findings,
      plan: row.plan || '',
      gcsScore: row.gcsScore || 'GCS 15',
      pupils: row.pupils || 'Equal & Reactive',
      isDemoData: false,
      source: 'Neon PostgreSQL (Live DB)'
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

async function createPatientNote(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;
  const {
    admission_id,
    admissionId,
    note_type,
    type,
    author_name,
    author,
    findings,
    plan,
    gcs_score,
    gcsScore,
    pupils,
    recorded_at,
    recordedAt,
    date,
    time
  } = req.body;

  const noteType = (note_type || type || "Doctor's Assessment & Plan").trim();
  const authorName = (author_name || author || 'Clinical Staff').trim();
  const findingsText = (findings || '').trim();
  const planText = (plan || '').trim();

  if (!findingsText && !planText) {
    return res.status(400).json({
      error: true,
      message: 'Clinical examination findings or care plan are required.'
    });
  }

  let recordTime = new Date();
  if (recorded_at || recordedAt) {
    recordTime = new Date(recorded_at || recordedAt);
  } else if (date && time) {
    recordTime = new Date(`${date}T${time}`);
  }

  try {
    const query = `
      INSERT INTO clinical_notes (
        patient_id,
        admission_id,
        note_type,
        author_name,
        findings,
        plan,
        gcs_score,
        pupils,
        recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        patient_id AS "patientId",
        admission_id AS "admissionId",
        note_type AS "type",
        author_name AS "author",
        findings,
        plan,
        gcs_score AS "gcsScore",
        pupils,
        recorded_at AS "recordedAt",
        created_at AS "createdAt";
    `;

    const result = await pool.query(query, [
      id,
      admission_id || admissionId || null,
      noteType,
      authorName,
      findingsText || 'No specific examination findings recorded.',
      planText || 'Continue standard ICU management.',
      gcs_score || gcsScore || 'GCS 15',
      pupils || 'Equal & Reactive',
      recordTime
    ]);

    const created = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Clinical note saved successfully.',
      data: {
        id: created.id,
        time: created.recordedAt ? new Date(created.recordedAt).toLocaleString() : 'N/A',
        author: created.author,
        type: created.type,
        findings: created.findings,
        plan: created.plan,
        gcsScore: created.gcsScore,
        pupils: created.pupils,
        isDemoData: false,
        source: 'Neon PostgreSQL (Live DB)'
      }
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: true, message: `Patient '${id}' not found in the database.` });
    }
    next(err);
  }
}

// ==========================================
// 2. Medication Administration Records (MAR)
// ==========================================

async function getPatientMedications(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        admission_id AS "admissionId",
        medication_name AS "medicationName",
        prescribed_dose AS "prescribedDose",
        administered_dose AS "administeredDose",
        dose_unit AS "doseUnit",
        route,
        frequency,
        status,
        admin_time AS "adminTime",
        staff_name AS "staff",
        notes,
        created_at AS "createdAt"
      FROM medication_records
      WHERE patient_id = $1
      ORDER BY admin_time DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map(row => ({
      id: row.id,
      medicationName: row.medicationName,
      prescribedDose: row.prescribedDose,
      administeredDose: row.administeredDose,
      doseUnit: row.doseUnit,
      route: row.route,
      frequency: row.frequency,
      status: row.status,
      time: row.adminTime ? new Date(row.adminTime).toLocaleString() : 'N/A',
      staff: row.staff,
      notes: row.notes || '',
      isDemoData: false,
      source: 'Neon PostgreSQL (Live DB)'
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

async function createPatientMedication(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;
  const {
    admission_id,
    admissionId,
    medication_name,
    medicationName,
    prescribed_dose,
    prescribedDose,
    administered_dose,
    administeredDose,
    dose_unit,
    doseUnit = 'mg',
    route = 'IV Infusion',
    frequency = 'Stat',
    status = 'Administered',
    admin_time,
    adminTime,
    staff_name,
    staff,
    notes,
    date,
    time
  } = req.body;

  const medName = (medication_name || medicationName || '').trim();
  const admDose = (administered_dose || administeredDose || prescribed_dose || prescribedDose || '').toString().trim();
  const rxDose = (prescribed_dose || prescribedDose || admDose).toString().trim();

  if (!medName) {
    return res.status(400).json({ error: true, message: 'Medication name is required.' });
  }
  if (!admDose) {
    return res.status(400).json({ error: true, message: 'Administered dose is required.' });
  }

  let recordTime = new Date();
  if (admin_time || adminTime) {
    recordTime = new Date(admin_time || adminTime);
  } else if (date && time) {
    recordTime = new Date(`${date}T${time}`);
  }

  const staffName = (staff_name || staff || 'Clinical Staff').trim();

  try {
    const query = `
      INSERT INTO medication_records (
        patient_id,
        admission_id,
        medication_name,
        prescribed_dose,
        administered_dose,
        dose_unit,
        route,
        frequency,
        status,
        admin_time,
        staff_name,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id,
        patient_id AS "patientId",
        medication_name AS "medicationName",
        prescribed_dose AS "prescribedDose",
        administered_dose AS "administeredDose",
        dose_unit AS "doseUnit",
        route,
        frequency,
        status,
        admin_time AS "adminTime",
        staff_name AS "staff",
        notes,
        created_at AS "createdAt";
    `;

    const result = await pool.query(query, [
      id,
      admission_id || admissionId || null,
      medName,
      rxDose,
      admDose,
      dose_unit || doseUnit,
      route,
      frequency,
      status,
      recordTime,
      staffName,
      notes || null
    ]);

    const created = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Medication administration record saved successfully.',
      data: {
        id: created.id,
        medicationName: created.medicationName,
        prescribedDose: created.prescribedDose,
        administeredDose: created.administeredDose,
        doseUnit: created.doseUnit,
        route: created.route,
        frequency: created.frequency,
        status: created.status,
        time: created.adminTime ? new Date(created.adminTime).toLocaleString() : 'N/A',
        staff: created.staff,
        notes: created.notes,
        isDemoData: false,
        source: 'Neon PostgreSQL (Live DB)'
      }
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: true, message: `Patient '${id}' not found in the database.` });
    }
    next(err);
  }
}

// ==========================================
// 3. Fluid Intake & Output (I/O) Records
// ==========================================

async function getPatientFluids(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        admission_id AS "admissionId",
        interval_label AS "interval",
        oral_intake_ml AS "oralIntake",
        iv_intake_ml AS "ivIntake",
        other_intake_ml AS "otherIntake",
        total_intake_ml AS "totalIntake",
        urine_output_ml AS "urineOutput",
        other_output_ml AS "otherOutput",
        total_output_ml AS "totalOutput",
        net_balance_ml AS "netBalance",
        urine_appearance AS "urineAppearance",
        catheter_status AS "catheterStatus",
        recorded_at AS "recordedAt",
        staff_name AS "staff",
        notes,
        created_at AS "createdAt"
      FROM fluid_records
      WHERE patient_id = $1
      ORDER BY recorded_at DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map(row => ({
      id: row.id,
      interval: row.interval,
      oralIntake: Number(row.oralIntake || 0),
      ivIntake: Number(row.ivIntake || 0),
      otherIntake: Number(row.otherIntake || 0),
      totalIntake: Number(row.totalIntake || 0),
      urineOutput: Number(row.urineOutput || 0),
      otherOutput: Number(row.otherOutput || 0),
      totalOutput: Number(row.totalOutput || 0),
      netBalance: Number(row.netBalance || 0),
      urineAppearance: row.urineAppearance || 'Clear Amber',
      catheterStatus: row.catheterStatus || 'Foley Catheter',
      time: row.recordedAt ? new Date(row.recordedAt).toLocaleString() : 'N/A',
      staff: row.staff || 'Clinical Staff',
      notes: row.notes || '',
      isDemoData: false,
      source: 'Neon PostgreSQL (Live DB)'
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

async function createPatientFluid(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;
  const {
    admission_id,
    admissionId,
    interval_label,
    interval = 'Current Shift Interval',
    oral_intake_ml,
    oralIntake,
    iv_intake_ml,
    ivIntake,
    other_intake_ml,
    otherIntake,
    urine_output_ml,
    urineOutput,
    other_output_ml,
    otherOutput,
    urine_appearance,
    urineAppearance = 'Clear Amber',
    catheter_status,
    catheterStatus = 'Foley Catheter',
    recorded_at,
    recordedAt,
    staff_name,
    staff,
    notes,
    date,
    time
  } = req.body;

  const parseNum = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) ? Number(val) : 0;

  const oral = parseNum(oral_intake_ml !== undefined ? oral_intake_ml : oralIntake);
  const iv = parseNum(iv_intake_ml !== undefined ? iv_intake_ml : ivIntake);
  const otherIn = parseNum(other_intake_ml !== undefined ? other_intake_ml : otherIntake);
  const urine = parseNum(urine_output_ml !== undefined ? urine_output_ml : urineOutput);
  const otherOut = parseNum(other_output_ml !== undefined ? other_output_ml : otherOutput);

  if (oral === 0 && iv === 0 && otherIn === 0 && urine === 0 && otherOut === 0) {
    return res.status(400).json({
      error: true,
      message: 'Please provide at least one non-zero fluid intake or output amount.'
    });
  }

  let recordTime = new Date();
  if (recorded_at || recordedAt) {
    recordTime = new Date(recorded_at || recordedAt);
  } else if (date && time) {
    recordTime = new Date(`${date}T${time}`);
  }

  const staffName = (staff_name || staff || 'Clinical Staff').trim();
  const intervalName = (interval_label || interval || 'Current Shift Interval').trim();

  try {
    // Note: total_intake_ml, total_output_ml, and net_balance_ml are GENERATED ALWAYS columns in PostgreSQL
    const query = `
      INSERT INTO fluid_records (
        patient_id,
        admission_id,
        interval_label,
        oral_intake_ml,
        iv_intake_ml,
        other_intake_ml,
        urine_output_ml,
        other_output_ml,
        urine_appearance,
        catheter_status,
        recorded_at,
        staff_name,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        patient_id AS "patientId",
        interval_label AS "interval",
        oral_intake_ml AS "oralIntake",
        iv_intake_ml AS "ivIntake",
        other_intake_ml AS "otherIntake",
        total_intake_ml AS "totalIntake",
        urine_output_ml AS "urineOutput",
        other_output_ml AS "otherOutput",
        total_output_ml AS "totalOutput",
        net_balance_ml AS "netBalance",
        urine_appearance AS "urineAppearance",
        catheter_status AS "catheterStatus",
        recorded_at AS "recordedAt",
        staff_name AS "staff",
        notes,
        created_at AS "createdAt";
    `;

    const result = await pool.query(query, [
      id,
      admission_id || admissionId || null,
      intervalName,
      oral,
      iv,
      otherIn,
      urine,
      otherOut,
      urine_appearance || urineAppearance,
      catheter_status || catheterStatus,
      recordTime,
      staffName,
      notes || null
    ]);

    const created = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Fluid record saved successfully.',
      data: {
        id: created.id,
        interval: created.interval,
        oralIntake: Number(created.oralIntake || 0),
        ivIntake: Number(created.ivIntake || 0),
        otherIntake: Number(created.otherIntake || 0),
        totalIntake: Number(created.totalIntake || 0),
        urineOutput: Number(created.urineOutput || 0),
        otherOutput: Number(created.otherOutput || 0),
        totalOutput: Number(created.totalOutput || 0),
        netBalance: Number(created.netBalance || 0),
        urineAppearance: created.urineAppearance,
        catheterStatus: created.catheterStatus,
        time: created.recordedAt ? new Date(created.recordedAt).toLocaleString() : 'N/A',
        staff: created.staff,
        notes: created.notes,
        isDemoData: false,
        source: 'Neon PostgreSQL (Live DB)'
      }
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: true, message: `Patient '${id}' not found in the database.` });
    }
    next(err);
  }
}

// ==========================================
// 4. Laboratory & ABG Results
// ==========================================

async function getPatientLabs(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        patient_id AS "patientId",
        admission_id AS "admissionId",
        panel_name AS "panel",
        test_values AS "values",
        collection_time AS "collectionTime",
        result_time AS "resultTime",
        status,
        staff_name AS "staff",
        notes,
        created_at AS "createdAt"
      FROM lab_results
      WHERE patient_id = $1
      ORDER BY collection_time DESC;
    `;

    const result = await pool.query(query, [id]);
    const formatted = result.rows.map(row => ({
      id: row.id,
      panel: row.panel,
      values: row.values || {},
      collectionTime: row.collectionTime ? new Date(row.collectionTime).toLocaleString() : 'N/A',
      resultTime: row.resultTime ? new Date(row.resultTime).toLocaleString() : 'N/A',
      status: row.status || 'Entered',
      staff: row.staff || 'Clinical Staff',
      notes: row.notes || '',
      isDemoData: false,
      source: 'Neon PostgreSQL (Live DB)'
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

async function createPatientLab(req, res, next) {
  if (!checkDbReady(res)) return;
  const { id } = req.params;
  const {
    admission_id,
    admissionId,
    panel_name,
    panel = 'Manual Laboratory Entry',
    test_values,
    values = {},
    collection_time,
    collectionTime,
    result_time,
    resultTime,
    status = 'Entered',
    staff_name,
    staff,
    notes,
    date,
    time
  } = req.body;

  const panelName = (panel_name || panel || 'Manual Laboratory Entry').trim();
  const testVals = (test_values && typeof test_values === 'object') ? test_values : (values && typeof values === 'object' ? values : {});

  if (Object.keys(testVals).length === 0) {
    return res.status(400).json({
      error: true,
      message: 'At least one laboratory test result parameter must be provided.'
    });
  }

  let colTime = new Date();
  if (collection_time || collectionTime) {
    colTime = new Date(collection_time || collectionTime);
  } else if (date && time) {
    colTime = new Date(`${date}T${time}`);
  }

  let resTime = new Date();
  if (result_time || resultTime) {
    resTime = new Date(result_time || resultTime);
  }

  const staffName = (staff_name || staff || 'Clinical Staff').trim();

  try {
    const query = `
      INSERT INTO lab_results (
        patient_id,
        admission_id,
        panel_name,
        test_values,
        collection_time,
        result_time,
        status,
        staff_name,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        patient_id AS "patientId",
        panel_name AS "panel",
        test_values AS "values",
        collection_time AS "collectionTime",
        result_time AS "resultTime",
        status,
        staff_name AS "staff",
        notes,
        created_at AS "createdAt";
    `;

    const result = await pool.query(query, [
      id,
      admission_id || admissionId || null,
      panelName,
      JSON.stringify(testVals),
      colTime,
      resTime,
      status,
      staffName,
      notes || null
    ]);

    const created = result.rows[0];
    res.status(201).json({
      success: true,
      message: 'Laboratory results saved successfully.',
      data: {
        id: created.id,
        panel: created.panel,
        values: created.values,
        collectionTime: created.collectionTime ? new Date(created.collectionTime).toLocaleString() : 'N/A',
        resultTime: created.resultTime ? new Date(created.resultTime).toLocaleString() : 'N/A',
        status: created.status,
        staff: created.staff,
        notes: created.notes,
        isDemoData: false,
        source: 'Neon PostgreSQL (Live DB)'
      }
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: true, message: `Patient '${id}' not found in the database.` });
    }
    next(err);
  }
}

module.exports = {
  getPatientNotes,
  createPatientNote,
  getPatientMedications,
  createPatientMedication,
  getPatientFluids,
  createPatientFluid,
  getPatientLabs,
  createPatientLab
};
