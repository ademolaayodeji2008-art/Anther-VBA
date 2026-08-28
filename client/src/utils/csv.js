function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Builds a CSV from the same {key, header, render?} column configs each report page already
 * defines for its DataTable, and triggers a browser download. `render` (which may return JSX,
 * e.g. a <Badge>) is ignored for CSV purposes — use `csvValue(row)` on a column when its raw
 * `row[key]` wouldn't stringify sensibly (e.g. a populated nested object like `row.customer`).
 */
export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const lines = (rows ?? []).map((row) =>
    columns.map((c) => csvEscape(c.csvValue ? c.csvValue(row) : row[c.key])).join(",")
  );
  const csv = [header, ...lines].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
