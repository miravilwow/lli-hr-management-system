const employeeService = require('../services/employeeService');
const { ApiError } = require('../middleware/errorHandler');

async function list(req, res) {
  // Query parameters are validated and coerced by listQueryRules, so
  // anything present here is already the right type and in range.
  const { search, departmentId, status, sortBy, sortOrder, page, pageSize } = req.query;

  const result = await employeeService.listEmployees({
    search: search || undefined,
    departmentId,
    status,
    sortBy,
    sortOrder,
    page: page ?? 1,
    pageSize: pageSize ?? 10,
  });

  res.json(result);
}

async function getById(req, res) {
  const employee = await employeeService.getEmployeeById(Number(req.params.id));

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  res.json(employee);
}

async function create(req, res) {
  const employee = await employeeService.createEmployee(req.body);
  res.status(201).json(employee);
}

async function update(req, res) {
  const employee = await employeeService.updateEmployee(Number(req.params.id), req.body);

  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  res.json(employee);
}

async function remove(req, res) {
  const deleted = await employeeService.deleteEmployee(Number(req.params.id));

  if (!deleted) {
    throw new ApiError(404, 'Employee not found');
  }

  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
