require('dotenv').config();

const { assertEnv } = require('./src/config/env');

assertEnv();

const app = require('./src/app');
const { getPool, closePool } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await getPool();
  } catch (err) {
    console.error('[startup] could not connect to MSSQL:', err.message);
    console.error('[startup] check server/.env, and that SQL Server has TCP/IP enabled on the configured port.');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
