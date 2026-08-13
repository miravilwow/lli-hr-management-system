const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');

const { api, buildEmployee, cleanup, closePool } = require('./helpers');

after(async () => {
  await closePool();
});

describe('GET /api/v1/employees', () => {
  test('returns a paged result envelope', async () => {
    const res = await api('get', '/api/v1/employees');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(typeof res.body.total, 'number');
    assert.equal(res.body.page, 1);
  });

  test('honours page and pageSize', async () => {
    const res = await api('get', '/api/v1/employees?page=2&pageSize=5');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length <= 5);
    assert.equal(res.body.page, 2);
  });

  test('page 1 and page 2 return different records', async () => {
    const first = await api('get', '/api/v1/employees?page=1&pageSize=5');
    const second = await api('get', '/api/v1/employees?page=2&pageSize=5');

    const firstIds = first.body.data.map((e) => e.employeeId);
    const secondIds = second.body.data.map((e) => e.employeeId);

    assert.equal(
      firstIds.some((id) => secondIds.includes(id)),
      false
    );
  });

  test('filters by department', async () => {
    const res = await api('get', '/api/v1/employees?departmentId=1');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((e) => e.departmentId === 1));
  });

  test('filters by status', async () => {
    const res = await api('get', '/api/v1/employees?status=Active');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((e) => e.status === 'Active'));
  });

  test('search matches across name, email, code and position', async () => {
    const res = await api('get', '/api/v1/employees?search=cruz');

    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1);
  });

  // Regression: these previously reached OFFSET/FETCH unvalidated and
  // failed inside SQL Server as a 500.
  describe('query parameter validation', () => {
    const badRequests = [
      ['negative pageSize', '/api/v1/employees?pageSize=-5'],
      ['negative page', '/api/v1/employees?page=-1'],
      ['zero page', '/api/v1/employees?page=0'],
      ['pageSize above the cap', '/api/v1/employees?pageSize=5000'],
      ['non-numeric departmentId', '/api/v1/employees?departmentId=abc'],
      ['unknown status', '/api/v1/employees?status=Bogus'],
      ['unknown sort column', '/api/v1/employees?sortBy=DROP%20TABLE'],
      ['invalid sort order', '/api/v1/employees?sortOrder=sideways'],
    ];

    for (const [label, url] of badRequests) {
      test(`rejects ${label} with 400`, async () => {
        const res = await api('get', url);
        assert.equal(res.status, 400, `expected 400 for ${url}, got ${res.status}`);
      });
    }

    test('treats cleared filters as absent rather than invalid', async () => {
      const res = await api('get', '/api/v1/employees?departmentId=&status=&search=');
      assert.equal(res.status, 200);
    });
  });
});

