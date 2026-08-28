export function ReportFilters({ startDate, endDate, onStartDate, onEndDate, groupBy, onGroupBy, groupByOptions }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-500">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDate(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDate(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      {groupByOptions && (
        <div>
          <label className="block text-xs font-medium text-slate-500">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => onGroupBy(e.target.value)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          >
            {groupByOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
