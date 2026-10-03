const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { isConfigured } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const patientRoutes = require('./routes/patientRoutes');
const vitalsRoutes = require('./routes/vitalsRoutes');
const { getBedStatuses, dischargePatient } = require('./controllers/patientController');
const { getAllAlerts, acknowledgeAlert } = require('./controllers/clinicalDataController');

const app = express();

// Request body JSON parsing middleware
app.use(express.json());

// Configure CORS to support all local development ports and configured FRONTEND_URL
const allowedOriginEnv = process.env.FRONTEND_URL;
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (no origin header, e.g. curl, tests, server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow explicit FRONTEND_URL if specified
    if (allowedOriginEnv && origin === allowedOriginEnv) {
      return callback(null, true);
    }

    // Allow all localhost and 127.0.0.1 ports for development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Permissive fallback for development environments
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
app.get('/api/beds/status', getBedStatuses);
app.post('/api/admissions/:id/discharge', dischargePatient);

// Alerts endpoints
app.get('/api/alerts', getAllAlerts);
app.post('/api/alerts/:id/acknowledge', acknowledgeAlert);

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
