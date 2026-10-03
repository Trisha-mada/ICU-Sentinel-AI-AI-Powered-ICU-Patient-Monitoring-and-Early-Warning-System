const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { isConfigured } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const patientRoutes = require('./routes/patientRoutes');
const vitalsRoutes = require('./routes/vitalsRoutes');

const app = express();

// Request body JSON parsing middleware
app.use(express.json());

// Configure CORS with configurable frontend origin
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'icu-sentinel-backend',
    databaseConfigured: !!isConfigured
  });
});

// Direct convenience aliases
const { getBedStatuses, dischargePatient } = require('./controllers/patientController');
app.get('/api/beds/status', getBedStatuses);
app.post('/api/admissions/:id/discharge', dischargePatient);

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/vitals', vitalsRoutes);

// Catch-all 404 handler for unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      error: true,
      message: `API endpoint '${req.originalUrl}' not found.`
    });
  }
  next();
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
