const express = require('express');

const employeeController = require('../controllers/employeeController');
const { idParamRule } = require('../validators/employeeValidator');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/', employeeController.list);
router.get('/:id', idParamRule, validate, employeeController.getById);

module.exports = router;
