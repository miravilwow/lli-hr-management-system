const employeeService = require('../services/employeeService');
const { ApiError } = require('../middleware/errorHandler');

async function list(req, res) {
  const { search, departmentId, status, sortBy, sortOrder } = req.query;

  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 10, 100);

  const result = await employeeService.listEmployees({
    search: search?.trim() || undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    status: status || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize,
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

module.exports = { list, getById, create, update };
