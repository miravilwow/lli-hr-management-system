const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');

const { app, request, api, buildEmployee, cleanup, purgeFixtures, closePool } = require('./helpers');

after(async () => {
  await purgeFixtures();
  await closePool();
});

/** A second session, signed in as the read-only account. */
async function viewerToken() {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'viewer', password: 'viewer123' });

  assert.equal(res.status, 200, 'viewer account should exist - run db/04_governance.sql');
  return res.body.token;
}

async function asViewer(method, url, body) {
  const token = await viewerToken();
  const req = request(app)[method](url).set('Authorization', `Bearer ${token}`);
  return body === undefined ? req : req.send(body);
}

/* ==================================================================== */
/* F-01  Optimistic concurrency                                          */
/* ==================================================================== */

describe('F-01 concurrent edits', () => {
  test('a stale write is rejected with 409 instead of silently winning', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    const { employeeId, employeeCode, email, rowVersion } = created.body;

    // Two users load the same record, so both hold the same token.
    const userA = rowVersion;
    const userB = rowVersion;

    const firstSave = await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, salary: 75000 }),
      rowVersion: userA,
    });
    assert.equal(firstSave.status, 200);
    assert.equal(Number(firstSave.body.salary), 75000);

    // User B still holds the token from before user A's save.
    const secondSave = await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, position: 'Changed By B' }),
      rowVersion: userB,
    });

    assert.equal(secondSave.status, 409, 'stale write should be refused');

    // And critically, the first user's change survived.
    const final = await api('get', `/api/v1/employees/${employeeId}`);
    assert.equal(Number(final.body.salary), 75000, "user A's salary change was lost");

    await cleanup(employeeId);
  });

  test('the conflict response carries the current record so the UI can show it', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    const { employeeId, employeeCode, email, rowVersion } = created.body;

    await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, salary: 88000 }),
      rowVersion,
    });

    const stale = await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, salary: 12000 }),
      rowVersion,
    });

    assert.equal(stale.status, 409);
    assert.ok(stale.body.details?.current, 'expected the current record in the response');

    await cleanup(employeeId);
  });

  test('the token changes after every write, so it cannot be replayed', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    const { employeeId, employeeCode, email, rowVersion } = created.body;

    const updated = await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, position: 'First Change' }),
      rowVersion,
    });

    assert.notEqual(updated.body.rowVersion, rowVersion);

    // The new token works, proving the sequence continues rather than locking up.
    const again = await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, position: 'Second Change' }),
      rowVersion: updated.body.rowVersion,
    });

    assert.equal(again.status, 200);
    assert.equal(again.body.position, 'Second Change');

    await cleanup(employeeId);
  });
});

/* ==================================================================== */
/* C-01  Authorisation                                                   */
/* ==================================================================== */

describe('C-01 role based authorisation', () => {
  test('the token and profile carry the role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    assert.equal(res.body.user.role, 'Admin');

    const me = await api('get', '/api/v1/auth/me');
    assert.equal(me.body.role, 'Admin');
  });

  test('a viewer may read employees', async () => {
    const res = await asViewer('get', '/api/v1/employees');
    assert.equal(res.status, 200);
  });

  test('a viewer may read the report', async () => {
    const res = await asViewer('get', '/api/v1/reports/employees');
    assert.equal(res.status, 200);
  });

  const writes = [
    ['create', 'post', '/api/v1/employees'],
    ['update', 'put', '/api/v1/employees/1'],
    ['delete', 'delete', '/api/v1/employees/1'],
  ];

  for (const [label, method, url] of writes) {
    test(`a viewer is refused ${label} with 403`, async () => {
      const res = await asViewer(method, url, method === 'delete' ? undefined : buildEmployee());

      // 403 not 401: the credentials are valid, the permission is not.
      assert.equal(res.status, 403, `viewer should not be able to ${label}`);
      assert.match(res.body.message, /permission/i);
    });
  }

  test('an unauthenticated request is still 401, not 403', async () => {
    const res = await request(app).get('/api/v1/employees');
    assert.equal(res.status, 401);
  });
});

/* ==================================================================== */
/* C-02  Soft delete                                                     */
/* ==================================================================== */

