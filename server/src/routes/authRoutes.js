const express = require('express');

const authController = require('../controllers/authController');
const { loginRules } = require('../validators/authValidator');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/login', loginRules, validate, authController.login);

module.exports = router;
