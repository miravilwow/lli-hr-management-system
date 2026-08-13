#!/usr/bin/env node
/**
 * Applies a .sql file to MSSQL, splitting on GO batch separators (which
 * the mssql driver does not understand on its own).
 *
 *   node scripts/run-sql.js db/01_schema.sql master
 *   node scripts/run-sql.js db/04_governance.sql LLI_HR_DB
 *
 * Credentials come from server/.env, but the schema scripts need rights
 * the application account deliberately does not have - it cannot create
 * or alter tables by design. Set DB_ADMIN_USER / DB_ADMIN_PASSWORD to
 * run migrations as an administrator; they fall back to DB_USER /
 * DB_PASSWORD when unset, which is what CI uses.
 */
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', 'server');

require(path.join(SERVER_DIR, 'node_modules', 'dotenv')).config({
  path: path.join(SERVER_DIR, '.env'),
  quiet: true,
});

const sql = require(path.join(SERVER_DIR, 'node_modules', 'mssql'));

const [, , file, database = 'master'] = process.argv;

if (!file) {
  console.error('usage: node scripts/run-sql.js <path-to-sql-file> [database]');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`no such file: ${file}`);
  process.exit(1);
}

const user = process.env.DB_ADMIN_USER || process.env.DB_USER;
const password = process.env.DB_ADMIN_PASSWORD || process.env.DB_PASSWORD;

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database,
  user,
  password,
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 60000,
};

/** SQL Server can accept connections slightly after it reports healthy. */
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
  console.log(`connected to ${config.server}:${config.port}/${database} as ${user}`);

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
      console.error(`\nbatch ${index + 1} of ${path.basename(file)} failed:`);
      console.error(`  ${err.message}`);

      if (/permission|does not exist or you do not have permissions/i.test(err.message)) {
        console.error(
          '\n  This script alters the schema, which the application account cannot do.\n' +
            '  Set DB_ADMIN_USER and DB_ADMIN_PASSWORD to an administrator and retry.'
        );
      }

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
