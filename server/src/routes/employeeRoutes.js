const express = require('express');

const employeeController = require('../controllers/employeeController');
const {
  idParamRule,
  employeeRules,
  listQueryRules,
} = require('../validators/employeeValidator');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', listQueryRules, validate, employeeController.list);
router.get('/:id', idParamRule, validate, employeeController.getById);
router.get('/:id/history', idParamRule, validate, employeeController.history);

const adminOnly = requireRole('Admin');

router.post('/', adminOnly, employeeRules, validate, employeeController.create);
router.put('/:id', adminOnly, idParamRule, employeeRules, validate, employeeController.update);
router.delete('/:id', adminOnly, idParamRule, validate, employeeController.remove);

module.exports = router;
