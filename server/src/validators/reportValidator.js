const { query } = require('express-validator');

const optionalQuery = { values: 'falsy' };

const pagingRules = [
  query('page')
    .optional(optionalQuery)
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional(optionalQuery)
    .isInt({ min: 1, max: 200 })
    .withMessage('Page size must be between 1 and 200'),
];

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

module.exports = {
  reportFilterRules,
  reportPageRules: [...reportFilterRules, ...pagingRules],
};
