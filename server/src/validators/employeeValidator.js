const { param } = require('express-validator');

const idParamRule = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Employee id must be a positive integer'),
];

module.exports = { idParamRule };
