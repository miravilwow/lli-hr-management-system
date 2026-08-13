const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');

const { api, closePool } = require('./helpers');

after(async () => {
  await closePool();
});

describe('GET /api/v1/reports/employees', () => {
  test('returns rows, summary totals and a department breakdown', async () => {
    const res = await api('get', '/api/v1/reports/employees');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.rows));
    assert.ok(Array.isArray(res.body.byDepartment));
    assert.equal(typeof res.body.summary.headcount, 'number');
    assert.equal(typeof res.body.summary.totalMonthlyPayroll, 'number');
  });

  test('headcount matches the number of rows returned', async () => {
    const res = await api('get', '/api/v1/reports/employees');

    assert.equal(res.body.summary.headcount, res.body.rows.length);
  });

  test('total payroll equals the sum of the row salaries', async () => {
    const res = await api('get', '/api/v1/reports/employees');

    const summed = res.body.rows.reduce((total, row) => total + Number(row.salary), 0);

    assert.equal(Number(res.body.summary.totalMonthlyPayroll), summed);
  });

  test('department breakdown headcounts add up to the overall headcount', async () => {
    const res = await api('get', '/api/v1/reports/employees');

    const summed = res.body.byDepartment.reduce((total, row) => total + row.headcount, 0);

    assert.equal(summed, res.body.summary.headcount);
  });

  test('filtering by department narrows the result', async () => {
    const all = await api('get', '/api/v1/reports/employees');
    const filtered = await api('get', '/api/v1/reports/employees?departmentId=1');

    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.summary.headcount < all.body.summary.headcount);
    assert.ok(filtered.body.rows.every((r) => r.departmentName === 'Human Resources'));
    assert.equal(filtered.body.byDepartment.length, 1);
  });

  test('filtering by status returns only that status', async () => {
    const res = await api('get', '/api/v1/reports/employees?status=Inactive');

    assert.equal(res.status, 200);
    assert.ok(res.body.rows.every((r) => r.status === 'Inactive'));
  });

  test('the hire date range is inclusive of its bounds', async () => {
    const res = await api('get', '/api/v1/reports/employees?from=2019-03-11&to=2019-03-11');

    assert.equal(res.status, 200);
    assert.ok(
      res.body.rows.every((r) => r.hireDate.slice(0, 10) === '2019-03-11'),
      'expected only employees hired on the boundary date'
    );
  });

  test('a range matching nothing returns zeroed totals rather than nulls', async () => {
    const res = await api('get', '/api/v1/reports/employees?from=1990-01-01&to=1990-12-31');

    assert.equal(res.status, 200);
    assert.equal(res.body.rows.length, 0);
    assert.equal(res.body.summary.headcount, 0);
    assert.equal(Number(res.body.summary.totalMonthlyPayroll), 0);
    assert.equal(Number(res.body.summary.averageSalary), 0);
  });

  const badFilters = [
    ['unknown status', '/api/v1/reports/employees?status=Retired'],
    ['non-numeric department', '/api/v1/reports/employees?departmentId=abc'],
    ['invalid from date', '/api/v1/reports/employees?from=not-a-date'],
    ['invalid to date', '/api/v1/reports/employees?to=32-13-2020'],
  ];

  for (const [label, url] of badFilters) {
    test(`rejects ${label} with 400`, async () => {
      const res = await api('get', url);
      assert.equal(res.status, 400);
    });
  }
});

describe('GET /api/v1/reports/employees/export', () => {
  test('responds as a CSV attachment', async () => {
    const res = await api('get', '/api/v1/reports/employees/export');

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /attachment; filename="employee-report-/);
  });

  test('has a header row, one row per employee and a totals row', async () => {
    const report = await api('get', '/api/v1/reports/employees?departmentId=1');
    const res = await api('get', '/api/v1/reports/employees/export?departmentId=1');

    const lines = res.text.trim().split(/\r?\n/);

    assert.match(lines[0], /^Employee Code,First Name,Last Name,Department/);
    assert.equal(lines.length, report.body.rows.length + 2, 'header + rows + totals');
    assert.match(lines.at(-1), /^TOTAL,/);
  });

  test('the totals row carries the payroll figure from the summary', async () => {
    const report = await api('get', '/api/v1/reports/employees?departmentId=1');
    const res = await api('get', '/api/v1/reports/employees/export?departmentId=1');

    const totalsRow = res.text.trim().split(/\r?\n/).at(-1);

    assert.ok(
      totalsRow.includes(String(report.body.summary.totalMonthlyPayroll)),
      `totals row "${totalsRow}" should contain the payroll total`
    );
  });

  test('applies the same filters as the report itself', async () => {
    const res = await api('get', '/api/v1/reports/employees/export?departmentId=1');

    const lines = res.text.trim().split(/\r?\n/).slice(1, -1);

    assert.ok(lines.length > 0);
    assert.ok(lines.every((line) => line.includes('Human Resources')));
  });

  test('rejects an invalid filter with 400 rather than exporting everything', async () => {
    const res = await api('get', '/api/v1/reports/employees/export?status=Retired');
    assert.equal(res.status, 400);
  });
});

describe('CSV escaping', () => {
  const { toCsv } = require('../src/utils/csv');

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'note', header: 'Note' },
  ];

  test('quotes fields containing a comma', () => {
    const csv = toCsv([{ name: 'Reyes, Jose', note: 'ok' }], columns);
    assert.match(csv, /"Reyes, Jose",ok/);
  });

  test('doubles inner quotes', () => {
    const csv = toCsv([{ name: 'The "Boss"', note: 'ok' }], columns);
    assert.match(csv, /"The ""Boss""",ok/);
  });

  test('quotes fields containing a newline', () => {
    const csv = toCsv([{ name: 'Line1\nLine2', note: 'ok' }], columns);
    assert.match(csv, /"Line1\nLine2",ok/);
  });

  test('renders null and undefined as empty fields', () => {
    const csv = toCsv([{ name: null, note: undefined }], columns);
    assert.equal(csv.split(/\r?\n/)[1], ',');
  });

  // A stray comma in a position or department name would otherwise shift
  // every subsequent column in the exported file.
  test('a comma in the data does not add a column', () => {
    const csv = toCsv([{ name: 'a,b', note: 'c' }], columns);
    const dataLine = csv.split(/\r?\n/)[1];

    assert.equal(dataLine, '"a,b",c');
  });
});
