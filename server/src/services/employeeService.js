const { sql, getPool } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

// SQL Server error numbers we can turn into a meaningful client response
// instead of letting them surface as a generic 500.
const UNIQUE_VIOLATION = [2601, 2627];
const FOREIGN_KEY_VIOLATION = 547;

function translateSqlError(err) {
  if (UNIQUE_VIOLATION.includes(err.number)) {
    const field = /email/i.test(err.message) ? 'email' : 'employee code';
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
    e.UpdatedAt     AS updatedAt,
    e.[RowVersion]  AS rowVersion`;

// Soft-deleted employees are invisible to every read path.
const LIVE_ONLY = 'e.DeletedAt IS NULL';

/**
 * ROWVERSION arrives from the driver as a Buffer. It travels to the
 * client as base64 and has to come back as a Buffer to be compared.
 */
function encodeRowVersion(row) {
  if (row && Buffer.isBuffer(row.rowVersion)) {
    return { ...row, rowVersion: row.rowVersion.toString('base64') };
  }
  return row;
}

function decodeRowVersion(value) {
  if (!value) return null;
  try {
    const buffer = Buffer.from(value, 'base64');
    return buffer.length === 8 ? buffer : null;
  } catch {
    return null;
  }
}

/**
 * Paged, filtered employee list.
 * Every filter is optional and bound as a parameter.
 */
async function listEmployees({ search, departmentId, status, sortBy, sortOrder, page = 1, pageSize = 10 }) {
  const pool = await getPool();
  const request = pool.request();

  const where = [LIVE_ONLY];

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

  const whereClause = `WHERE ${where.join(' AND ')}`;

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
    data: rows.map(encodeRowVersion),
    total: totals[0].total,
    page,
    pageSize,
  };
}

async function getEmployeeById(employeeId, runner) {
  const request = runner ? runner.request() : (await getPool()).request();

  const result = await request.input('employeeId', sql.Int, employeeId).query(`
    SELECT ${SELECT_COLUMNS}
    FROM dbo.Employees e
    INNER JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
    WHERE e.EmployeeId = @employeeId AND ${LIVE_ONLY}
  `);

  return encodeRowVersion(result.recordset[0]) || null;
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

/* ------------------------------------------------------------------ */
/* Audit trail                                                         */
/* ------------------------------------------------------------------ */

// Fields whose changes are worth recording individually.
const AUDITED_FIELDS = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'departmentId',
  'position',
  'salary',
  'hireDate',
  'status',
];

function normaliseForComparison(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

/** Returns one entry per field that actually changed. */
function diffEmployee(before, after) {
  const changes = [];

  for (const field of AUDITED_FIELDS) {
    const oldValue = normaliseForComparison(before[field]);
    const newValue = normaliseForComparison(after[field]);

    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
    }
  }

  return changes;
}

async function writeAudit(runner, { employeeId, action, actorId, changes = [] }) {
  // Create and delete are recorded as a single row with no field name.
  const entries = changes.length
    ? changes
    : [{ field: null, oldValue: null, newValue: null }];

  for (const entry of entries) {
    await runner
      .request()
      .input('employeeId', sql.Int, employeeId)
      .input('action', sql.NVarChar(10), action)
      .input('fieldName', sql.NVarChar(50), entry.field)
      .input('oldValue', sql.NVarChar(400), entry.oldValue)
      .input('newValue', sql.NVarChar(400), entry.newValue)
      .input('changedBy', sql.Int, actorId)
      .query(`
        INSERT INTO dbo.EmployeeAudit
          (EmployeeId, Action, FieldName, OldValue, NewValue, ChangedBy)
        VALUES
          (@employeeId, @action, @fieldName, @oldValue, @newValue, @changedBy);
      `);
  }
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

async function createEmployee(employee, actorId) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const insert = bindEmployeeInputs(transaction.request(), employee).input(
      'actorId',
      sql.Int,
      actorId
    );

    const result = await insert.query(`
      INSERT INTO dbo.Employees
        (EmployeeCode, FirstName, LastName, Email, DepartmentId, Position, Salary, HireDate, Status, CreatedBy)
      OUTPUT INSERTED.EmployeeId
      VALUES
        (@employeeCode, @firstName, @lastName, @email, @departmentId, @position, @salary, @hireDate, @status, @actorId);
    `);

    const employeeId = result.recordset[0].EmployeeId;

    await writeAudit(transaction, { employeeId, action: 'Create', actorId });

    const created = await getEmployeeById(employeeId, transaction);
    await transaction.commit();

    return created;
  } catch (err) {
    await transaction.rollback();
    throw translateSqlError(err);
  }
}

/**
 * Update guarded by the row's concurrency token.
 *
 * Returns { status: 'updated' | 'notFound' | 'conflict' } so the
 * controller can map each outcome to the right HTTP response without
 * knowing anything about SQL.
 */
async function updateEmployee(employeeId, employee, actorId, rowVersion) {
  const expected = decodeRowVersion(rowVersion);

  if (!expected) {
    throw new ApiError(400, 'A valid rowVersion is required to update a record');
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const before = await getEmployeeById(employeeId, transaction);

    if (!before) {
      await transaction.rollback();
      return { status: 'notFound' };
    }

    const update = bindEmployeeInputs(transaction.request(), employee)
      .input('employeeId', sql.Int, employeeId)
      .input('actorId', sql.Int, actorId)
      .input('rowVersion', sql.Binary(8), expected);

    const result = await update.query(`
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
          UpdatedAt    = SYSUTCDATETIME(),
          UpdatedBy    = @actorId
      WHERE EmployeeId = @employeeId
        AND DeletedAt IS NULL
        AND [RowVersion] = @rowVersion;

      SELECT @@ROWCOUNT AS affected;
    `);

    // The row exists but the token did not match, so someone else saved
    // between this client reading the record and submitting it.
    if (result.recordset[0].affected === 0) {
      await transaction.rollback();
      return { status: 'conflict', current: before };
    }

    const changes = diffEmployee(before, employee);
    if (changes.length) {
      await writeAudit(transaction, { employeeId, action: 'Update', actorId, changes });
    }

    const updated = await getEmployeeById(employeeId, transaction);
    await transaction.commit();

    return { status: 'updated', employee: updated };
  } catch (err) {
    await transaction.rollback();
    throw translateSqlError(err);
  }
}

/**
 * Soft delete. The row is retained - employment records normally carry a
 * retention obligation, and a hard delete would also destroy the audit
 * trail's subject.
 */
async function deleteEmployee(employeeId, actorId) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const result = await transaction
      .request()
      .input('employeeId', sql.Int, employeeId)
      .input('actorId', sql.Int, actorId)
      .query(`
        UPDATE dbo.Employees
        SET DeletedAt = SYSUTCDATETIME(),
            DeletedBy = @actorId
        WHERE EmployeeId = @employeeId AND DeletedAt IS NULL;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      await transaction.rollback();
      return false;
    }

    await writeAudit(transaction, { employeeId, action: 'Delete', actorId });
    await transaction.commit();

    return true;
  } catch (err) {
    await transaction.rollback();
    throw translateSqlError(err);
  }
}

/**
 * Existence check that deliberately ignores DeletedAt.
 *
 * Reads of the record itself exclude soft-deleted rows, but the history
 * has to outlive the deletion - that is what retaining the row is for.
 */
async function employeeExists(employeeId) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .query('SELECT TOP 1 EmployeeId FROM dbo.Employees WHERE EmployeeId = @employeeId');

  return result.recordset.length > 0;
}

/** Full change history for one employee, newest first. */
async function getEmployeeHistory(employeeId) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .query(`
      SELECT
        a.EmployeeAuditId AS auditId,
        a.Action          AS action,
        a.FieldName       AS fieldName,
        a.OldValue        AS oldValue,
        a.NewValue        AS newValue,
        a.ChangedAt       AS changedAt,
        u.Username        AS changedBy,
        u.FullName        AS changedByName
      FROM dbo.EmployeeAudit a
      INNER JOIN dbo.Users u ON u.UserId = a.ChangedBy
      WHERE a.EmployeeId = @employeeId
      ORDER BY a.ChangedAt DESC, a.EmployeeAuditId DESC
    `);

  return result.recordset;
}

module.exports = {
  SORTABLE_COLUMNS: Object.keys(SORTABLE),
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  employeeExists,
  getEmployeeHistory,
};
