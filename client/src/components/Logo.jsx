export function Logo({ size = "md" }) {
  const sizes = {
    sm: { box: "h-8 w-8 rounded-lg text-sm", text: "text-base" },
    md: { box: "h-10 w-10 rounded-xl text-lg", text: "text-xl" },
    lg: { box: "h-14 w-14 rounded-2xl text-2xl", text: "text-3xl" },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex ${s.box} shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white shadow-sm`}
      >
        A
      </div>
      <span className={`${s.text} font-semibold tracking-tight text-slate-900`}>AVIV ERP</span>
    </div>
  );
}
