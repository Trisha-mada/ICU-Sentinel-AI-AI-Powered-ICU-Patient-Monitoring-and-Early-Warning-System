const app = require('./app');
const { pool, isConfigured } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Test PostgreSQL connection securely at startup
async function testDatabaseConnection() {
  if (!isConfigured) {
    console.log('[Database] Notice: DATABASE_URL is not configured or contains placeholder. Database connection skipped.');
    console.log('[Database] Paste your Neon PostgreSQL connection string into backend/.env when ready.');
    return;
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time');
    client.release();
    console.log('[Database] Successfully connected to Neon PostgreSQL at:', result.rows[0].current_time);
  } catch (err) {
    console.error(`[Database] Warning: Could not establish connection to PostgreSQL (${err.message}). Verify DATABASE_URL in backend/.env.`);
  }
}

// Start server
const server = app.listen(PORT, async () => {
  console.log(`[Server] ICU Sentinel Backend listening on port ${PORT}`);
  await testDatabaseConnection();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing HTTP server and database pool...');
  server.close(() => {
    pool.end();
    console.log('[Server] Server and database pool closed.');
  });
});

module.exports = server;
