const express = require('express');

const employeeController = require('../controllers/employeeController');
const { idParamRule, employeeRules } = require('../validators/employeeValidator');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/', employeeController.list);
router.get('/:id', idParamRule, validate, employeeController.getById);
router.post('/', employeeRules, validate, employeeController.create);
router.put('/:id', idParamRule, employeeRules, validate, employeeController.update);
router.delete('/:id', idParamRule, validate, employeeController.remove);

module.exports = router;
