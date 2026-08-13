const { body, param, query } = require('express-validator');

const { SORTABLE_COLUMNS } = require('../services/employeeService');

const idParamRule = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Employee id must be a positive integer'),
];

const optionalQuery = { values: 'falsy' };

const listQueryRules = [
  query('page')
    .optional(optionalQuery)
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('pageSize')
    .optional(optionalQuery)
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
    .toInt(),
  query('departmentId')
    .optional(optionalQuery)
    .isInt({ min: 1 })
    .withMessage('Department must be a valid id')
    .toInt(),
  query('status')
    .optional(optionalQuery)
    .isIn(['Active', 'Inactive'])
    .withMessage("Status must be either 'Active' or 'Inactive'"),
  query('search')
    .optional(optionalQuery)
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be 100 characters or fewer'),
  query('sortBy')
    .optional(optionalQuery)
    .isIn(SORTABLE_COLUMNS)
    .withMessage(`Sort column must be one of: ${SORTABLE_COLUMNS.join(', ')}`),
  query('sortOrder')
    .optional(optionalQuery)
    .isIn(['asc', 'desc'])
    .withMessage("Sort order must be 'asc' or 'desc'"),
];

const employeeRules = [
  body('employeeCode')
    .trim()
    .notEmpty()
    .withMessage('Employee code is required')
    .isLength({ max: 20 })
    .withMessage('Employee code must be 20 characters or fewer'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be 50 characters or fewer'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be 50 characters or fewer'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .isLength({ max: 100 })
    .withMessage('Email must be 100 characters or fewer'),
  body('departmentId')
    .isInt({ min: 1 })
    .withMessage('Please select a department'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Position is required')
    .isLength({ max: 100 })
    .withMessage('Position must be 100 characters or fewer'),
  body('salary')
    .isFloat({ min: 0 })
    .withMessage('Salary must be zero or greater'),
  body('hireDate')
    .isISO8601()
    .withMessage('Hire date must be a valid date'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage("Status must be either 'Active' or 'Inactive'"),
];

module.exports = { idParamRule, employeeRules, listQueryRules };
