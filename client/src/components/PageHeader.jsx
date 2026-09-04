export function PageHeader({ title, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
