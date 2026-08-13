const express = require('express');

const authController = require('../controllers/authController');
const { loginRules } = require('../validators/authValidator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginLimiter, loginRules, validate, authController.login);

// Refresh presents a token rather than credentials, so it sits outside
// the login limiter - but it is still an unauthenticated endpoint that
// hands out access, so it gets the same protection against guessing.
router.post('/refresh', loginLimiter, authController.refresh);

router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
