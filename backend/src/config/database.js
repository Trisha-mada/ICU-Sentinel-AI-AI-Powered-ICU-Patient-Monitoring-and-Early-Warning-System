const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

// Determine if connection string is valid and not a placeholder
const isConfigured = connectionString && 
  !connectionString.includes('PASTE_YOUR_NEON_CONNECTION_STRING_HERE') && 
  !connectionString.includes('USER:PASSWORD@HOST');

// Configure PostgreSQL connection pool with SSL for Neon PostgreSQL
const pool = new Pool({
  connectionString: isConfigured ? connectionString : undefined,
  ssl: isConfigured ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000
});

module.exports = {
  pool,
  isConfigured
};
