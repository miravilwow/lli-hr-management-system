const bcrypt = require('bcryptjs');

const { sql, getPool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const tokenService = require('./tokenService');

async function findUserByUsername(username) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('username', sql.NVarChar(50), username)
    .query(`
      SELECT UserId, Username, PasswordHash, FullName, [Role]
      FROM dbo.Users
      WHERE Username = @username
    `);

  return result.recordset[0] || null;
}

async function login(username, password) {
  const user = await findUserByUsername(username);

  // Same message whether the user is missing or the password is wrong,
  // so the response cannot be used to enumerate valid usernames.
  const invalid = new ApiError(401, 'Invalid username or password');

  if (!user) throw invalid;

  const passwordMatches = await bcrypt.compare(password, user.PasswordHash);
  if (!passwordMatches) throw invalid;

  const profile = {
    userId: user.UserId,
    username: user.Username,
    fullName: user.FullName,
    role: user.Role,
  };

  const refresh = await tokenService.issueRefreshToken(profile.userId);

  return {
    // `token` is kept as the field name so existing clients keep working.
    token: tokenService.signAccessToken(profile),
    refreshToken: refresh.token,
    expiresIn: tokenService.ACCESS_TTL,
    user: profile,
  };
}

/**
 * Exchanges a refresh token for a new access token, rotating the refresh
 * token in the process so each one is usable exactly once.
 */
async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(400, 'A refresh token is required');
  }

  const userId = await tokenService.rotateRefreshToken(refreshToken);

  if (!userId) {
    throw new ApiError(401, 'Your session has expired, please sign in again');
  }

  const profile = await getUserById(userId);

  if (!profile) {
    throw new ApiError(401, 'Account no longer exists');
  }

  const next = await tokenService.issueRefreshToken(userId);

  return {
    token: tokenService.signAccessToken(profile),
    refreshToken: next.token,
    expiresIn: tokenService.ACCESS_TTL,
    user: profile,
  };
}

/** Ends the session server-side, so the refresh token stops working. */
async function logout(refreshToken) {
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }
}

async function getUserById(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT UserId, Username, FullName, [Role]
      FROM dbo.Users
      WHERE UserId = @userId
    `);

  const user = result.recordset[0];
  if (!user) return null;

  return {
    userId: user.UserId,
    username: user.Username,
    fullName: user.FullName,
    role: user.Role,
  };
}

module.exports = { login, refresh, logout, getUserById };
