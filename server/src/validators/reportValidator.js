const { query } = require('express-validator');

const reportFilterRules = [
  query('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Department must be a valid id'),
  query('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage("Status must be either 'Active' or 'Inactive'"),
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid date'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be a valid date'),
];

module.exports = { reportFilterRules };
