/**
 * Escapes a single CSV field. Values containing a comma, quote or
 * newline are wrapped in quotes, with inner quotes doubled.
 */
function escapeField(value) {
  if (value === null || value === undefined) return '';

  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/** Escapes and joins a single row of already-ordered values. */
function toCsvRow(values) {
  return values.map(escapeField).join(',');
}

/**
 * Turns an array of objects into CSV text.
 * `columns` is a list of { key, header } in output order.
 */
function toCsv(rows, columns) {
  const header = toCsvRow(columns.map((c) => c.header));

  const body = rows.map((row) =>
    toCsvRow(columns.map((c) => (c.format ? c.format(row[c.key]) : row[c.key])))
  );

  return [header, ...body].join('\r\n');
}

module.exports = { toCsv, toCsvRow };
