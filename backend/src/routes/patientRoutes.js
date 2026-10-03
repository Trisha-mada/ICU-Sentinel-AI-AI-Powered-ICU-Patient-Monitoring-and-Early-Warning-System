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
  getPatientNotes,
  createPatientNote,
  getPatientMedications,
  createPatientMedication,
  getPatientFluids,
  createPatientFluid,
  getPatientLabs,
  createPatientLab
} = require('../controllers/clinicalDataController');

// 1. Specific static sub-paths (MUST be declared before /:id)
router.get('/next-id', getNextPatientId);
router.get('/beds/status', getBedStatuses);
router.get('/history', getPatientHistory);

// 2. Patient Demographics & Admissions
router.get('/', getAllPatients);
router.post('/', createPatient);

// 3. Single Patient by ID & Admissions
router.get('/:id', getPatientById);
router.get('/:id/admissions', getPatientAdmissions);
router.post('/:id/admissions', createPatientAdmission);
router.post('/:id/discharge', dischargePatient);

// 4. Patient Vitals & Telemetry
router.get('/:id/vitals', getPatientVitals);
router.post('/:id/vitals', recordVitalObservation);

// 5. Clinical Notes
router.get('/:id/notes', getPatientNotes);
router.post('/:id/notes', createPatientNote);

// 6. Medication Administration Records (MAR)
router.get('/:id/medications', getPatientMedications);
router.post('/:id/medications', createPatientMedication);

// 7. Fluid Intake & Output
router.get('/:id/fluids', getPatientFluids);
router.post('/:id/fluids', createPatientFluid);

// 8. Laboratory Results
router.get('/:id/labs', getPatientLabs);
router.post('/:id/labs', createPatientLab);

module.exports = router;
