const { body, param } = require('express-validator');

const idParamRule = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Employee id must be a positive integer'),
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

module.exports = { idParamRule, employeeRules };
