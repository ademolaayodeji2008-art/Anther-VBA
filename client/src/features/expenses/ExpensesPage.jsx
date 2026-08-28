import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useList, useCreate, useUpdate, useRemove } from "../../api/useResource";
import { api } from "../../api/client";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "expenses";

// Common Nigerian expense categories matching VBA's dynamic category columns
const DEFAULT_CATEGORIES = [
  "Rent / Lease",
  "Salaries & Wages",
  "Electricity",
  "Internet & Telephone",
  "Transport & Logistics",
  "Office Supplies",
  "Repairs & Maintenance",
  "Advertisement & Marketing",
  "Printing & Stationery",
  "Bank Charges",
  "Security",
  "Cleaning & Sanitation",
  "Fuel",
  "Entertainment",
  "Professional Fees",
  "Insurance",
  "Tax & Levies",
  "Fixed Asset",
  "Miscellaneous",
];

function ExpenseForm({ defaultValues, onSubmit, submitting, banks, serverCategories }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues ?? {
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: "CASH",
    },
  });

  const paymentMethod = watch("paymentMethod");
  const isCash = paymentMethod === "CASH";

  // Merge server-known categories with the default list (deduped)
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...(serverCategories ?? [])])
  ).sort();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("date", { required: "Date is required" })}
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Expense No</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-slate-500"
            value={defaultValues?.expenseNo ?? "Auto-generated"}
            readOnly
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Particulars</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          placeholder="Describe what was paid for…"
          {...register("particulars", { required: "Particulars are required" })}
        />
        {errors.particulars && <p className="mt-1 text-sm text-red-600">{errors.particulars.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("category", { required: "Category is required" })}
          >
            <option value="">Select category…</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Amount (NGN)</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("amount", { valueAsNumber: true, required: "Amount is required", min: { value: 0.01, message: "Amount must be greater than zero" } })}
          />
          {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Payment Method</label>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("paymentMethod", { required: true })}
          >
            <option value="CASH">Cash</option>
            <option value="TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="POS">POS</option>
            <option value="DIRECT_DEBIT">Direct Debit</option>
          </select>
        </div>
        {!isCash && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Bank Account</label>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...register("bank", { required: !isCash })}
            >
              <option value="">Select bank…</option>
              {banks?.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Remarks (optional)</label>
        <textarea
          rows={2}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("remarks")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register("isFixedAsset")} />
        This is a Fixed Asset purchase
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Expense"}
        </Button>
      </div>
    </form>
  );
}

export function ExpensesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("expenses:post");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | expense-object

  const queryParams = {
    search,
    ...(filterCategory && { category: filterCategory }),
    ...(filterPaymentMethod && { paymentMethod: filterPaymentMethod }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data, isLoading } = useList(RESOURCE, queryParams);
  const { data: banksData } = useList("bank-accounts", { limit: 200 });

  // Load dynamic categories from server
  const { data: serverCategories } = useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: async () => (await api.get("/expenses/categories")).data,
  });

  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);
  const removeMutation = useRemove(RESOURCE);
  const queryClient = useQueryClient();

  // Compute running totals from current page result
  const totalAmount = (data?.items ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const columns = [
    { key: "expenseNo", header: "Expense No" },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "particulars", header: "Particulars" },
    { key: "category", header: "Category" },
    { key: "paymentMethod", header: "Method" },
    {
      key: "bank",
      header: "Bank",
      render: (row) => row.bank?.name ?? (row.paymentMethod === "CASH" ? "—" : "—"),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatCurrency(row.amount),
    },
    {
      key: "isFixedAsset",
      header: "Asset",
      render: (row) => (row.isFixedAsset ? <Badge status="ACTIVE" /> : null),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex gap-3">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => setModal({ ...row, date: row.date?.slice?.(0, 10) ?? new Date(row.date).toISOString().slice(0, 10) })}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => {
                    if (window.confirm(`Delete expense ${row.expenseNo}?`)) {
                      removeMutation.mutate(row._id, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] }),
                      });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const handleSubmit = async (values) => {
    if (modal && modal !== "create") {
      await updateMutation.mutateAsync({ id: modal._id, ...values });
    } else {
      await createMutation.mutateAsync(values);
      queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] });
    }
    setModal(null);
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        action={canManage && <Button onClick={() => setModal("create")}>Record Expense</Button>}
      />

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search expenses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {(serverCategories ?? DEFAULT_CATEGORIES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="TRANSFER">Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="POS">POS</option>
          <option value="DIRECT_DEBIT">Direct Debit</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          title="From date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          title="To date"
        />
        {(search || filterCategory || filterPaymentMethod || startDate || endDate) && (
          <button
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            onClick={() => {
              setSearch("");
              setFilterCategory("");
              setFilterPaymentMethod("");
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary bar */}
      {data?.items?.length > 0 && (
        <div className="mb-4 flex items-center gap-6 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
          <span className="text-slate-500">
            Showing <span className="font-medium text-slate-700">{data.items.length}</span>{" "}
            of <span className="font-medium text-slate-700">{data.total}</span> records
          </span>
          <span className="text-slate-500">
            Page total:{" "}
            <span className="font-semibold text-slate-800">{formatCurrency(totalAmount)}</span>
          </span>
        </div>
      )}

      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No expenses recorded yet." />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Record Expense" : `Edit Expense — ${modal?.expenseNo ?? ""}`}
        wide
      >
        <ExpenseForm
          defaultValues={modal !== "create" ? modal : undefined}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
          banks={banksData?.items}
          serverCategories={serverCategories}
        />
      </Modal>
    </div>
  );
}
