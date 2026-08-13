const express = require('express');

const reportController = require('../controllers/reportController');
const { reportFilterRules } = require('../validators/reportValidator');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/employees', reportFilterRules, validate, reportController.employeeReport);
router.get('/employees/export', reportFilterRules, validate, reportController.exportEmployeeReport);

module.exports = router;
