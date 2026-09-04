export function DataTable({
  columns,
  rows,
  loading,
  emptyMessage = "No records found.",
  onRowClick,
  rowKey = (row) => row._id ?? row.id,
}) {
  if (loading)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading…
      </div>
    );
  if (!rows?.length)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        {emptyMessage}
      </div>
    );

  return (
    // w-full + overflow-x-auto on the wrapper ensures the table scrolls horizontally
    // rather than pushing content outside the viewport
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-600"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/60"}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="max-w-xs truncate px-4 py-2 text-slate-700"
                  title={typeof row[col.key] === "string" ? row[col.key] : undefined}
                >
                  {col.render ? col.render(row) : (row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
