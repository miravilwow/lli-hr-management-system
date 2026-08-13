const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { sql, getPool } = require('../config/db');

const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;

/**
 * Only a hash of the refresh token is stored, for the same reason
 * passwords are hashed: a leak of the table must not hand over usable
 * sessions. SHA-256 is right here rather than bcrypt - the token is
 * already 256 bits of entropy, so there is nothing to brute force, and
 * refresh happens often enough that a deliberately slow hash would cost
 * real latency.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.userId, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

/** Issues a refresh token and records it so it can later be revoked. */
async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + REFRESH_TTL_DAYS);

  const pool = await getPool();
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('tokenHash', sql.Char(64), hashToken(token))
    .input('expiresAt', sql.DateTime2, expiresAt)
    .query(`
      INSERT INTO dbo.RefreshTokens (UserId, TokenHash, ExpiresAt)
      VALUES (@userId, @tokenHash, @expiresAt);
    `);

  return { token, expiresAt };
}

/**
 * Consumes a refresh token and issues a replacement.
 *
 * The presented token is revoked as part of the same operation, so each
 * refresh token is usable exactly once. If an old one is presented
 * again the row is already revoked and the attempt fails, which is what
 * makes a stolen token useful only until the legitimate client next
 * refreshes.
 */
async function rotateRefreshToken(token) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('tokenHash', sql.Char(64), hashToken(token))
    .query(`
      UPDATE dbo.RefreshTokens
      SET RevokedAt = SYSUTCDATETIME()
      OUTPUT DELETED.UserId AS userId
      WHERE TokenHash = @tokenHash
        AND RevokedAt IS NULL
        AND ExpiresAt > SYSUTCDATETIME();
    `);

  return result.recordset[0]?.userId ?? null;
}

/** Ends a single session. */
async function revokeRefreshToken(token) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('tokenHash', sql.Char(64), hashToken(token))
    .query(`
      UPDATE dbo.RefreshTokens
      SET RevokedAt = SYSUTCDATETIME()
      WHERE TokenHash = @tokenHash AND RevokedAt IS NULL;

      SELECT @@ROWCOUNT AS affected;
    `);

  return result.recordset[0].affected > 0;
}

/** Ends every session for a user - used when forcing a sign out. */
async function revokeAllForUser(userId) {
  const pool = await getPool();

  await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      UPDATE dbo.RefreshTokens
      SET RevokedAt = SYSUTCDATETIME()
      WHERE UserId = @userId AND RevokedAt IS NULL;
    `);
}

module.exports = {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  ACCESS_TTL,
};
