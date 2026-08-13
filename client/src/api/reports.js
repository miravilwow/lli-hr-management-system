import api from './client';

export function fetchEmployeeReport(params) {
  return api.get('/reports/employees', { params }).then((res) => res.data);
}

export async function downloadEmployeeReportCsv(params) {
  const response = await api.get('/reports/employees/export', {
    params,
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'employee-report.csv';

  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
