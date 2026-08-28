export function PageHeader({ title, action }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {action}
    </div>
  );
}
