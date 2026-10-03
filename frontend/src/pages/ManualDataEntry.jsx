import React, { useState, useMemo } from 'react';
import { 
  ClipboardEdit, 
  User, 
  Bed, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Save, 
  Heart, 
  Gauge, 
  Activity, 
  Wind, 
  Thermometer, 
  FileText, 
  Pill, 
  Droplet, 
  FlaskConical, 
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Stethoscope,
  Info,
  ShieldAlert
} from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';
import { AddPatientModal } from '../components/AddPatientModal';

export const ManualDataEntry = () => {
  const { 
    patients, 
    selectedPatientId, 
    setSelectedPatientId, 
    selectedPatient,
    addClinicalNote,
    addMedicationRecord,
    addFluidRecord,
    addLabResult,
    addManualObservation,
    medications,
    fluidRecords,
    labResults,
    clinicalNotes,
    setActivePage
  } = usePatientData();

  // Registration Modal State
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  // Active Form Section Tab
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'meds' | 'fluids' | 'labs' | 'vitals'

  // Shared Header State
  const [commonMeta, setCommonMeta] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    staffName: 'Dr. Sarah Lin, MD (ICU Resident)',
    staffId: 'STF-8492'
  });

  // Section 2 Form: Clinical Notes & Exam
  const [notesForm, setNotesForm] = useState({
    type: "Doctor's Assessment & Plan",
    findings: '',
    plan: '',
    gcsScore: 'GCS 15 (E4 V4 M6)',
    pupils: '3mm Equal & Reactive to Light',
    respiratoryEffort: 'Adequate, No Accessory Muscle Use',
    painScore: '0'
  });

  // Section 3 Form: Medication Administration (MAR)
  const [medForm, setMedForm] = useState({
    medicationName: '',
    prescribedDose: '',
    administeredDose: '',
    doseUnit: 'mg',
    route: 'IV Infusion',
    frequency: 'Q8H',
    status: 'Administered',
    notes: ''
  });

  // Section 4 & 5 Form: Fluid I/O & Urine
  const [fluidForm, setFluidForm] = useState({
    interval: 'Current 4-Hour Shift Interval',
    oralIntake: '',
    ivIntake: '',
    otherIntake: '',
    urineOutput: '',
    otherOutput: '',
    urineAppearance: 'Clear Amber',
    catheterStatus: 'Foley Catheter (14 Fr)',
    notes: ''
  });

  // Section 6 Form: Laboratory & ABG Results
  const [labForm, setLabForm] = useState({
    panel: 'Arterial Blood Gas (ABG)',
    // ABG & manual_lab_records columns
    fio2: '0.21',
    ph: '',
    pao2: '',
    paco2: '',
    hco3: '',
    lactate: '',
    // Hematology & Renal
    hb: '',
    wbc: '',
    platelets: '',
    creatinine: '',
    urea: '',
    sodium: '',
    potassium: '',
    glucose: '',
    collectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    notes: ''
  });

  // Section 7 Form: Manual Spot Vitals
  const [vitalsForm, setVitalsForm] = useState({
    hr: '',
    bpSys: '',
    bpDia: '',
    spo2: '',
    rr: '',
    temp: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Derived calculations for Fluid I/O
  const fluidCalculation = useMemo(() => {
    const oral = Number(fluidForm.oralIntake) || 0;
    const iv = Number(fluidForm.ivIntake) || 0;
    const otherIn = Number(fluidForm.otherIntake) || 0;
    const totalIn = oral + iv + otherIn;

    const urine = Number(fluidForm.urineOutput) || 0;
    const otherOut = Number(fluidForm.otherOutput) || 0;
    const totalOut = urine + otherOut;

    const net = totalIn - totalOut;

    return { totalIn, totalOut, net };
  }, [fluidForm]);

  // Recent History for Selected Patient in Active Tab
  const recentItems = useMemo(() => {
    switch (activeTab) {
      case 'notes': return (clinicalNotes[selectedPatientId] || []).slice(0, 3);
      case 'meds': return (medications[selectedPatientId] || []).slice(0, 3);
      case 'fluids': return (fluidRecords[selectedPatientId] || []).slice(0, 3);
      case 'labs': return (labResults[selectedPatientId] || []).slice(0, 3);
      default: return [];
    }
  }, [activeTab, selectedPatientId, clinicalNotes, medications, fluidRecords, labResults]);

  const handleCommonChange = (field, val) => {
    setCommonMeta(prev => ({ ...prev, [field]: val }));
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage(null);
    setSuccessBanner(null);

    if (!selectedPatient) {
      setErrorMessage("Please select an ICU patient first.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'notes') {
        if (!notesForm.findings.trim() && !notesForm.plan.trim()) {
          setErrors({ findings: 'Please enter clinical examination findings or plan.' });
          setIsSubmitting(false);
          return;
        }

        const patientIdentifier = selectedPatient.patient_id || selectedPatient.id;
        await addClinicalNote({
          patientId: patientIdentifier,
          author: commonMeta.staffName,
          type: notesForm.type,
          findings: notesForm.findings,
          plan: notesForm.plan,
          gcsScore: notesForm.gcsScore,
          pupils: notesForm.pupils,
          date: commonMeta.date,
          time: commonMeta.time
        });

        setSuccessBanner({
          category: 'Clinical Note & Exam',
          details: `Documented by ${commonMeta.staffName} for ${selectedPatient.name} (${selectedPatient.bedNumber}).`
        });

        setNotesForm({
          type: "Doctor's Assessment & Plan",
          findings: '',
          plan: '',
          gcsScore: 'GCS 15 (E4 V4 M6)',
          pupils: '3mm Equal & Reactive to Light',
          respiratoryEffort: 'Adequate, No Accessory Muscle Use',
          painScore: '0'
        });
      } else if (activeTab === 'meds') {
        if (!medForm.medicationName.trim()) {
          setErrors({ medicationName: 'Medication name is required.' });
          setIsSubmitting(false);
          return;
        }
        if (!medForm.administeredDose && !medForm.prescribedDose) {
          setErrors({ administeredDose: 'Please specify administered or prescribed dose.' });
          setIsSubmitting(false);
          return;
        }

        const patientIdentifier = selectedPatient.patient_id || selectedPatient.id;
        await addMedicationRecord({
          patientId: patientIdentifier,
          medicationName: medForm.medicationName,
          prescribedDose: medForm.prescribedDose || medForm.administeredDose,
          administeredDose: medForm.administeredDose || medForm.prescribedDose,
          doseUnit: medForm.doseUnit,
          route: medForm.route,
          frequency: medForm.frequency,
          status: medForm.status,
          notes: medForm.notes,
          staff: commonMeta.staffName,
          date: commonMeta.date,
          time: commonMeta.time
        });

        setSuccessBanner({
          category: 'Medication Administration (MAR)',
          details: `${medForm.medicationName} (${medForm.administeredDose || medForm.prescribedDose} ${medForm.doseUnit}) recorded for ${selectedPatient.name}.`
        });

        setMedForm({
          medicationName: '',
          prescribedDose: '',
          administeredDose: '',
          doseUnit: 'mg',
          route: 'IV Infusion',
          frequency: 'Q8H',
          status: 'Administered',
          notes: ''
        });
      } else if (activeTab === 'fluids') {
        if (!fluidForm.oralIntake && !fluidForm.ivIntake && !fluidForm.urineOutput && !fluidForm.otherOutput) {
          setErrors({ general: 'Please record at least one intake or output measurement.' });
          setIsSubmitting(false);
          return;
        }

        const patientIdentifier = selectedPatient.patient_id || selectedPatient.id;
        await addFluidRecord({
          patientId: patientIdentifier,
          interval: fluidForm.interval,
          oralIntake: fluidForm.oralIntake,
          ivIntake: fluidForm.ivIntake,
          otherIntake: fluidForm.otherIntake,
          urineOutput: fluidForm.urineOutput,
          otherOutput: fluidForm.otherOutput,
          urineAppearance: fluidForm.urineAppearance,
          catheterStatus: fluidForm.catheterStatus,
          notes: fluidForm.notes,
          staff: commonMeta.staffName,
          date: commonMeta.date,
          time: commonMeta.time
        });

        setSuccessBanner({
          category: 'Fluid Intake / Output & Urine Chart',
          details: `Net fluid balance (${fluidCalculation.net >= 0 ? '+' : ''}${fluidCalculation.net} mL) charted for ${selectedPatient.name}.`
        });

        setFluidForm({
          interval: 'Current 4-Hour Shift Interval',
          oralIntake: '',
          ivIntake: '',
          otherIntake: '',
          urineOutput: '',
          otherOutput: '',
          urineAppearance: 'Clear Amber',
          catheterStatus: 'Foley Catheter (14 Fr)',
          notes: ''
        });
      } else if (activeTab === 'labs') {
        // Collect entered lab values
        const values = {};
        const fio2Val = labForm.fio2 ? Number(labForm.fio2) : 0.21;
        values.fio2 = { val: fio2Val, unit: '', ref: '0.21 - 1.00', flag: fio2Val > 0.40 ? 'high' : 'normal' };

        if (labForm.ph) values.ph = { val: Number(labForm.ph), unit: '', ref: '7.35 - 7.45', flag: (Number(labForm.ph) < 7.35 ? 'low' : Number(labForm.ph) > 7.45 ? 'high' : 'normal') };
        if (labForm.pao2) values.pao2 = { val: Number(labForm.pao2), unit: 'mmHg', ref: '80 - 100', flag: (Number(labForm.pao2) < 80 ? 'low' : 'normal') };
        if (labForm.paco2) values.paco2 = { val: Number(labForm.paco2), unit: 'mmHg', ref: '35 - 45', flag: (Number(labForm.paco2) > 45 ? 'high' : Number(labForm.paco2) < 35 ? 'low' : 'normal') };
        if (labForm.hco3) values.hco3 = { val: Number(labForm.hco3), unit: 'mEq/L', ref: '22 - 26', flag: 'normal' };
        if (labForm.lactate) values.lactate = { val: Number(labForm.lactate), unit: 'mmol/L', ref: '< 2.0', flag: (Number(labForm.lactate) >= 2.0 ? 'high' : 'normal') };

        if (labForm.hb) values.hb = { val: Number(labForm.hb), unit: 'g/dL', ref: '12.0 - 15.5', flag: (Number(labForm.hb) < 11 ? 'low' : 'normal') };
        if (labForm.wbc) values.wbc = { val: Number(labForm.wbc), unit: '×10³/µL', ref: '4.5 - 11.0', flag: (Number(labForm.wbc) > 11 ? 'high' : 'normal') };
        if (labForm.platelets) values.platelets = { val: Number(labForm.platelets), unit: '×10³/µL', ref: '150 - 450', flag: (Number(labForm.platelets) < 150 ? 'low' : 'normal') };
        if (labForm.creatinine) values.creatinine = { val: Number(labForm.creatinine), unit: 'mg/dL', ref: '0.6 - 1.2', flag: (Number(labForm.creatinine) > 1.3 ? 'high' : 'normal') };
        if (labForm.urea) values.urea = { val: Number(labForm.urea), unit: 'mg/dL', ref: '10 - 40', flag: (Number(labForm.urea) > 45 ? 'high' : 'normal') };
        if (labForm.potassium) values.potassium = { val: Number(labForm.potassium), unit: 'mEq/L', ref: '3.5 - 5.0', flag: (Number(labForm.potassium) > 5.0 ? 'high' : 'normal') };
        if (labForm.glucose) values.glucose = { val: Number(labForm.glucose), unit: 'mg/dL', ref: '70 - 140', flag: (Number(labForm.glucose) > 180 ? 'high' : 'normal') };

        if (!labForm.ph && !labForm.paco2 && !labForm.lactate && !labForm.hb && !labForm.creatinine && !labForm.notes) {
          setErrors({ general: 'Please enter at least one laboratory test result or note.' });
          setIsSubmitting(false);
          return;
        }

        const patientIdentifier = selectedPatient.patient_id || selectedPatient.id;
        await addLabResult({
          patientId: patientIdentifier,
          panel: labForm.panel,
          fio2: fio2Val,
          ph: labForm.ph ? Number(labForm.ph) : null,
          paco2: labForm.paco2 ? Number(labForm.paco2) : null,
          lactate: labForm.lactate ? Number(labForm.lactate) : null,
          values: values,
          collectionTime: `${commonMeta.date} ${labForm.collectionTime}`,
          resultTime: `${commonMeta.date} ${commonMeta.time}`,
          notes: labForm.notes,
          staff: commonMeta.staffName
        });

        setSuccessBanner({
          category: 'Laboratory & ABG Results (manual_lab_records)',
          details: `Manual lab record saved for ${selectedPatient.name}.`
        });

        setLabForm({
          panel: 'Arterial Blood Gas (ABG)',
          fio2: '0.21',
          ph: '', pao2: '', paco2: '', hco3: '', lactate: '',
          hb: '', wbc: '', platelets: '', creatinine: '', urea: '', sodium: '', potassium: '', glucose: '',
          collectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          notes: ''
        });
      } else if (activeTab === 'vitals') {
        if (!vitalsForm.hr && !vitalsForm.bpSys && !vitalsForm.spo2 && !vitalsForm.rr && !vitalsForm.temp) {
          setErrors({ general: 'Please record at least one manual vital sign measurement.' });
          setIsSubmitting(false);
          return;
        }

        const patientIdentifier = selectedPatient.patient_id || selectedPatient.id;
        await addManualObservation({
          patientId: patientIdentifier,
          hr: vitalsForm.hr,
          bpSys: vitalsForm.bpSys,
          bpDia: vitalsForm.bpDia,
          spo2: vitalsForm.spo2,
          rr: vitalsForm.rr,
          temp: vitalsForm.temp,
          notes: vitalsForm.notes,
          staff: commonMeta.staffName,
          date: commonMeta.date,
          time: commonMeta.time
        });

        setSuccessBanner({
          category: 'Manual Spot Vitals',
          details: `Manual vital sign spot checks saved for ${selectedPatient.name}. Dashboard cards and trends updated.`
        });

        setVitalsForm({ hr: '', bpSys: '', bpDia: '', spo2: '', rr: '', temp: '', notes: '' });
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCurrent = () => {
    if (window.confirm("Are you sure you want to reset the current section form?")) {
      setErrors({});
      setErrorMessage(null);
      setSuccessBanner(null);
      if (activeTab === 'notes') setNotesForm({ type: "Doctor's Assessment & Plan", findings: '', plan: '', gcsScore: 'GCS 15 (E4 V4 M6)', pupils: '3mm Equal & Reactive to Light', respiratoryEffort: 'Adequate, No Accessory Muscle Use', painScore: '0' });
      if (activeTab === 'meds') setMedForm({ medicationName: '', prescribedDose: '', administeredDose: '', doseUnit: 'mg', route: 'IV Infusion', frequency: 'Q8H', status: 'Administered', notes: '' });
      if (activeTab === 'fluids') setFluidForm({ interval: 'Current 4-Hour Shift Interval', oralIntake: '', ivIntake: '', otherIntake: '', urineOutput: '', otherOutput: '', urineAppearance: 'Clear Amber', catheterStatus: 'Foley Catheter (14 Fr)', notes: '' });
      if (activeTab === 'labs') setLabForm({ panel: 'Arterial Blood Gas (ABG)', ph: '', pao2: '', paco2: '', hco3: '', lactate: '', hb: '', wbc: '', platelets: '', creatinine: '', urea: '', sodium: '', potassium: '', glucose: '', collectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), notes: '' });
      if (activeTab === 'vitals') setVitalsForm({ hr: '', bpSys: '', bpDia: '', spo2: '', rr: '', temp: '', notes: '' });
    }
  };

  return (
    <div className="manual-entry-container">
      {/* Page Header */}
      <div className="page-header-simple">
        <div>
          <h2 className="dashboard-title">Manual Clinical Data Entry</h2>
          <p className="dashboard-subtitle">Structured bedside charting for paper records, medication MAR, fluid balance, and lab tests</p>
        </div>
        <div className="header-actions">
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={() => setActivePage('dashboard')}
          >
            <Activity size={15} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="entry-alert-banner alert-success" role="alert">
          <div className="alert-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="alert-content">
            <h4 className="alert-title">{successBanner.category} Saved Successfully</h4>
            <p className="alert-desc">{successBanner.details}</p>
          </div>
          <button 
            type="button" 
            className="btn btn-primary btn-sm ml-auto"
            onClick={() => setActivePage('dashboard')}
          >
            <span>View on Dashboard</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="entry-alert-banner alert-error" role="alert">
          <div className="alert-icon">
            <AlertCircle size={20} />
          </div>
          <div className="alert-content">
            <h4 className="alert-title">Submission Error</h4>
            <p className="alert-desc">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Section 1: Patient and Encounter Information (Always Visible Header) */}
      <section className="dashboard-card encounter-card">
        <div className="card-header-simple flex-between">
          <div className="encounter-header-left">
            <span className="step-num">1</span>
            <div>
              <h3 className="section-title">Patient Encounter & Attribution</h3>
              <p className="section-subtitle">Confirm patient record and recording timestamp</p>
            </div>
          </div>
          <span className="source-tag-solid">Source: Manual Entry (Bedside Charting)</span>
        </div>

        <div className="encounter-body">
          {/* Patient Selector */}
          <div className="encounter-grid">
            <div className="form-field">
              <div className="flex-between">
                <label htmlFor="patient-select" className="field-label required">Select ICU Patient</label>
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(true)}
                  style={{ fontSize: '0.78rem', color: 'var(--primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Add Patient
                </button>
              </div>
              <select
                id="patient-select"
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="input-select"
              >
                {patients.length === 0 ? (
                  <option value="" disabled>No ICU patients currently registered</option>
                ) : (
                  patients.map(p => {
                    const pId = p.patient_id || p.id;
                    return (
                      <option key={pId} value={pId}>
                        {p.bedNumber} — {p.name || `Patient ${pId}`} ({pId}) | {p.status}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label required">Observation Date</label>
              <div className="input-icon-wrap">
                <Calendar size={14} className="input-lead-icon" />
                <input
                  type="date"
                  value={commonMeta.date}
                  onChange={(e) => handleCommonChange('date', e.target.value)}
                  className="input-text with-icon"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label required">Observation Time</label>
              <div className="input-icon-wrap">
                <Clock size={14} className="input-lead-icon" />
                <input
                  type="time"
                  value={commonMeta.time}
                  onChange={(e) => handleCommonChange('time', e.target.value)}
                  className="input-text with-icon"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Charted By (Staff Identifier)</label>
              <div className="input-icon-wrap">
                <User size={14} className="input-lead-icon" />
                <input
                  type="text"
                  value={commonMeta.staffName}
                  onChange={(e) => handleCommonChange('staffName', e.target.value)}
                  className="input-text with-icon"
                  placeholder="Staff Name / ID"
                />
              </div>
            </div>
          </div>

          {/* Confirmed Patient Demographic Strip */}
          {selectedPatient && (
            <div className="confirmed-demographics-strip">
              <span className="demo-chip"><strong>Bed:</strong> <span className="text-blue font-bold">{selectedPatient.bedNumber}</span></span>
              <span className="demo-chip"><strong>ID:</strong> <span className="font-mono">{selectedPatient.patient_id || selectedPatient.id}</span></span>
              <span className="demo-chip"><strong>Name:</strong> <strong>{selectedPatient.name || `Patient ${selectedPatient.patient_id || selectedPatient.id}`}</strong></span>
              {selectedPatient.age && <span className="demo-chip"><strong>Age/Sex:</strong> {selectedPatient.age}y • {selectedPatient.gender}</span>}
              <span className="demo-chip"><strong>Admitted:</strong> {selectedPatient.admissionDate || 'Active'}</span>
              <span className="demo-chip"><strong>Status:</strong> {selectedPatient.status}</span>
            </div>
          )}
        </div>
      </section>

      {/* Main Entry Tabs Navigation */}
      <div className="charting-tabs-nav">
        <button
          className={`chart-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={16} />
          <span>Clinical Notes & Exam</span>
        </button>

        <button
          className={`chart-tab-btn ${activeTab === 'meds' ? 'active' : ''}`}
          onClick={() => setActiveTab('meds')}
        >
          <Pill size={16} />
          <span>Medication (MAR)</span>
        </button>

        <button
          className={`chart-tab-btn ${activeTab === 'fluids' ? 'active' : ''}`}
          onClick={() => setActiveTab('fluids')}
        >
          <Droplet size={16} />
          <span>Fluid I/O & Urine</span>
        </button>

        <button
          className={`chart-tab-btn ${activeTab === 'labs' ? 'active' : ''}`}
          onClick={() => setActiveTab('labs')}
        >
          <FlaskConical size={16} />
          <span>Lab & Blood Gas (ABG)</span>
        </button>

        <button
          className={`chart-tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
          onClick={() => setActiveTab('vitals')}
        >
          <Stethoscope size={16} />
          <span>Spot Vitals (Optional)</span>
        </button>
      </div>

      {/* Form Grid: Main Form + Sidebar Preview */}
      <div className="form-workspace-grid">
        <form className="main-chart-form" onSubmit={handleSubmit} noValidate>

          {/* TAB 1: Clinical Notes & Physical Exam */}
          {activeTab === 'notes' && (
            <div className="dashboard-card form-box">
              <div className="card-header-simple">
                <h3 className="section-title">Section 2: Clinical Observations & Physical Assessment</h3>
                <p className="section-subtitle">Doctor assessments, qualitative nursing notes, neurological exam, and plan of care</p>
              </div>

              <div className="form-body-pad">
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-label required">Note Category</label>
                    <select
                      value={notesForm.type}
                      onChange={(e) => setNotesForm({ ...notesForm, type: e.target.value })}
                      className="input-select"
                    >
                      <option value="Doctor's Assessment & Plan">Doctor's Assessment & Plan</option>
                      <option value="Nursing Observation">Nursing Observation</option>
                      <option value="Respiratory Therapy Note">Respiratory Therapy Note</option>
                      <option value="Sepsis / Hemodynamic Review">Sepsis / Hemodynamic Review</option>
                      <option value="Post-Procedure Note">Post-Procedure Note</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Neurological GCS / Sedation Score</label>
                    <input
                      type="text"
                      placeholder="e.g. GCS 15 (E4 V4 M6) or RASS -2"
                      value={notesForm.gcsScore}
                      onChange={(e) => setNotesForm({ ...notesForm, gcsScore: e.target.value })}
                      className="input-text"
                    />
                  </div>
                </div>

                <div className="form-row-2 mt-md">
                  <div className="form-field">
                    <label className="field-label">Pupillary Reflex & Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 3mm Equal & Reactive to Light"
                      value={notesForm.pupils}
                      onChange={(e) => setNotesForm({ ...notesForm, pupils: e.target.value })}
                      className="input-text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Pain Score (0 - 10)</label>
                    <select
                      value={notesForm.painScore}
                      onChange={(e) => setNotesForm({ ...notesForm, painScore: e.target.value })}
                      className="input-select"
                    >
                      <option value="0">0 - No Pain</option>
                      <option value="1">1 - Mild Pain</option>
                      <option value="2">2 - Mild Pain</option>
                      <option value="4">4 - Moderate Pain</option>
                      <option value="6">6 - Severe Pain</option>
                      <option value="8">8 - Very Severe Pain</option>
                      <option value="CPOT 2">CPOT 2 (Intubated/Sedated)</option>
                    </select>
                  </div>
                </div>

                <div className="form-field mt-md">
                  <label className="field-label required">Examination Findings & Patient Response</label>
                  <textarea
                    rows="3"
                    placeholder="Document chest sounds, respiratory effort, skin perfusion, abdominal findings, or suctioning results..."
                    value={notesForm.findings}
                    onChange={(e) => setNotesForm({ ...notesForm, findings: e.target.value })}
                    className="input-textarea"
                  ></textarea>
                  {errors.findings && <span className="field-error">{errors.findings}</span>}
                </div>

                <div className="form-field mt-md">
                  <label className="field-label">Clinical Plan & Physician Orders</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Titrate vasopressors for MAP > 65, repeat ABG in 2 hours, target negative balance..."
                    value={notesForm.plan}
                    onChange={(e) => setNotesForm({ ...notesForm, plan: e.target.value })}
                    className="input-textarea"
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Medication Administration Record (MAR) */}
          {activeTab === 'meds' && (
            <div className="dashboard-card form-box">
              <div className="card-header-simple">
                <h3 className="section-title">Section 3: Medication & Dose Administration Record (MAR)</h3>
                <p className="section-subtitle">Prescribed vs. administered doses are maintained as distinct concepts</p>
              </div>

              <div className="form-body-pad">
                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-label required">Medication Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Norepinephrine, Meropenem, Furosemide, Insulin"
                      value={medForm.medicationName}
                      onChange={(e) => setMedForm({ ...medForm, medicationName: e.target.value })}
                      className="input-text"
                    />
                    {errors.medicationName && <span className="field-error">{errors.medicationName}</span>}
                  </div>

                  <div className="form-field">
                    <label className="field-label required">Administration Status</label>
                    <select
                      value={medForm.status}
                      onChange={(e) => setMedForm({ ...medForm, status: e.target.value })}
                      className="input-select"
                    >
                      <option value="Administered">Administered</option>
                      <option value="Held / Withheld">Held / Withheld</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Discontinued">Discontinued</option>
                      <option value="Refused">Refused</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-3 mt-md">
                  <div className="form-field">
                    <label className="field-label">Prescribed Dose</label>
                    <input
                      type="text"
                      placeholder="e.g. 50"
                      value={medForm.prescribedDose}
                      onChange={(e) => setMedForm({ ...medForm, prescribedDose: e.target.value })}
                      className="input-text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label required">Administered Dose</label>
                    <input
                      type="text"
                      placeholder="e.g. 50"
                      value={medForm.administeredDose}
                      onChange={(e) => setMedForm({ ...medForm, administeredDose: e.target.value })}
                      className="input-text"
                    />
                    {errors.administeredDose && <span className="field-error">{errors.administeredDose}</span>}
                  </div>

                  <div className="form-field">
                    <label className="field-label">Dose Unit</label>
                    <select
                      value={medForm.doseUnit}
                      onChange={(e) => setMedForm({ ...medForm, doseUnit: e.target.value })}
                      className="input-select"
                    >
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                      <option value="mcg/kg/min">mcg/kg/min</option>
                      <option value="mcg/min">mcg/min</option>
                      <option value="g">g</option>
                      <option value="units/hr">units/hr</option>
                      <option value="units">units</option>
                      <option value="mL/hr">mL/hr</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2 mt-md">
                  <div className="form-field">
                    <label className="field-label">Route of Administration</label>
                    <select
                      value={medForm.route}
                      onChange={(e) => setMedForm({ ...medForm, route: e.target.value })}
                      className="input-select"
                    >
                      <option value="IV Continuous Infusion">IV Continuous Infusion</option>
                      <option value="IV Infusion (Piggyback)">IV Infusion (Piggyback)</option>
                      <option value="IV Direct Bolus">IV Direct Bolus</option>
                      <option value="Oral / NG Tube">Oral / NG Tube</option>
                      <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                      <option value="Inhalation / Nebulizer">Inhalation / Nebulizer</option>
                      <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Frequency / Schedule</label>
                    <select
                      value={medForm.frequency}
                      onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                      className="input-select"
                    >
                      <option value="Continuous">Continuous Infusion</option>
                      <option value="Stat / Once">Stat / Once</option>
                      <option value="Q6H">Q6H (Every 6 Hours)</option>
                      <option value="Q8H">Q8H (Every 8 Hours)</option>
                      <option value="Q12H">Q12H (Every 12 Hours)</option>
                      <option value="Q24H / Daily">Q24H / Daily</option>
                      <option value="PRN">PRN (As Needed)</option>
                    </select>
                  </div>
                </div>

                <div className="form-field mt-md">
                  <label className="field-label">Clinical Notes / Indication</label>
                  <input
                    type="text"
                    placeholder="e.g. Infusion titrated for target MAP ≥ 65, sedation CPOT score 2, etc."
                    value={medForm.notes}
                    onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
                    className="input-text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Fluid Intake & Output (I/O) & Urine */}
          {activeTab === 'fluids' && (
            <div className="dashboard-card form-box">
              <div className="card-header-simple">
                <h3 className="section-title">Section 4 & 5: Fluid Intake, Output & Urine Chart</h3>
                <p className="section-subtitle">Record oral/IV fluids, chest drains, urine output amount, and appearance</p>
              </div>

              <div className="form-body-pad">
                {errors.general && <div className="field-error-box">{errors.general}</div>}

                <div className="form-field mb-md">
                  <label className="field-label">Recording Time Interval</label>
                  <select
                    value={fluidForm.interval}
                    onChange={(e) => setFluidForm({ ...fluidForm, interval: e.target.value })}
                    className="input-select"
                  >
                    <option value="Current 1-Hour Shift Interval">Current 1-Hour Shift Interval</option>
                    <option value="Current 2-Hour Shift Interval">Current 2-Hour Shift Interval</option>
                    <option value="Current 4-Hour Shift Interval">Current 4-Hour Shift Interval</option>
                    <option value="Current 8-Hour Shift Interval">Current 8-Hour Shift Interval</option>
                    <option value="24-Hour Cumulative Total">24-Hour Cumulative Total</option>
                  </select>
                </div>

                {/* Intake Sub-section */}
                <div className="fluid-sub-block">
                  <h4 className="sub-block-title text-teal">FLUID INTAKE</h4>
                  <div className="form-row-3">
                    <div className="form-field">
                      <label className="field-label">Oral / NG Feed (mL)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={fluidForm.oralIntake}
                        onChange={(e) => setFluidForm({ ...fluidForm, oralIntake: e.target.value })}
                        className="input-text"
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">IV Fluids / Infusions (mL)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={fluidForm.ivIntake}
                        onChange={(e) => setFluidForm({ ...fluidForm, ivIntake: e.target.value })}
                        className="input-text"
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">Blood / Other Intake (mL)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={fluidForm.otherIntake}
                        onChange={(e) => setFluidForm({ ...fluidForm, otherIntake: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>
                </div>

                {/* Output Sub-section */}
                <div className="fluid-sub-block mt-md">
                  <h4 className="sub-block-title text-amber">FLUID OUTPUT & URINE</h4>
                  <div className="form-row-2">
                    <div className="form-field">
                      <label className="field-label">Urine Output Amount (mL)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={fluidForm.urineOutput}
                        onChange={(e) => setFluidForm({ ...fluidForm, urineOutput: e.target.value })}
                        className="input-text"
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label">Drains / NG Aspirate / Stool (mL)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={fluidForm.otherOutput}
                        onChange={(e) => setFluidForm({ ...fluidForm, otherOutput: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>

                  <div className="form-row-2 mt-md">
                    <div className="form-field">
                      <label className="field-label">Urine Appearance</label>
                      <select
                        value={fluidForm.urineAppearance}
                        onChange={(e) => setFluidForm({ ...fluidForm, urineAppearance: e.target.value })}
                        className="input-select"
                      >
                        <option value="Clear Amber">Clear Amber (Normal)</option>
                        <option value="Clear Straw / Pale">Clear Straw / Pale</option>
                        <option value="Dark Amber / Concentrated">Dark Amber / Concentrated</option>
                        <option value="Cloudy / Turbid">Cloudy / Turbid</option>
                        <option value="Hematuria / Blood-tinged">Hematuria / Blood-tinged</option>
                        <option value="Sediments Present">Sediments Present</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="field-label">Catheter / Voiding Method</label>
                      <input
                        type="text"
                        placeholder="e.g. Foley Catheter 14Fr with Urometer"
                        value={fluidForm.catheterStatus}
                        onChange={(e) => setFluidForm({ ...fluidForm, catheterStatus: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated Balance Banner */}
                <div className="fluid-calc-summary-banner mt-md flex-between">
                  <div className="calc-item">
                    <span className="c-label">Total Intake:</span>
                    <span className="c-val">{fluidCalculation.totalIn} mL</span>
                  </div>
                  <div className="calc-item">
                    <span className="c-label">Total Output:</span>
                    <span className="c-val">{fluidCalculation.totalOut} mL</span>
                  </div>
                  <div className="calc-item highlight">
                    <span className="c-label">Net Fluid Balance (Calculated):</span>
                    <span className={`c-val-balance ${fluidCalculation.net >= 0 ? 'pos' : 'neg'}`}>
                      {fluidCalculation.net >= 0 ? `+${fluidCalculation.net}` : fluidCalculation.net} mL
                    </span>
                  </div>
                </div>

                <div className="form-field mt-md">
                  <label className="field-label">Fluid Balance Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Diuresis response adequate, drain fluid serosanguinous..."
                    value={fluidForm.notes}
                    onChange={(e) => setFluidForm({ ...fluidForm, notes: e.target.value })}
                    className="input-text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Laboratory & ABG Results */}
          {activeTab === 'labs' && (
            <div className="dashboard-card form-box">
              <div className="card-header-simple">
                <h3 className="section-title">Section 6: Laboratory & Arterial Blood Gas (ABG) Entry</h3>
                <p className="section-subtitle">Capture diagnostic laboratory panels not already imported via hospital integration</p>
              </div>

              <div className="form-body-pad">
                {errors.general && <div className="field-error-box">{errors.general}</div>}

                <div className="form-row-2 mb-md">
                  <div className="form-field">
                    <label className="field-label required">Panel / Test Name</label>
                    <select
                      value={labForm.panel}
                      onChange={(e) => setLabForm({ ...labForm, panel: e.target.value })}
                      className="input-select"
                    >
                      <option value="Arterial Blood Gas (ABG)">Arterial Blood Gas (ABG)</option>
                      <option value="Renal & Chemistry Panel">Renal & Chemistry Panel</option>
                      <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                      <option value="Cardiac Biomarkers & Lactate">Cardiac Biomarkers & Lactate</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Sample Collection Time</label>
                    <input
                      type="time"
                      value={labForm.collectionTime}
                      onChange={(e) => setLabForm({ ...labForm, collectionTime: e.target.value })}
                      className="input-text"
                    />
                  </div>
                </div>

                {/* ABG Parameters */}
                <div className="fluid-sub-block">
                  <h4 className="sub-block-title text-rose">ARTERIAL BLOOD GAS (ABG) & NURSE LABS</h4>
                  <div className="form-row-4">
                    <div className="form-field">
                      <label className="field-label">FiO₂ (Inspired O₂ Fraction)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.21"
                        max="1.00"
                        placeholder="0.21 (Room air) - 1.00"
                        value={labForm.fio2}
                        onChange={(e) => setLabForm({ ...labForm, fio2: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Arterial pH</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="7.38 (Ref 7.35-7.45)"
                        value={labForm.ph}
                        onChange={(e) => setLabForm({ ...labForm, ph: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">PaCO₂ (mmHg)</label>
                      <input
                        type="number"
                        placeholder="40 (Ref 35-45)"
                        value={labForm.paco2}
                        onChange={(e) => setLabForm({ ...labForm, paco2: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Serum Lactate (mmol/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="1.2 (Ref < 2.0)"
                        value={labForm.lactate}
                        onChange={(e) => setLabForm({ ...labForm, lactate: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>

                  <div className="form-row-2 mt-md">
                    <div className="form-field">
                      <label className="field-label">HCO₃⁻ Bicarbonate (mEq/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="24.0 (Ref 22-26)"
                        value={labForm.hco3}
                        onChange={(e) => setLabForm({ ...labForm, hco3: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Serum Lactate (mmol/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="1.2 (Ref < 2.0)"
                        value={labForm.lactate}
                        onChange={(e) => setLabForm({ ...labForm, lactate: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>
                </div>

                {/* Hematology & Chemistry */}
                <div className="fluid-sub-block mt-md">
                  <h4 className="sub-block-title text-blue">HEMATOLOGY & CHEMISTRY</h4>
                  <div className="form-row-3">
                    <div className="form-field">
                      <label className="field-label">Hemoglobin (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="13.5 (Ref 12-15.5)"
                        value={labForm.hb}
                        onChange={(e) => setLabForm({ ...labForm, hb: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">WBC Count (×10³/µL)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="8.5 (Ref 4.5-11)"
                        value={labForm.wbc}
                        onChange={(e) => setLabForm({ ...labForm, wbc: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Platelets (×10³/µL)</label>
                      <input
                        type="number"
                        placeholder="250 (Ref 150-450)"
                        value={labForm.platelets}
                        onChange={(e) => setLabForm({ ...labForm, platelets: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>

                  <div className="form-row-3 mt-md">
                    <div className="form-field">
                      <label className="field-label">Serum Creatinine (mg/dL)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.9 (Ref 0.6-1.2)"
                        value={labForm.creatinine}
                        onChange={(e) => setLabForm({ ...labForm, creatinine: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Potassium K⁺ (mEq/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="4.2 (Ref 3.5-5.0)"
                        value={labForm.potassium}
                        onChange={(e) => setLabForm({ ...labForm, potassium: e.target.value })}
                        className="input-text"
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Blood Glucose (mg/dL)</label>
                      <input
                        type="number"
                        placeholder="110 (Ref 70-140)"
                        value={labForm.glucose}
                        onChange={(e) => setLabForm({ ...labForm, glucose: e.target.value })}
                        className="input-text"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field mt-md">
                  <label className="field-label">Laboratory Interpretation & Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Mild respiratory acidosis, improving lactate clearance..."
                    value={labForm.notes}
                    onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                    className="input-text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Spot Vitals (Optional) */}
          {activeTab === 'vitals' && (
            <div className="dashboard-card form-box">
              <div className="card-header-simple">
                <h3 className="section-title">Section 7: Manual Spot Vital Signs (Optional)</h3>
                <p className="section-subtitle">For manual blood pressure cuff readings, manual pulse, or thermometer checks</p>
              </div>

              <div className="form-body-pad">
                {errors.general && <div className="field-error-box">{errors.general}</div>}

                <div className="form-row-3">
                  <div className="form-field">
                    <label className="field-label">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 76"
                      value={vitalsForm.hr}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, hr: e.target.value })}
                      className="input-text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 120"
                      value={vitalsForm.bpSys}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, bpSys: e.target.value })}
                      className="input-text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      value={vitalsForm.bpDia}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, bpDia: e.target.value })}
                      className="input-text"
                    />
                  </div>
                </div>

                <div className="form-row-3 mt-md">
                  <div className="form-field">
                    <label className="field-label">SpO₂ (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 98"
                      value={vitalsForm.spo2}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                      className="input-text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Respiratory Rate (/min)</label>
                    <input
                      type="number"
                      placeholder="e.g. 16"
                      value={vitalsForm.rr}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, rr: e.target.value })}
                      className="input-text"
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 37.0"
                      value={vitalsForm.temp}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                      className="input-text"
                    />
                  </div>
                </div>

                <div className="form-field mt-md">
                  <label className="field-label">Measurement Context Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Manual blood pressure cuff reading taken after repositioning..."
                    value={vitalsForm.notes}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                    className="input-text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Toolbar */}
          <div className="form-toolbar flex-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetCurrent}
              disabled={isSubmitting}
            >
              <RotateCcw size={15} />
              <span>Reset Section</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span>
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Clinical Record</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sidebar: Recent Charted Logs for Selected Patient */}
        <aside className="recent-records-side">
          <div className="dashboard-card preview-card">
            <div className="card-header-simple flex-between">
              <div>
                <h4 className="section-title">Recent Charted Entries</h4>
                <p className="section-subtitle">{selectedPatient?.name} ({selectedPatient?.bedNumber})</p>
              </div>
              <span className="count-pill">{recentItems.length}</span>
            </div>

            <div className="preview-items-body">
              {recentItems.length === 0 ? (
                <div className="empty-preview-state">
                  <FileText size={24} className="text-muted" />
                  <p>No recent {activeTab} charted.</p>
                </div>
              ) : (
                recentItems.map((it, idx) => (
                  <div key={it.id || idx} className="preview-item-card">
                    <div className="p-item-head flex-between">
                      <span className="p-title font-bold">
                        {it.type || it.medicationName || it.panel || it.interval || 'Clinical Entry'}
                      </span>
                      <span className="p-time font-mono">{it.time || it.collectionTime}</span>
                    </div>

                    {it.administeredDose && (
                      <div className="p-chip-row">
                        <span className="mini-chip">Dose: {it.administeredDose} {it.doseUnit}</span>
                        <span className="mini-chip">{it.route}</span>
                      </div>
                    )}

                    {it.totalIntake !== undefined && (
                      <div className="p-chip-row">
                        <span className="mini-chip">In: {it.totalIntake} mL</span>
                        <span className="mini-chip">Out: {it.totalOutput} mL</span>
                        <span className={`mini-chip ${it.netBalance >= 0 ? 'pos' : 'neg'}`}>
                          Bal: {it.netBalance >= 0 ? `+${it.netBalance}` : it.netBalance} mL
                        </span>
                      </div>
                    )}

                    {it.findings && (
                      <p className="p-findings">"{it.findings}"</p>
                    )}

                    {it.values && (
                      <div className="p-lab-chips">
                        {Object.entries(it.values).map(([k, v]) => (
                          <span key={k} className="mini-lab-chip">{k.toUpperCase()}: {v.val}</span>
                        ))}
                      </div>
                    )}

                    <div className="p-item-foot">
                      <small>Recorded by: {it.author || it.staff}</small>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="preview-footer">
              <button
                type="button"
                className="btn btn-outline btn-block text-center"
                onClick={() => setActivePage('dashboard')}
              >
                <span>View on Monitoring Dashboard</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => setIsAddPatientOpen(false)} 
      />
    </div>
  );
};
