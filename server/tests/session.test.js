const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { app, request, purgeFixtures, closePool, CREDENTIALS } = require('./helpers');

after(async () => {
  await purgeFixtures();
  await closePool();
});

function signIn() {
  return request(app).post('/api/v1/auth/login').send(CREDENTIALS);
}

describe('F-06 short lived access tokens', () => {
  test('login returns an access token and a refresh token', async () => {
    const res = await signIn();

    assert.equal(res.status, 200);
    assert.ok(res.body.token, 'expected an access token');
    assert.ok(res.body.refreshToken, 'expected a refresh token');
    assert.equal(res.body.expiresIn, '15m');
  });

  test('the access token is short lived, not the old eight hours', async () => {
    const res = await signIn();
    const { exp, iat } = jwt.decode(res.body.token);

    const lifetimeMinutes = (exp - iat) / 60;
    assert.equal(lifetimeMinutes, 15);
  });

  test('the refresh token is opaque, not a readable JWT', async () => {
    const res = await signIn();

    // A refresh token carries no claims, so nothing leaks if it is read.
    assert.equal(jwt.decode(res.body.refreshToken), null);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  test('exchanges a refresh token for a working access token', async () => {
    const session = await signIn();

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.body.refreshToken });

    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.body.token);
    assert.equal(refreshed.body.user.username, 'admin');

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.token}`);

    assert.equal(me.status, 200);
  });

  test('rotates the refresh token, so each one is single use', async () => {
    const session = await signIn();
    const original = session.body.refreshToken;

    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    assert.equal(first.status, 200);
    assert.notEqual(first.body.refreshToken, original);

    // Replaying the consumed token must fail - that is what limits the
    // value of a stolen one.
    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    assert.equal(replay.status, 401);
  });

  test('the rotated token itself works', async () => {
    const session = await signIn();

    const first = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.body.refreshToken });

    const second = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.body.refreshToken });

    assert.equal(second.status, 200);
  });

  test('rejects an unknown refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-real-refresh-token' });

    assert.equal(res.status, 401);
  });

  test('rejects a missing refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    assert.equal(res.status, 400);
  });
});

describe('POST /api/v1/auth/logout', () => {
  // Regression: signing out used to only clear the browser, leaving the
  // token valid for the rest of its lifetime with no way to end it.
  test('revokes the session server-side', async () => {
    const session = await signIn();

    const out = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: session.body.refreshToken });

    assert.equal(out.status, 204);

    const afterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.body.refreshToken });

    assert.equal(afterLogout.status, 401, 'the refresh token should be dead');
  });

  test('is idempotent', async () => {
    const session = await signIn();

    const first = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: session.body.refreshToken });
    const second = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: session.body.refreshToken });

    assert.equal(first.status, 204);
    assert.equal(second.status, 204);
  });

  test('signing out of one session leaves another alone', async () => {
    const sessionA = await signIn();
    const sessionB = await signIn();

    await request(app).post('/api/v1/auth/logout').send({ refreshToken: sessionA.body.refreshToken });

    const stillValid = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessionB.body.refreshToken });

    assert.equal(stillValid.status, 200);
  });
});
