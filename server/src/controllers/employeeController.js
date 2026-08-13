const employeeService = require('../services/employeeService');
const { ApiError } = require('../middleware/errorHandler');

/** undefined for an absent value, a number otherwise. */
function toNumber(value) {
  return value === undefined || value === '' ? undefined : Number(value);
}

async function list(req, res) {
  const { search, departmentId, status, sortBy, sortOrder, page, pageSize } = req.query;

  // listQueryRules has already rejected anything out of range, but its
  // toInt() sanitisers cannot write back to req.query: Express 5 exposes
  // it as a getter, so the values arrive here as strings. Coerce them
  // explicitly, otherwise the paging numbers echo back as strings.
  const result = await employeeService.listEmployees({
    search: search || undefined,
    departmentId: toNumber(departmentId),
    status: status || undefined,
    sortBy,
    sortOrder,
    page: toNumber(page) ?? 1,
    pageSize: toNumber(pageSize) ?? 10,
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
