const rateLimit = require('express-rate-limit');

const { ApiError } = require('./errorHandler');

// Tests drive many requests through the same process; leaving the limiter
// active there would make them fail for reasons unrelated to the assertion.
const DISABLED = process.env.NODE_ENV === 'test';

function handler(req, res, next) {
  next(new ApiError(429, 'Too many requests, please try again later'));
}

const passthrough = (req, res, next) => next();

/**
 * Login is the one unauthenticated, credential-checking endpoint, so it
 * gets a tight limit of its own. Successful logins are not counted, so a
 * legitimate user is never locked out by their own activity.
 */
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

/** A broad ceiling for everything else, well above normal UI usage. */
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
