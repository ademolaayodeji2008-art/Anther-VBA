const TONES = {
  default: { text: "text-slate-800", iconBg: "bg-slate-100", iconText: "text-slate-600" },
  danger: { text: "text-red-600", iconBg: "bg-red-50", iconText: "text-red-600" },
  warning: { text: "text-amber-600", iconBg: "bg-amber-50", iconText: "text-amber-600" },
  success: { text: "text-green-600", iconBg: "bg-green-50", iconText: "text-green-600" },
};

export function StatCard({ label, value, tone = "default", icon: Icon }) {
  const t = TONES[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.iconBg} ${t.iconText}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${t.text}`}>{value}</p>
    </div>
  );
}
