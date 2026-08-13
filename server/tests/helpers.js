const path = require('path');

// Load .env before anything reads process.env, and mark the process as a
// test run so rate limiting and request logging step aside.
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
process.env.NODE_ENV = 'test';

const request = require('supertest');

const app = require('../src/app');
const { closePool } = require('../src/config/db');

const CREDENTIALS = { username: 'admin', password: 'admin123' };

let cachedToken = null;

/** Logs in once and reuses the token across tests in the same file. */
async function getToken() {
  if (cachedToken) return cachedToken;

  const res = await request(app).post('/api/v1/auth/login').send(CREDENTIALS);

  if (res.status !== 200) {
    throw new Error(
      `login failed (${res.status}). Is the database seeded? Run db/02_seed.sql. Body: ${JSON.stringify(res.body)}`
    );
  }

  cachedToken = res.body.token;
  return cachedToken;
}

/**
 * Authenticated request helper.
 *
 * Note this awaits the token first and only then builds and sends the
 * supertest request. A supertest `Test` is itself thenable, so returning
 * one from an async function would fire it on the first `await` - before
 * a body could be attached.
 */
async function api(method, url, body) {
  const token = await getToken();
  const req = request(app)[method](url).set('Authorization', `Bearer ${token}`);

  return body === undefined ? req : req.send(body);
}

/**
 * A valid employee payload. Each call uses a unique code and email so
 * tests can run repeatedly without tripping the unique constraints.
 */
function buildEmployee(overrides = {}) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);

  return {
    employeeCode: `T-${unique}`,
    firstName: 'Test',
    lastName: 'Subject',
    email: `test.${unique}@example.com`,
    departmentId: 1,
    position: 'Test Engineer',
    salary: 50000,
    hireDate: '2024-01-15',
    status: 'Active',
    ...overrides,
  };
}

// Fixtures are prefixed so they can be told apart from real data and
// removed wholesale, whatever a test did to them along the way.
const FIXTURE_PREFIX = 'T-';

/**
 * Removes a record created during a test.
 *
 * Deliberately not the DELETE endpoint: that is a soft delete, so calling
 * it left the row behind and fixtures accumulated in the database run
 * after run. Teardown deletes for real.
 */
async function cleanup(employeeId) {
  if (!employeeId) return;

  const { sql, getPool } = require('../src/config/db');
  const pool = await getPool();

  // Only the employee row. The application account is denied DELETE on
  // EmployeeAudit by design - a change history it can erase is not
  // evidence - so the audit rows are deliberately left behind. They are
  // unreachable once the employee is gone, since the history endpoint
  // checks the employee exists first.
  await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .query('DELETE FROM dbo.Employees WHERE EmployeeId = @employeeId');
}

/**
 * Removes every fixture this suite has ever created, including ones from
 * a run that failed partway and never reached its own cleanup.
 */
async function purgeFixtures() {
  const { getPool } = require('../src/config/db');
  const pool = await getPool();

  await pool
    .request()
    .query(`DELETE FROM dbo.Employees WHERE EmployeeCode LIKE '${FIXTURE_PREFIX}%'`);
}

module.exports = {
  app,
  request,
  api,
  getToken,
  buildEmployee,
  cleanup,
  purgeFixtures,
  closePool,
  CREDENTIALS,
};
