const COLORS = {
  POSTED: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  REVERSED: "bg-slate-200 text-slate-600",
  PAID: "bg-green-100 text-green-800",
  UNPAID: "bg-red-100 text-red-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
  NOT_YET_DUE: "bg-blue-100 text-blue-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-slate-200 text-slate-600",
  DISPOSED: "bg-slate-200 text-slate-600",
  IN_REPAIR: "bg-amber-100 text-amber-800",
  LOST: "bg-red-100 text-red-800",
};

export function Badge({ status }) {
  const cls = COLORS[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status?.replaceAll("_", " ")}
    </span>
  );
}
