const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

function validate(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, 'Validation failed', details));
  }

  return next();
}

module.exports = validate;
