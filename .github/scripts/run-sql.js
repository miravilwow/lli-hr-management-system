/**
 * Executes a .sql file against MSSQL, splitting on GO batch separators
 * (which the mssql driver does not understand on its own).
 *
 * Used by CI to build and seed the database before the API tests run.
 *
 *   node .github/scripts/run-sql.js db/01_schema.sql master
 */
const fs = require('fs');
const path = require('path');

const sql = require(path.join(__dirname, '..', '..', 'server', 'node_modules', 'mssql'));

const [, , file, database = 'master'] = process.argv;

if (!file) {
  console.error('usage: run-sql.js <path-to-sql-file> [database]');
  process.exit(1);
}

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 60000,
};

/** SQL Server can accept connections a little after the container is healthy. */
async function connectWithRetry(attempts = 10) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await new sql.ConnectionPool(config).connect();
    } catch (err) {
      if (attempt === attempts) throw err;
      console.log(`connection attempt ${attempt} failed (${err.message}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  return null;
}

(async () => {
  const pool = await connectWithRetry();
  console.log(`connected to ${config.server}:${config.port}/${database}`);

  const batches = fs
    .readFileSync(file, 'utf8')
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);

  for (const [index, batch] of batches.entries()) {
    try {
      const result = await pool.request().batch(batch);
      if (result.recordset) console.table(result.recordset);
    } catch (err) {
      console.error(`batch ${index + 1} of ${path.basename(file)} failed: ${err.message}`);
      await pool.close();
      process.exit(1);
    }
  }

  console.log(`${path.basename(file)}: ${batches.length} batches executed`);
  await pool.close();
})().catch((err) => {
  console.error('failed:', err.message);
  process.exit(1);
});
