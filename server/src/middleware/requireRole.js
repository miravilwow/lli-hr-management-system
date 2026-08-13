const { ApiError } = require('./errorHandler');

/**
 * Authorisation, as distinct from authentication.
 *
 * requireAuth answers "who are you". This answers "may you do this".
 * Without it every authenticated account could read and change every
 * salary in the system.
 *
 * Must be mounted after requireAuth, which is what populates req.user.
 */
function requireRole(...allowed) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowed.includes(req.user.role)) {
      // 403, not 401: the credentials are valid, the permission is not.
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }

    return next();
  };
}

module.exports = requireRole;
