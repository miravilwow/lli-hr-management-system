const { getPool } = require('../config/db');

async function listDepartments() {
  const pool = await getPool();
  // Aliased to camelCase so this endpoint matches the shape every other
  // endpoint returns. It previously leaked raw PascalCase column names.
  const result = await pool.request().query(`
    SELECT
      DepartmentId   AS departmentId,
      DepartmentName AS departmentName
    FROM dbo.Departments
    ORDER BY DepartmentName
  `);

  return result.recordset;
}

module.exports = { listDepartments };
