const { getPool } = require('../config/db');

async function listDepartments() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DepartmentId, DepartmentName
    FROM dbo.Departments
    ORDER BY DepartmentName
  `);

  return result.recordset;
}

module.exports = { listDepartments };
