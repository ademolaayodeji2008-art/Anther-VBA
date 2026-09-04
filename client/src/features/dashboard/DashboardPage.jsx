import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Wallet, HandCoins, Clock, AlertTriangle, PackageX } from "lucide-react";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { formatCurrency } from "../../utils/format";

const BRAND = "#4f46e5"; // brand-600, matches tailwind.config.js

function formatDayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-slate-500">{formatDayLabel(label)}</p>
      <p className="font-semibold text-slate-800">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: async () => (await api.get("/reports/dashboard")).data,
  });

  return (
    <div>
      <PageHeader title="Dashboard" />
      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's Sales" value={formatCurrency(data.todaySales)} tone="success" icon={TrendingUp} />
            <StatCard label="Today's Purchases" value={formatCurrency(data.todayPurchases)} icon={ShoppingBag} />
            <StatCard label="Receivables Outstanding" value={formatCurrency(data.receivablesTotal)} tone="warning" icon={Wallet} />
            <StatCard label="Payables (Credit Purchases)" value={formatCurrency(data.payablesTotal)} tone="warning" icon={HandCoins} />
            <StatCard
              label="Pending Sales"
              value={`${data.pendingSalesCount} (${formatCurrency(data.pendingSalesTotal)})`}
              icon={Clock}
            />
            <StatCard
              label="Overdue Invoices"
              value={data.overdueInvoiceCount}
              tone={data.overdueInvoiceCount > 0 ? "danger" : "default"}
              icon={AlertTriangle}
            />
            <StatCard
              label="Low Stock Items"
              value={data.lowStockCount}
              tone={data.lowStockCount > 0 ? "danger" : "default"}
              icon={PackageX}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-800">Sales — last 14 days</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.salesTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeWidth={1} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDayLabel}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={BRAND}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="url(#salesFill)"
                      activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Lowest stock</h2>
              <ul className="mt-4 space-y-3">
                {data.lowStockItems?.length ? (
                  data.lowStockItems.map((item) => (
                    <li key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.name}</span>
                      <span
                        className={`font-medium tabular-nums ${
                          item.stockOnHand < item.lowStockThreshold ? "text-red-600" : "text-slate-500"
                        }`}
                      >
                        {item.stockOnHand} on hand
                      </span>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No items yet.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
