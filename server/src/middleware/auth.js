const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');

/**
 * Rejects any request without a valid `Authorization: Bearer <token>`
 * header. On success the decoded payload is attached as `req.user`.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // A token issued before roles existed carries no role claim. Quietly
    // treating it as a Viewer produced a genuinely confusing state: the
    // UI asked /auth/me, got the real role from the database and showed
    // the write controls, while every write was refused with 403. The
    // token is the authority for authorisation, so one without a role is
    // not usable - reject it and let the client sign in again.
    if (!payload.role) {
      return next(
        new ApiError(401, 'Your session predates a permissions change, please sign in again')
      );
    }

    req.user = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expired, please log in again'
      : 'Invalid authentication token';
    return next(new ApiError(401, message));
  }
}

module.exports = requireAuth;
