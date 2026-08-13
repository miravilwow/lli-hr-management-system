const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { validateEnv, REQUIRED } = require('../src/config/env');

const REPO_ROOT = path.join(__dirname, '..', '..');

const BASE_ENV = {
  DB_SERVER: 'localhost',
  DB_PORT: '1433',
  DB_NAME: 'LLI_HR_DB',
  DB_USER: 'lli_hr_app',
  DB_PASSWORD: 'a-real-password',
  JWT_SECRET: 'x'.repeat(48),
};

describe('environment validation', () => {
  test('accepts a fully configured environment', () => {
    assert.deepEqual(validateEnv(BASE_ENV), []);
  });

  for (const key of REQUIRED) {
    test(`reports ${key} when it is missing`, () => {
      const problems = validateEnv({ ...BASE_ENV, [key]: undefined });
      assert.ok(problems.some((p) => p.startsWith(key)), `expected a problem for ${key}`);
    });

    test(`reports ${key} when it is blank`, () => {
      const problems = validateEnv({ ...BASE_ENV, [key]: '   ' });
      assert.ok(problems.some((p) => p.startsWith(key)));
    });
  }

  test('rejects the placeholder values shipped in .env.example', () => {
    const problems = validateEnv({
      ...BASE_ENV,
      DB_PASSWORD: 'your_sa_password_here',
      JWT_SECRET: 'change_this_to_a_long_random_secret',
    });

    assert.ok(problems.some((p) => p.includes('DB_PASSWORD')));
    assert.ok(problems.some((p) => p.includes('JWT_SECRET')));
  });

  test('rejects a short JWT secret', () => {
    const problems = validateEnv({ ...BASE_ENV, JWT_SECRET: 'tooshort' });
    assert.ok(problems.some((p) => p.includes('32 characters')));
  });

  test('rejects a non-numeric DB_PORT', () => {
    const problems = validateEnv({ ...BASE_ENV, DB_PORT: 'abc' });
    assert.ok(problems.some((p) => p.includes('DB_PORT')));
  });
});

/**
 * `.env.example` is committed, so a real credential typed into it by
 * mistake would be published. These assertions fail the build before that
 * can reach a remote.
 */
describe('committed .env.example files contain no real secrets', () => {
  const templates = [
    path.join(REPO_ROOT, 'server', '.env.example'),
    path.join(REPO_ROOT, 'client', '.env.example'),
  ];

  // Values that are safe to see in a template: empty, or an obvious
  // instruction to replace them.
  const PLACEHOLDER =
    /^$|^change|change[_ ]?me|your_|_here|placeholder|example|localhost|^http|the_password_you_set/i;

  const SENSITIVE_KEY = /(PASSWORD|SECRET|TOKEN|APIKEY|API_KEY|CONNECTION_STRING)/i;

  // Durations and counts are configuration, not credentials. Without this
  // a setting like REFRESH_TOKEN_DAYS=7 trips the check purely because
  // its name contains "TOKEN".
  const NOT_A_SECRET = /^\d+\s*(ms|s|m|h|d|days?|hours?|minutes?)?$/i;

  for (const file of templates) {
    test(`${path.relative(REPO_ROOT, file)} has only placeholder values`, () => {
      if (!fs.existsSync(file)) return;

      const offenders = [];

      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=').trim();

        const looksSensitive = SENSITIVE_KEY.test(key);
        const looksSafe = !value || PLACEHOLDER.test(value) || NOT_A_SECRET.test(value);

        if (looksSensitive && !looksSafe) {
          offenders.push(key.trim());
        }
      }

      assert.deepEqual(
        offenders,
        [],
        `${path.basename(file)} appears to contain real values for: ${offenders.join(', ')}. ` +
          'Move them to .env, which is gitignored.'
      );
    });
  }

  test('a real credential in a template is still caught', () => {
    // Guards that have never been seen to fail are not guards.
    const sensitive = (key, value) =>
      SENSITIVE_KEY.test(key) && !(PLACEHOLDER.test(value) || NOT_A_SECRET.test(value));

    assert.equal(sensitive('DB_PASSWORD', 'Miravilwowash05'), true);
    assert.equal(sensitive('JWT_SECRET', 'Assessment2026'), true);

    // ...while genuine configuration is not.
    assert.equal(sensitive('REFRESH_TOKEN_DAYS', '7'), false);
    assert.equal(sensitive('JWT_EXPIRES_IN', '15m'), false);
    assert.equal(sensitive('DB_PASSWORD', 'your_sa_password_here'), false);
  });
});
