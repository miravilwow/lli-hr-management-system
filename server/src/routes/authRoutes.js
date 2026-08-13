const express = require('express');

const authController = require('../controllers/authController');
const { loginRules } = require('../validators/authValidator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginLimiter, loginRules, validate, authController.login);

router.post('/refresh', loginLimiter, authController.refresh);

router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
