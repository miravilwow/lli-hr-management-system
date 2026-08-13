const { sql, getPool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

// SQL Server error numbers we can turn into a meaningful client response
// instead of letting them surface as a generic 500.
const UNIQUE_VIOLATION = [2601, 2627];
const FOREIGN_KEY_VIOLATION = 547;

function translateSqlError(err) {
  if (UNIQUE_VIOLATION.includes(err.number)) {
    const field = err.message.includes('UQ_Employees_Email') ? 'email' : 'employee code';
    return new ApiError(409, `An employee with this ${field} already exists`);
  }

  if (err.number === FOREIGN_KEY_VIOLATION) {
    return new ApiError(400, 'The selected department does not exist');
  }

  return err;
}

// Columns the client is allowed to sort by, mapped to real SQL. Whitelisting
// keeps the ORDER BY clause free of any user-supplied text.
const SORTABLE = {
  employeeCode: 'e.EmployeeCode',
  lastName: 'e.LastName',
  department: 'd.DepartmentName',
  position: 'e.Position',
  salary: 'e.Salary',
  hireDate: 'e.HireDate',
  status: 'e.Status',
};

const SELECT_COLUMNS = `
    e.EmployeeId    AS employeeId,
    e.EmployeeCode  AS employeeCode,
    e.FirstName     AS firstName,
    e.LastName      AS lastName,
    e.Email         AS email,
    e.DepartmentId  AS departmentId,
    d.DepartmentName AS departmentName,
    e.Position      AS position,
    e.Salary        AS salary,
    e.HireDate      AS hireDate,
    e.Status        AS status,
    e.CreatedAt     AS createdAt,
    e.UpdatedAt     AS updatedAt`;

/**
 * Paged, filtered employee list.
 * Every filter is optional and bound as a parameter.
 */
async function listEmployees({ search, departmentId, status, sortBy, sortOrder, page = 1, pageSize = 10 }) {
  const pool = await getPool();
  const request = pool.request();

  const where = [];

  if (search) {
    request.input('search', sql.NVarChar(100), `%${search}%`);
    where.push(`(
      e.FirstName LIKE @search OR
      e.LastName LIKE @search OR
      e.Email LIKE @search OR
      e.EmployeeCode LIKE @search OR
      e.Position LIKE @search
    )`);
  }

  if (departmentId) {
    request.input('departmentId', sql.Int, departmentId);
    where.push('e.DepartmentId = @departmentId');
  }

  if (status) {
    request.input('status', sql.NVarChar(20), status);
    where.push('e.Status = @status');
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const orderColumn = SORTABLE[sortBy] || 'e.EmployeeId';
  const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

  request.input('offset', sql.Int, (page - 1) * pageSize);
  request.input('pageSize', sql.Int, pageSize);

  const result = await request.query(`
    SELECT COUNT(*) AS total
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause};

    SELECT ${SELECT_COLUMNS}
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause}
    ORDER BY ${orderColumn} ${orderDirection}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `);

  const [totals, rows] = result.recordsets;

  return {
    data: rows,
    total: totals[0].total,
    page,
    pageSize,
  };
}

async function getEmployeeById(employeeId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .query(`
      SELECT ${SELECT_COLUMNS}
      FROM dbo.Employees e
      INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
      WHERE e.EmployeeId = @employeeId
    `);

  return result.recordset[0] || null;
}

/** Binds the shared employee columns onto a request object. */
function bindEmployeeInputs(request, employee) {
  return request
    .input('employeeCode', sql.NVarChar(20), employee.employeeCode)
    .input('firstName', sql.NVarChar(50), employee.firstName)
    .input('lastName', sql.NVarChar(50), employee.lastName)
    .input('email', sql.NVarChar(100), employee.email)
    .input('departmentId', sql.Int, employee.departmentId)
    .input('position', sql.NVarChar(100), employee.position)
    .input('salary', sql.Decimal(18, 2), employee.salary)
    .input('hireDate', sql.Date, employee.hireDate)
    .input('status', sql.NVarChar(20), employee.status || 'Active');
}

async function createEmployee(employee) {
  const pool = await getPool();

  try {
    const result = await bindEmployeeInputs(pool.request(), employee).query(`
      INSERT INTO dbo.Employees
        (EmployeeCode, FirstName, LastName, Email, DepartmentId, Position, Salary, HireDate, Status)
      OUTPUT INSERTED.EmployeeId
      VALUES
        (@employeeCode, @firstName, @lastName, @email, @departmentId, @position, @salary, @hireDate, @status);
    `);

    return getEmployeeById(result.recordset[0].EmployeeId);
  } catch (err) {
    throw translateSqlError(err);
  }
}

async function updateEmployee(employeeId, employee) {
  const pool = await getPool();
  const request = pool.request().input('employeeId', sql.Int, employeeId);

  try {
    const result = await bindEmployeeInputs(request, employee).query(`
      UPDATE dbo.Employees
      SET EmployeeCode = @employeeCode,
          FirstName    = @firstName,
          LastName     = @lastName,
          Email        = @email,
          DepartmentId = @departmentId,
          Position     = @position,
          Salary       = @salary,
          HireDate     = @hireDate,
          Status       = @status,
          UpdatedAt    = SYSUTCDATETIME()
      WHERE EmployeeId = @employeeId;

      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return null;
    }

    return getEmployeeById(employeeId);
  } catch (err) {
    throw translateSqlError(err);
  }
}

/** Returns false when there was no matching row to delete. */
async function deleteEmployee(employeeId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .query(`
      DELETE FROM dbo.Employees WHERE EmployeeId = @employeeId;
      SELECT @@ROWCOUNT AS affected;
    `);

  return result.recordset[0].affected > 0;
}

module.exports = {
  SORTABLE_COLUMNS: Object.keys(SORTABLE),
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
