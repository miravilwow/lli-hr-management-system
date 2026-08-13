const { ApiError } = require('./errorHandler');

function requireRole(...allowed) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowed.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }

    return next();
  };
}

module.exports = requireRole;
