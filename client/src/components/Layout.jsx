import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Landmark,
  ShoppingCart,
  ShoppingBag,
  SlidersHorizontal,
  ArrowLeftRight,
  FileText,
  CreditCard,
  ClipboardCheck,
  Building2,
  RotateCcw,
  BarChart3,
  PieChart,
  LineChart,
  Wallet,
  HandCoins,
  Boxes,
  UserCog,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Masters",
    items: [
      { label: "Customers", to: "/customers", icon: Users },
      { label: "Vendors", to: "/vendors", icon: Truck },
      { label: "Items", to: "/items", icon: Package },
      { label: "Bank Accounts", to: "/bank-accounts", icon: Landmark, permission: "bank:view" },
    ],
  },
  {
    title: "Transactions",
    items: [
      { label: "Sales Orders", to: "/sales-orders", icon: ShoppingCart },
      { label: "Purchase Orders", to: "/purchase-orders", icon: ShoppingBag },
      { label: "Stock Adjustments", to: "/stock-adjustments", icon: SlidersHorizontal, permission: "stock:adjust" },
      { label: "Bank Ledger", to: "/bank-transactions", icon: ArrowLeftRight, permission: "bank:view" },
    ],
  },
  {
    title: "Invoicing",
    items: [
      { label: "Invoices", to: "/invoices", icon: FileText },
      { label: "Invoice Payments", to: "/invoice-payments", icon: CreditCard },
    ],
  },
  {
    title: "Vouchers & Assets",
    items: [
      { label: "Payment Vouchers", to: "/payment-vouchers", icon: ClipboardCheck },
      { label: "Assets", to: "/assets", icon: Building2 },
      { label: "Returns", to: "/returns", icon: RotateCcw },
      { label: "Expenses", to: "/expenses", icon: Receipt },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Sales Report", to: "/reports/sales", icon: BarChart3, permission: "reports:view" },
      { label: "Purchases Report", to: "/reports/purchases", icon: PieChart, permission: "reports:view" },
      { label: "Expenses Report", to: "/reports/expenses", icon: LineChart, permission: "reports:view" },
      { label: "Receivables Report", to: "/reports/receivables", icon: Wallet, permission: "reports:view" },
      { label: "Payables Report", to: "/reports/payables", icon: HandCoins, permission: "reports:view" },
      { label: "Inventory Report", to: "/reports/inventory", icon: Boxes, anyOf: ["reports:view", "inventory:report"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Users", to: "/admin/users", icon: UserCog, permission: "users:manage" },
      { label: "Roles", to: "/admin/roles", icon: ShieldCheck, permission: "roles:manage" },
    ],
  },
];

function isVisible(item, hasPermission, hasAnyPermission) {
  if (item.permission) return hasPermission(item.permission);
  if (item.anyOf) return hasAnyPermission(...item.anyOf);
  return true;
}

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Layout() {
  const { user, logout, hasPermission, hasAnyPermission } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <Logo size="sm" />
        </div>
        <nav className="space-y-6 p-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => isVisible(item, hasPermission, hasAnyPermission));
            if (!items.length) return null;
            return (
              <div key={section.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-1.5 text-sm transition-colors ${
                            isActive
                              ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                              : "border-transparent text-slate-600 hover:bg-slate-100"
                          }`
                        }
                      >
                        <item.icon size={16} className="shrink-0" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(user?.name)}
            </div>
            <span className="text-sm text-slate-600">{user?.name}</span>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
