const rateLimit = require('express-rate-limit');

const { ApiError } = require('./errorHandler');

const DISABLED = process.env.NODE_ENV === 'test';

function handler(req, res, next) {
  next(new ApiError(429, 'Too many requests, please try again later'));
}

const passthrough = (req, res, next) => next();

const loginLimiter = DISABLED
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      skipSuccessfulRequests: true,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler,
    });

const apiLimiter = DISABLED
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler,
    });

module.exports = { loginLimiter, apiLimiter };
