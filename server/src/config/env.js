
const REQUIRED = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

const PLACEHOLDERS = new Set([
  'your_sa_password_here',
  'PASTE_YOUR_SA_PASSWORD_HERE',
  'change_this_to_a_long_random_secret',
]);

function validateEnv(env = process.env) {
  const problems = [];

  for (const key of REQUIRED) {
    const value = (env[key] || '').trim();

    if (!value) {
      problems.push(`${key} is missing or empty`);
    } else if (PLACEHOLDERS.has(value)) {
      problems.push(`${key} still holds the placeholder value from .env.example`);
    }
  }

  const port = Number(env.DB_PORT || 1433);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`DB_PORT must be a valid port number, received "${env.DB_PORT}"`);
  }

  if (env.JWT_SECRET && env.JWT_SECRET.trim().length < 32) {
    problems.push('JWT_SECRET should be at least 32 characters');
  }

  return problems;
}

function assertEnv(env = process.env) {
  const problems = validateEnv(env);

  if (problems.length) {
    console.error('[startup] configuration is invalid:');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('[startup] copy server/.env.example to server/.env and fill in the values.');
    process.exit(1);
  }
}

module.exports = { validateEnv, assertEnv, REQUIRED };
