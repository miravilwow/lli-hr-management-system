const { body } = require('express-validator');

const loginRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = { loginRules };
