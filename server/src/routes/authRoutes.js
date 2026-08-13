const express = require('express');

const authController = require('../controllers/authController');
const { loginRules } = require('../validators/authValidator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginRules, validate, authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
