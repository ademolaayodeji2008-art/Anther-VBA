import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useList, useCreate, useUpdate, useRemove } from "../../api/useResource";
import { api } from "../../api/client";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "items";

function AnalyticsPanel({ itemId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["items", "analytics", itemId],
    queryFn: async () => (await api.get(`/items/${itemId}/analytics`)).data,
    enabled: !!itemId,
  });

  if (isLoading) return <p className="py-4 text-center text-sm text-slate-500">Loading analytics…</p>;
  if (!data) return null;

  const { purchase, sales, profit, stock, costTrend } = data;

  const costTrendDisplay = () => {
    if (costTrend === "NO_PURCHASE_HISTORY") return { text: "No purchase history", color: "text-slate-400" };
    if (costTrend === "UNCHANGED") return { text: "Cost unchanged", color: "text-amber-600" };
    if (costTrend.startsWith("INCREASED")) return { text: `Cost increased by NGN ${costTrend.split("_BY_")[1]}`, color: "text-red-600" };
    if (costTrend.startsWith("REDUCED")) return { text: `Cost reduced by NGN ${costTrend.split("_BY_")[1]}`, color: "text-green-600" };
    return { text: costTrend, color: "text-slate-600" };
  };
  const trend = costTrendDisplay();

  return (
    <div className="space-y-5 text-sm">
      {/* Stock status */}
      <div className="flex items-center gap-4 rounded-lg bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs text-slate-400">Stock on Hand</p>
          <p className="text-xl font-bold text-slate-800">{stock.stockOnHand.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Net Adjustments</p>
          <p className="font-semibold text-slate-700">{stock.netAdjustment >= 0 ? "+" : ""}{stock.netAdjustment.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Inventory Value</p>
          <p className="font-semibold text-slate-700">{formatCurrency(stock.inventoryValue)}</p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-slate-400">Cost Trend</p>
          <p className={`font-medium ${trend.color}`}>{trend.text}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Purchase analytics */}
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase History</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Qty Purchased</span>
              <span className="font-medium">{purchase.totalQty.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Purchase Value</span>
              <span className="font-medium">{formatCurrency(purchase.totalValue)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-500">Avg Cost Price</span>
              <span className="font-semibold">{formatCurrency(purchase.averageCostPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Purchase Price</span>
              <span className="font-medium">{formatCurrency(purchase.lastPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Purchase Date</span>
              <span className="font-medium">{formatDate(purchase.lastDate)}</span>
            </div>
          </div>
        </div>

        {/* Sales analytics */}
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sales History</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Qty Sold</span>
              <span className="font-medium">{sales.totalQty.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Sales Value</span>
              <span className="font-medium">{formatCurrency(sales.totalValue)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-500">Avg Selling Price</span>
              <span className="font-semibold">{formatCurrency(sales.averageSellingPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Selling Price</span>
              <span className="font-medium">{formatCurrency(sales.lastPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Sale Date</span>
              <span className="font-medium">{formatDate(sales.lastDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profit summary */}
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Profit Analysis</p>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-slate-400">Actual Profit per Unit</p>
            <p className={`text-lg font-bold ${profit.actualProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(profit.actualProfit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Profit %</p>
            <p className={`text-lg font-bold ${profit.actualProfitPct >= 0 ? "text-green-600" : "text-red-600"}`}>
              {profit.actualProfitPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemForm({ defaultValues, onSubmit, submitting, isEdit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Item Name</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Cost Price</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("costPrice", { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Selling Price</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("sellingPrice", { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Pack Converter</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("packConverter", { valueAsNumber: true, min: 1 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Low Stock Threshold</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("lowStockThreshold", { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Opening Stock</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("openingStock", { valueAsNumber: true, min: 0 })}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register("isVatable")} />
        VAT applicable
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function ItemsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("items:manage");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [analyticsItem, setAnalyticsItem] = useState(null);

  const { data, isLoading } = useList(RESOURCE, { search });
  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);
  const removeMutation = useRemove(RESOURCE);

  const columns = [
    { key: "name", header: "Item Name" },
    {
      key: "stockOnHand",
      header: "Stock on Hand",
      render: (row) => (
        <span className={row.stockOnHand < row.lowStockThreshold ? "font-semibold text-red-600" : ""}>
          {row.stockOnHand}
          {row.stockOnHand < row.lowStockThreshold && " (Low)"}
        </span>
      ),
    },
    { key: "costPrice", header: "Cost Price", render: (row) => formatCurrency(row.costPrice) },
    { key: "sellingPrice", header: "Selling Price", render: (row) => formatCurrency(row.sellingPrice) },
    { key: "marginPct", header: "Margin %", render: (row) => `${row.marginPct?.toFixed(1) ?? 0}%` },
    { key: "active", header: "Status", render: (row) => (row.active ? "Active" : "Inactive") },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex gap-3">
                <button className="text-blue-600 hover:underline" onClick={() => setAnalyticsItem(row)}>
                  Analysis
                </button>
                <button className="text-blue-600 hover:underline" onClick={() => setModal(row)}>
                  Edit
                </button>
                {row.active && (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => removeMutation.mutate(row._id)}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            ),
          },
        ]
      : [
          {
            key: "analysis",
            header: "",
            render: (row) => (
              <button className="text-blue-600 hover:underline" onClick={() => setAnalyticsItem(row)}>
                Analysis
              </button>
            ),
          },
        ]),
  ];

  const handleSubmit = async (values) => {
    if (modal && modal !== "create") {
      await updateMutation.mutateAsync({ id: modal._id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setModal(null);
  };

  return (
    <div>
      <PageHeader
        title="Items"
        action={canManage && <Button onClick={() => setModal("create")}>Add Item</Button>}
      />
      <input
        placeholder="Search items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No items yet." />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Add Item" : "Edit Item"}>
        <ItemForm
          defaultValues={modal && modal !== "create" ? modal : { packConverter: 1, lowStockThreshold: 10 }}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
          isEdit={modal && modal !== "create"}
        />
      </Modal>

      <Modal
        open={!!analyticsItem}
        onClose={() => setAnalyticsItem(null)}
        title={analyticsItem ? `Analysis — ${analyticsItem.name}` : ""}
        wide
      >
        {analyticsItem && (
          <AnalyticsPanel itemId={analyticsItem._id} onClose={() => setAnalyticsItem(null)} />
        )}
      </Modal>
    </div>
  );
}
