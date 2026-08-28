const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50",
  secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium shadow-sm transition ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
