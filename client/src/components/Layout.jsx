import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Menu,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
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
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function OrgSwitcher({ currentUser }) {
  const { switchOrg } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: orgs } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: async () => (await api.get("/auth/orgs")).data,
    staleTime: 5 * 60 * 1000,
    // Only fetch when the user is actually authenticated — avoids 401/404 on the login page
    enabled: !!currentUser,
  });

  // Only render if user belongs to more than one org
  if (!orgs || orgs.length <= 1) return null;

  const currentOrg = orgs.find((o) => o.isCurrent);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        <Building2 size={14} className="text-slate-400" />
        <span className="max-w-[120px] truncate">{currentOrg?.businessName || currentOrg?.name || "Switch org"}</span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Organizations</p>
            {orgs.map((org) => (
              <button
                key={org._id}
                onClick={() => { setOpen(false); if (!org.isCurrent) switchOrg(org._id); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-700">
                  {(org.businessName || org.name)[0].toUpperCase()}
                </div>
                <span className="flex-1 truncate text-slate-700">{org.businessName || org.name}</span>
                {org.isCurrent && <Check size={13} className="text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({ onNavClick, hasPermission, hasAnyPermission }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-4">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => isVisible(item, hasPermission, hasAnyPermission));
        if (!items.length) return null;
        return (
          <div key={section.title}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors ${
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
  );
}

export function Layout() {
  const { user, logout, hasPermission, hasAnyPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0`}
      >
        {/* Logo + org name + mobile close button */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4">
          <div className="min-w-0">
            <Logo size="sm" />
            {user?.org?.name && (
              <p className="mt-0.5 truncate text-xs text-slate-400">{user.org.name}</p>
            )}
          </div>
          <button
            className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <SidebarContent
          onNavClick={() => setSidebarOpen(false)}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
        />
      </aside>

      {/* ── Right panel ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          {/* Hamburger — mobile only */}
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Logo visible on mobile when sidebar is closed */}
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>

          {/* User info + org switcher + sign out */}
          <div className="ml-auto flex items-center gap-3">
            <OrgSwitcher currentUser={user} />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initials(user?.name)}
              </div>
              <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
