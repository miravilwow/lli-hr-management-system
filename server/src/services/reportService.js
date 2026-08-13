const { sql, getPool } = require('../config/db');

function applyFilters(request, { departmentId, status, from, to }) {
  const where = ['e.DeletedAt IS NULL'];

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

  return `WHERE ${where.join(' AND ')}`;
}

const ROW_COLUMNS = `
      e.EmployeeCode   AS employeeCode,
      e.FirstName      AS firstName,
      e.LastName       AS lastName,
      d.DepartmentName AS departmentName,
      e.Position       AS position,
      e.Salary         AS salary,
      e.HireDate       AS hireDate,
      e.Status         AS status`;

const SUMMARY_SELECT = `
    SELECT
      COUNT(*)                 AS headcount,
      ISNULL(SUM(e.Salary), 0) AS totalMonthlyPayroll,
      ISNULL(AVG(e.Salary), 0) AS averageSalary,
      ISNULL(MIN(e.Salary), 0) AS lowestSalary,
      ISNULL(MAX(e.Salary), 0) AS highestSalary
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId`;

const BREAKDOWN_SELECT = `
    SELECT
      d.DepartmentName         AS departmentName,
      COUNT(*)                 AS headcount,
      ISNULL(SUM(e.Salary), 0) AS totalMonthlyPayroll,
      ISNULL(AVG(e.Salary), 0) AS averageSalary
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId`;

async function getEmployeeReport(filters) {
  const { page = 1, pageSize = 25 } = filters;

  const pool = await getPool();
  const request = pool.request();
  const whereClause = applyFilters(request, filters);

  request.input('offset', sql.Int, (page - 1) * pageSize);
  request.input('pageSize', sql.Int, pageSize);

  const result = await request.query(`
    SELECT ${ROW_COLUMNS}
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause}
    ORDER BY d.DepartmentName, e.LastName
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

    ${SUMMARY_SELECT}
    ${whereClause};

    ${BREAKDOWN_SELECT}
    ${whereClause}
    GROUP BY d.DepartmentName
    ORDER BY d.DepartmentName;
  `);

  const [rows, summary, byDepartment] = result.recordsets;

  return {
    rows,
    summary: summary[0],
    byDepartment,
    page,
    pageSize,
    total: summary[0].headcount,
    filters,
  };
}

async function getEmployeeReportForExport(filters) {
  const pool = await getPool();
  const request = pool.request();
  const whereClause = applyFilters(request, filters);

  const result = await request.query(`
    SELECT ${ROW_COLUMNS}
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    ${whereClause}
    ORDER BY d.DepartmentName, e.LastName;

    ${SUMMARY_SELECT}
    ${whereClause};
  `);

  const [rows, summary] = result.recordsets;

  return { rows, summary: summary[0] };
}

module.exports = { getEmployeeReport, getEmployeeReportForExport };
