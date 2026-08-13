const reportService = require('../services/reportService');
const { toCsv, toCsvRow } = require('../utils/csv');

function readFilters(query) {
  return {
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    status: query.status || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  };
}

async function employeeReport(req, res) {
  const report = await reportService.getEmployeeReport({
    ...readFilters(req.query),
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 25,
  });

  res.json(report);
}

const CSV_COLUMNS = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'departmentName', header: 'Department' },
  { key: 'position', header: 'Position' },
  { key: 'salary', header: 'Monthly Salary' },
  {
    key: 'hireDate',
    header: 'Hire Date',
    format: (value) => (value ? new Date(value).toISOString().slice(0, 10) : ''),
  },
  { key: 'status', header: 'Status' },
];

async function exportEmployeeReport(req, res) {
  const { rows, summary } = await reportService.getEmployeeReportForExport(readFilters(req.query));

  const csv = toCsv(rows, CSV_COLUMNS);

  const totals = toCsvRow([
    'TOTAL',
    '',
    '',
    `${summary.headcount} employees`,
    '',
    summary.totalMonthlyPayroll,
    '',
    '',
  ]);

  const filename = `employee-report-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`${csv}\r\n${totals}`);
}

module.exports = { employeeReport, exportEmployeeReport };
