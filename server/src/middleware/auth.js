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

    req.user = {
      userId: payload.sub,
      username: payload.username,
      // Tokens issued before roles existed carry no role. Default to the
      // lower privilege rather than silently granting write access.
      role: payload.role || 'Viewer',
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
