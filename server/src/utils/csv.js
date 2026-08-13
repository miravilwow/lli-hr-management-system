function escapeField(value) {
  if (value === null || value === undefined) return '';

  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsvRow(values) {
  return values.map(escapeField).join(',');
}

function toCsv(rows, columns) {
  const header = toCsvRow(columns.map((c) => c.header));

  const body = rows.map((row) =>
    toCsvRow(columns.map((c) => (c.format ? c.format(row[c.key]) : row[c.key])))
  );

  return [header, ...body].join('\r\n');
}

module.exports = { toCsv, toCsvRow };
