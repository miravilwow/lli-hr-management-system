const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { app, request, api, closePool, CREDENTIALS } = require('./helpers');

after(async () => {
  await closePool();
});

describe('POST /api/auth/login', () => {
  test('returns a token and the user for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send(CREDENTIALS);

    assert.equal(res.status, 200);
    assert.ok(res.body.token, 'expected a token');
    assert.equal(res.body.user.username, 'admin');
  });

  test('never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send(CREDENTIALS);

    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('PasswordHash'), 'response leaked the hash field');
    assert.ok(!body.includes('$2b$'), 'response leaked a bcrypt hash');
  });

  test('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'not-the-password' });

    assert.equal(res.status, 401);
    assert.ok(!res.body.token);
  });

  test('gives the same message for an unknown user as for a wrong password', async () => {
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ username: 'does-not-exist', password: 'whatever' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });

    // Differing messages would let an attacker enumerate valid usernames.
    assert.equal(unknownUser.status, 401);
    assert.equal(unknownUser.body.message, wrongPassword.body.message);
  });

  test('rejects a missing password with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });

    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Validation failed');
  });
});

describe('GET /api/auth/me', () => {
  test('returns the current user for a valid token', async () => {
    const res = await api('get', '/api/auth/me');

    assert.equal(res.status, 200);
    assert.equal(res.body.username, 'admin');
  });

  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('rejects a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    assert.equal(res.status, 401);
  });

  test('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({ sub: 1, username: 'admin' }, 'attacker-chosen-secret');

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

    assert.equal(res.status, 401);
  });

  test('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 1, username: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '-1s',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);

    assert.equal(res.status, 401);
    assert.match(res.body.message, /expired/i);
  });

  test('rejects a token for a user that no longer exists', async () => {
    const ghost = jwt.sign({ sub: 999999, username: 'ghost' }, process.env.JWT_SECRET);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ghost}`);

    assert.equal(res.status, 401);
  });
});

describe('route protection', () => {
  const protectedRoutes = [
    ['get', '/api/employees'],
    ['get', '/api/employees/1'],
    ['post', '/api/employees'],
    ['put', '/api/employees/1'],
    ['delete', '/api/employees/1'],
    ['get', '/api/departments'],
    ['get', '/api/reports/employees'],
    ['get', '/api/reports/employees/export'],
  ];

  for (const [method, url] of protectedRoutes) {
    test(`${method.toUpperCase()} ${url} requires a token`, async () => {
      const res = await request(app)[method](url);
      assert.equal(res.status, 401);
    });
  }
});

describe('baseline hardening', () => {
  test('health endpoint is reachable without a token', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

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