describe('GET /api/v1/employees/:id', () => {
  test('returns a single employee', async () => {
    const list = await api('get', '/api/v1/employees?pageSize=1');
    const { employeeId } = list.body.data[0];

    const res = await api('get', `/api/v1/employees/${employeeId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.employeeId, employeeId);
  });

  test('returns 404 for an id that does not exist', async () => {
    const res = await api('get', '/api/v1/employees/99999999');
    assert.equal(res.status, 404);
  });

  test('returns 400 for a non-numeric id', async () => {
    const res = await api('get', '/api/v1/employees/not-a-number');
    assert.equal(res.status, 400);
  });
});

describe('POST /api/v1/employees', () => {
  test('creates an employee and responds 201', async () => {
    const payload = buildEmployee();
    const res = await api('post', '/api/v1/employees', payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.employeeCode, payload.employeeCode);
    assert.ok(res.body.employeeId);
    assert.equal(res.body.departmentName, 'Human Resources');

    await cleanup(res.body.employeeId);
  });

  test('the created record is retrievable afterwards', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    const fetched = await api('get', `/api/v1/employees/${created.body.employeeId}`);

    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.email, created.body.email);

    await cleanup(created.body.employeeId);
  });

  test('rejects a duplicate employee code with 409', async () => {
    const first = await api('post', '/api/v1/employees', buildEmployee());

    const clash = buildEmployee({ employeeCode: first.body.employeeCode });
    const res = await api('post', '/api/v1/employees', clash);

    assert.equal(res.status, 409);
    assert.match(res.body.message, /employee code/i);

    await cleanup(first.body.employeeId);
  });

  test('rejects a duplicate email with 409', async () => {
    const first = await api('post', '/api/v1/employees', buildEmployee());

    const clash = buildEmployee({ email: first.body.email });
    const res = await api('post', '/api/v1/employees', clash);

    assert.equal(res.status, 409);
    assert.match(res.body.message, /email/i);

    await cleanup(first.body.employeeId);
  });

  test('rejects a department that does not exist with 400', async () => {
    const res = await api('post', '/api/v1/employees', buildEmployee({ departmentId: 99999 }));

    assert.equal(res.status, 400);
    assert.match(res.body.message, /department/i);
  });

  const invalidFields = [
    ['blank employee code', { employeeCode: '' }],
    ['blank first name', { firstName: '' }],
    ['malformed email', { email: 'not-an-email' }],
    ['negative salary', { salary: -1 }],
    ['invalid hire date', { hireDate: 'yesterday' }],
    ['unknown status', { status: 'Retired' }],
  ];

  for (const [label, override] of invalidFields) {
    test(`rejects ${label} with 400`, async () => {
      const res = await api('post', '/api/v1/employees', buildEmployee(override));

      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'Validation failed');
    });
  }

  test('reports every invalid field at once, not just the first', async () => {
    const res = await api(
      'post',
      '/api/v1/employees',
      buildEmployee({ firstName: '', email: 'bad', salary: -5 })
    );

    assert.equal(res.status, 400);
    assert.ok(res.body.details.length >= 3, 'expected all invalid fields reported');
  });
});

describe('PUT /api/v1/employees/:id', () => {
  test('updates a record and returns the new values', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const updated = buildEmployee({
      employeeCode: created.body.employeeCode,
      email: created.body.email,
      position: 'Promoted Engineer',
      salary: 99000,
      status: 'Inactive',
    });

    const res = await api('put', `/api/v1/employees/${created.body.employeeId}`, updated);

    assert.equal(res.status, 200);
    assert.equal(res.body.position, 'Promoted Engineer');
    assert.equal(Number(res.body.salary), 99000);
    assert.equal(res.body.status, 'Inactive');
    assert.ok(res.body.updatedAt, 'expected UpdatedAt to be stamped');

    await cleanup(created.body.employeeId);
  });

  // Regression: an UPDATE affecting zero rows succeeds in SQL, so without
  // the @@ROWCOUNT check this returned 200 for a record that never existed.
  test('returns 404 for an id that does not exist', async () => {
    const res = await api('put', '/api/v1/employees/99999999', buildEmployee());

    assert.equal(res.status, 404);
  });

  test('rejects taking an email already used by another record with 409', async () => {
    const a = await api('post', '/api/v1/employees', buildEmployee());
    const b = await api('post', '/api/v1/employees', buildEmployee());

    const res = await api(
      'put',
      `/api/v1/employees/${b.body.employeeId}`,
      buildEmployee({ employeeCode: b.body.employeeCode, email: a.body.email })
    );

    assert.equal(res.status, 409);

    await cleanup(a.body.employeeId);
    await cleanup(b.body.employeeId);
  });

  test('rejects an invalid body with 400', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const res = await api(
      'put',
      `/api/v1/employees/${created.body.employeeId}`,
      buildEmployee({ salary: -100 })
    );

    assert.equal(res.status, 400);

    await cleanup(created.body.employeeId);
  });
});

describe('DELETE /api/v1/employees/:id', () => {
  test('deletes a record and responds 204 with no body', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const res = await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    assert.equal(res.status, 204);
    assert.deepEqual(res.body, {});
  });

  test('the record is gone afterwards', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    const res = await api('get', `/api/v1/employees/${created.body.employeeId}`);
    assert.equal(res.status, 404);
  });

  test('deleting the same record twice returns 404', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const first = await api('delete', `/api/v1/employees/${created.body.employeeId}`);
    const second = await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    assert.equal(first.status, 204);
    assert.equal(second.status, 404);
  });

  test('rejects a non-numeric id with 400', async () => {
    const res = await api('delete', '/api/v1/employees/abc');
    assert.equal(res.status, 400);
  });
});

describe('GET /api/v1/departments', () => {
  test('returns the department lookup list', async () => {
    const res = await api('get', '/api/v1/departments');

    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 5);
  });

  // Regression: this endpoint used to leak raw PascalCase column names
  // while every other endpoint returned camelCase.
  test('uses the same camelCase shape as every other endpoint', async () => {
    const res = await api('get', '/api/v1/departments');
    const [first] = res.body;

    assert.ok(first.departmentId, 'expected departmentId');
    assert.ok(first.departmentName, 'expected departmentName');
    assert.equal(first.DepartmentId, undefined, 'PascalCase key should be gone');
    assert.equal(first.DepartmentName, undefined, 'PascalCase key should be gone');
  });
});
