const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

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
