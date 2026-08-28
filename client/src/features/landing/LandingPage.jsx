import { Navigate, Link } from "react-router-dom";
import { LayoutDashboard, Receipt, Landmark, BarChart3, ShieldCheck, Boxes } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";

const FEATURES = [
  { icon: Boxes, title: "Inventory & Sales", text: "Sales orders, purchases, stock adjustments and a live stock ledger." },
  { icon: Receipt, title: "Invoicing", text: "Formal invoices with aging status and partial-payment tracking." },
  { icon: Landmark, title: "Bank Ledger", text: "Every cash movement posted to one universal, reversible ledger." },
  { icon: ShieldCheck, title: "Payment Vouchers", text: "Raise, approve, and pay vendor vouchers with a full audit trail." },
  { icon: BarChart3, title: "Reports", text: "Sales, purchases, receivables, payables and inventory, exportable to CSV." },
  { icon: LayoutDashboard, title: "Role-based access", text: "Granular permissions per role — staff only see what they need." },
];

export function LandingPage() {
  const { status } = useAuth();

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Run your textile trading business from one place
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Sales, purchases, inventory, invoicing, banking, payment vouchers, and reporting — built
          for a single business, with a real permission system for every role on the team.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </main>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
