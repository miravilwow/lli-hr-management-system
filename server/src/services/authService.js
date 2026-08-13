const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { sql, getPool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

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

  const token = jwt.sign(
    { sub: user.UserId, username: user.Username, role: user.Role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    user: {
      userId: user.UserId,
      username: user.Username,
      fullName: user.FullName,
      role: user.Role,
    },
  };
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

module.exports = { login, getUserById };
