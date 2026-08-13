const { sql, getPool } = require('../config/db');

/**
 * Builds the shared WHERE clause for the report. Every filter is
 * optional and bound as a parameter on the supplied request.
 */
function applyFilters(request, { departmentId, status, from, to }) {
  const where = [];

  if (departmentId) {
    request.input('departmentId', sql.Int, departmentId);
    where.push('e.DepartmentId = @departmentId');
  }

  if (status) {
    request.input('status', sql.NVarChar(20), status);
    where.push('e.Status = @status');
  }

  if (from) {
    request.input('from', sql.Date, from);
    where.push('e.HireDate >= @from');
  }

  if (to) {
    request.input('to', sql.Date, to);
    where.push('e.HireDate <= @to');
  }

  return where.length ? `WHERE ${where.join(' AND ')}` : '';
}

/**
 * Returns the matching employee rows plus the summary totals and a
 * per-department breakdown, all computed in the database.
 */
async function getEmployeeReport(filters) {
  const pool = await getPool();
  const request = pool.request();
  const whereClause = applyFilters(request, filters);

  const result = await request.query(`
    SELECT
      e.EmployeeCode   AS employeeCode,
      e.FirstName      AS firstName,
      e.LastName       AS lastName,
      d.DepartmentName AS departmentName,
      e.Position       AS position,
      e.Salary         AS salary,
      e.HireDate       AS hireDate,
      e.Status         AS status
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause}
    ORDER BY d.DepartmentName, e.LastName;

    SELECT
      COUNT(*)                                  AS headcount,
      ISNULL(SUM(e.Salary), 0)                  AS totalMonthlyPayroll,
      ISNULL(AVG(e.Salary), 0)                  AS averageSalary,
      ISNULL(MIN(e.Salary), 0)                  AS lowestSalary,
      ISNULL(MAX(e.Salary), 0)                  AS highestSalary
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause};

    SELECT
      d.DepartmentName          AS departmentName,
      COUNT(*)                  AS headcount,
      ISNULL(SUM(e.Salary), 0)  AS totalMonthlyPayroll,
      ISNULL(AVG(e.Salary), 0)  AS averageSalary
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause}
    GROUP BY d.DepartmentName
    ORDER BY d.DepartmentName;
  `);

  const [rows, summary, byDepartment] = result.recordsets;

  return {
    rows,
    summary: summary[0],
    byDepartment,
    filters,
  };
}

module.exports = { getEmployeeReport };