describe('C-02 soft delete', () => {
  test('a deleted employee disappears from reads but the row is retained', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    const { employeeId } = created.body;

    const deleted = await api('delete', `/api/v1/employees/${employeeId}`);
    assert.equal(deleted.status, 204);

    const fetched = await api('get', `/api/v1/employees/${employeeId}`);
    assert.equal(fetched.status, 404, 'should be invisible to reads');

    // The row survives, which is the whole point: the history is still there.
    const history = await api('get', `/api/v1/employees/${employeeId}/history`);
    assert.equal(history.status, 200);
    assert.ok(history.body.some((e) => e.action === 'Delete'));
  });

  test('a deleted employee is excluded from the list and its totals', async () => {
    const before = await api('get', '/api/v1/employees?pageSize=1');
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const during = await api('get', '/api/v1/employees?pageSize=1');
    assert.equal(during.body.total, before.body.total + 1);

    await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    const afterDelete = await api('get', '/api/v1/employees?pageSize=1');
    assert.equal(afterDelete.body.total, before.body.total);
  });

  test('a deleted employee is excluded from the report totals', async () => {
    const before = await api('get', '/api/v1/reports/employees');
    const created = await api('post', '/api/v1/employees', buildEmployee({ salary: 123456 }));

    await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    const after = await api('get', '/api/v1/reports/employees');
    assert.equal(after.body.summary.headcount, before.body.summary.headcount);
    assert.equal(
      Number(after.body.summary.totalMonthlyPayroll),
      Number(before.body.summary.totalMonthlyPayroll),
      'a deleted salary must not linger in payroll'
    );
  });

  // The unique constraints are filtered to live rows, so a departed
  // employee does not permanently reserve their code and email.
  test('a deleted employee releases its code and email for reuse', async () => {
    const original = buildEmployee();
    const created = await api('post', '/api/v1/employees', original);

    await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    const reused = await api('post', '/api/v1/employees', original);
    assert.equal(reused.status, 201, 'the code and email should be free again');

    await cleanup(reused.body.employeeId);
  });

  test('deleting twice returns 404 the second time', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const first = await api('delete', `/api/v1/employees/${created.body.employeeId}`);
    const second = await api('delete', `/api/v1/employees/${created.body.employeeId}`);

    assert.equal(first.status, 204);
    assert.equal(second.status, 404);
  });
});

/* ==================================================================== */
/* C-03  Audit trail                                                     */
/* ==================================================================== */

describe('C-03 audit trail', () => {
  test('creating an employee records who created it', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());

    const history = await api('get', `/api/v1/employees/${created.body.employeeId}/history`);

    assert.equal(history.status, 200);
    const entry = history.body.find((e) => e.action === 'Create');
    assert.ok(entry, 'expected a Create entry');
    assert.equal(entry.changedBy, 'admin');
    assert.ok(entry.changedAt);

    await cleanup(created.body.employeeId);
  });

  test('an update records the field, the old value and the new value', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee({ salary: 50000 }));
    const { employeeId, employeeCode, email, rowVersion } = created.body;

    await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, salary: 65000 }),
      rowVersion,
    });

    const history = await api('get', `/api/v1/employees/${employeeId}/history`);
    const salaryChange = history.body.find((e) => e.fieldName === 'salary');

    assert.ok(salaryChange, 'expected the salary change to be recorded');
    assert.equal(salaryChange.action, 'Update');
    assert.equal(Number(salaryChange.oldValue), 50000);
    assert.equal(Number(salaryChange.newValue), 65000);
    assert.equal(salaryChange.changedBy, 'admin');

    await cleanup(employeeId);
  });

  test('only changed fields are recorded, not every column', async () => {
    const original = buildEmployee({ position: 'Original' });
    const created = await api('post', '/api/v1/employees', original);
    const { employeeId, employeeCode, email, rowVersion } = created.body;

    await api('put', `/api/v1/employees/${employeeId}`, {
      ...original,
      employeeCode,
      email,
      position: 'Updated Only',
      rowVersion,
    });

    const history = await api('get', `/api/v1/employees/${employeeId}/history`);
    const updates = history.body.filter((e) => e.action === 'Update');

    assert.equal(updates.length, 1, 'exactly one field changed');
    assert.equal(updates[0].fieldName, 'position');

    await cleanup(employeeId);
  });

  test('history is ordered newest first', async () => {
    const created = await api('post', '/api/v1/employees', buildEmployee());
    const { employeeId, employeeCode, email, rowVersion } = created.body;

    await api('put', `/api/v1/employees/${employeeId}`, {
      ...buildEmployee({ employeeCode, email, position: 'Later Change' }),
      rowVersion,
    });

    const history = await api('get', `/api/v1/employees/${employeeId}/history`);

    assert.equal(history.body[0].action, 'Update');
    assert.equal(history.body.at(-1).action, 'Create');

    await cleanup(employeeId);
  });

  test('history for an employee that never existed is 404', async () => {
    const res = await api('get', '/api/v1/employees/99999999/history');
    assert.equal(res.status, 404);
  });

  // Regression: existence used to be inferred from "has audit rows", so
  // every seeded employee - all of which predate the audit trail - was
  // reported as missing when its history was requested.
  test('an employee that predates the audit trail returns an empty history, not 404', async () => {
    const seeded = await api('get', '/api/v1/employees?search=EMP-001');
    const employeeId = seeded.body.data[0].employeeId;

    const res = await api('get', `/api/v1/employees/${employeeId}/history`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});
