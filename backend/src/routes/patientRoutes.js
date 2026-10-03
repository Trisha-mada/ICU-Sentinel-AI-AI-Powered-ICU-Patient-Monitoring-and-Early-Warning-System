const express = require('express');
const router = express.Router();

const {
  getNextPatientId,
  getBedStatuses,
  getAllPatients,
  getPatientHistory,
  getPatientById,
  createPatient,
  getPatientAdmissions,
  createPatientAdmission,
  dischargePatient
} = require('../controllers/patientController');

const {
  getPatientVitals,
  recordVitalObservation
} = require('../controllers/vitalsController');

const {
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
} = require('../controllers/clinicalDataController');

// 1. Specific static sub-paths (MUST be declared before /:id)
router.get('/next-id', getNextPatientId);
router.get('/beds/status', getBedStatuses);
router.get('/history', getPatientHistory);

// 2. Patient Roster & Admissions
router.get('/', getAllPatients);
router.post('/', createPatient);

// 3. Single Patient & Admissions
router.get('/:id', getPatientById);
router.get('/:id/admissions', getPatientAdmissions);
router.post('/:id/admissions', createPatientAdmission);
router.post('/:id/discharge', dischargePatient);

// 4. Telemetry Snapshots
router.get('/:id/vitals', getPatientVitals);
router.post('/:id/vitals', recordVitalObservation);

// 5. Manual Lab Records (manual_lab_records)
router.get('/:id/labs', getPatientLabs);
router.post('/:id/labs', createPatientLab);

// 6. Deterioration Alerts (deterioration_alerts)
router.get('/:id/alerts', getPatientAlerts);

// 7. Clinical Notes, MAR & Fluids
router.get('/:id/notes', getPatientNotes);
router.post('/:id/notes', createPatientNote);
router.get('/:id/medications', getPatientMedications);
router.post('/:id/medications', createPatientMedication);
router.get('/:id/fluids', getPatientFluids);
router.post('/:id/fluids', createPatientFluid);

module.exports = router;
