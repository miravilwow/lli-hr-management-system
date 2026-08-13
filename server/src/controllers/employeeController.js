const employeeService = require('../services/employeeService');
const { ApiError } = require('../middleware/errorHandler');

function toNumber(value) {
  return value === undefined || value === '' ? undefined : Number(value);
}

async function list(req, res) {
  const { search, departmentId, status, sortBy, sortOrder, page, pageSize } = req.query;

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
  const employee = await employeeService.createEmployee(req.body, req.user.userId);
  res.status(201).json(employee);
}

async function update(req, res) {
  const { rowVersion, ...employee } = req.body;

  const result = await employeeService.updateEmployee(
    Number(req.params.id),
    employee,
    req.user.userId,
    rowVersion
  );

  if (result.status === 'notFound') {
    throw new ApiError(404, 'Employee not found');
  }

  if (result.status === 'conflict') {
    throw new ApiError(
      409,
      'This record was changed by someone else while you were editing it. Reload to see the current values.',
      { current: result.current }
    );
  }

  res.json(result.employee);
}

async function remove(req, res) {
  const deleted = await employeeService.deleteEmployee(Number(req.params.id), req.user.userId);

  if (!deleted) {
    throw new ApiError(404, 'Employee not found');
  }

  res.status(204).send();
}

async function history(req, res) {
  const employeeId = Number(req.params.id);

  if (!(await employeeService.employeeExists(employeeId))) {
    throw new ApiError(404, 'Employee not found');
  }

  res.json(await employeeService.getEmployeeHistory(employeeId));
}

module.exports = { list, getById, create, update, remove, history };
