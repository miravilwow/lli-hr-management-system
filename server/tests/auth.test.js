const { test, describe, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { app, request, api, closePool, CREDENTIALS } = require('./helpers');

after(async () => {
  await closePool();
});

describe('POST /api/v1/auth/login', () => {
  test('returns a token and the user for valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(CREDENTIALS);

    assert.equal(res.status, 200);
    assert.ok(res.body.token, 'expected a token');
    assert.equal(res.body.user.username, 'admin');
  });

  test('never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(CREDENTIALS);

    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('PasswordHash'), 'response leaked the hash field');
    assert.ok(!body.includes('$2b$'), 'response leaked a bcrypt hash');
  });

  test('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'not-the-password' });

    assert.equal(res.status, 401);
    assert.ok(!res.body.token);
  });

  test('gives the same message for an unknown user as for a wrong password', async () => {
    const unknownUser = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'does-not-exist', password: 'whatever' });

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong' });

    // Differing messages would let an attacker enumerate valid usernames.
    assert.equal(unknownUser.status, 401);
    assert.equal(unknownUser.body.message, wrongPassword.body.message);
  });

  test('rejects a missing password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin' });

    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Validation failed');
  });
});

describe('GET /api/v1/auth/me', () => {
  test('returns the current user for a valid token', async () => {
    const res = await api('get', '/api/v1/auth/me');

    assert.equal(res.status, 200);
    assert.equal(res.body.username, 'admin');
  });

  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
  });

  test('rejects a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    assert.equal(res.status, 401);
  });

  test('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({ sub: 1, username: 'admin' }, 'attacker-chosen-secret');

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${forged}`);

    assert.equal(res.status, 401);
  });

  test('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 1, username: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '-1s',
    });

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);

    assert.equal(res.status, 401);
    assert.match(res.body.message, /expired/i);
  });

  // Regression: a token from before roles existed was silently treated as
  // a Viewer. /auth/me reported the real role from the database, so the UI
  // showed the write controls while every write came back 403.
  test('rejects a token with no role claim rather than downgrading it', async () => {
    const legacy = jwt.sign({ sub: 1, username: 'admin' }, process.env.JWT_SECRET);

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${legacy}`);

    assert.equal(res.status, 401);
    assert.match(res.body.message, /sign in again/i);
  });

  test('a role-less token cannot reach a write route either', async () => {
    const legacy = jwt.sign({ sub: 1, username: 'admin' }, process.env.JWT_SECRET);

    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${legacy}`)
      .send({});

    // 401 (sign in again), not 403 (you lack permission) - the session is
    // unusable, which is a different problem from lacking a permission.
    assert.equal(res.status, 401);
  });

  test('rejects a token for a user that no longer exists', async () => {
    const ghost = jwt.sign({ sub: 999999, username: 'ghost' }, process.env.JWT_SECRET);

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${ghost}`);

    assert.equal(res.status, 401);
  });
});

describe('route protection', () => {
  const protectedRoutes = [
    ['get', '/api/v1/employees'],
    ['get', '/api/v1/employees/1'],
    ['post', '/api/v1/employees'],
    ['put', '/api/v1/employees/1'],
    ['delete', '/api/v1/employees/1'],
    ['get', '/api/v1/departments'],
    ['get', '/api/v1/reports/employees'],
    ['get', '/api/v1/reports/employees/export'],
  ];

  for (const [method, url] of protectedRoutes) {
    test(`${method.toUpperCase()} ${url} requires a token`, async () => {
      const res = await request(app)[method](url);
      assert.equal(res.status, 401);
    });
  }
});

describe('health checks', () => {
  test('liveness is reachable without a token', async () => {
    const res = await request(app).get('/api/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  // Regression: readiness used to return a static object, reporting
  // healthy while the database was unreachable.
  test('readiness actually queries the database', async () => {
    const res = await request(app).get('/api/health/ready');

    assert.equal(res.status, 200);
    assert.equal(res.body.database.status, 'up');
    assert.equal(typeof res.body.database.latencyMs, 'number');
  });

  test('the default health route is the readiness check', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.ok(res.body.database, 'expected the default route to prove the database');
  });

  test('health sits outside the version prefix', async () => {
    const versioned = await request(app).get('/api/v1/health');
    assert.equal(versioned.status, 404);
  });

  // The point of the fix: a dead database must not read as healthy.
  test('readiness reports 503 when the database is unreachable', async () => {
    const db = require('../src/config/db');

    const stub = mock.method(db, 'getPool', () =>
      Promise.reject(new Error('connection refused'))
    );

    try {
      const res = await request(app).get('/api/health/ready');

      assert.equal(res.status, 503);
      assert.equal(res.body.status, 'unavailable');
      assert.equal(res.body.database.status, 'down');
    } finally {
      stub.mock.restore();
    }
  });

  test('liveness still succeeds when the database is unreachable', async () => {
    const db = require('../src/config/db');

    const stub = mock.method(db, 'getPool', () =>
      Promise.reject(new Error('connection refused'))
    );

    try {
      // A failing dependency should not make an orchestrator restart the
      // process, so liveness deliberately ignores the database.
      const res = await request(app).get('/api/health/live');
      assert.equal(res.status, 200);
    } finally {
      stub.mock.restore();
    }
  });
});

describe('baseline hardening', () => {

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-powered-by'], undefined, 'x-powered-by should be removed');
  });

  test('unknown routes return a 404 in the standard shape', async () => {
    const res = await request(app).get('/api/does-not-exist');

    assert.equal(res.status, 404);
    assert.ok(res.body.message);
  });
});
