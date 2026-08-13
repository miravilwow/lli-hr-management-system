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

/** Removes a record created during a test, ignoring an already-deleted row. */
async function cleanup(employeeId) {
  if (!employeeId) return;
  await api('delete', `/api/v1/employees/${employeeId}`);
}

module.exports = { app, request, api, getToken, buildEmployee, cleanup, closePool, CREDENTIALS };
