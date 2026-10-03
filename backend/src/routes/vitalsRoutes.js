const express = require('express');
const router = express.Router();
const { recordVitalObservation } = require('../controllers/vitalsController');

// Direct vital observation recording with patientId in body
router.post('/', (req, res, next) => {
  const patientId = req.body.patient_id || req.body.patientId;
  if (!patientId) {
    return res.status(400).json({
      error: true,
      message: 'Patient ID is required to record a vital observation.'
    });
  }
  req.params.id = patientId;
  return recordVitalObservation(req, res, next);
});

module.exports = router;
