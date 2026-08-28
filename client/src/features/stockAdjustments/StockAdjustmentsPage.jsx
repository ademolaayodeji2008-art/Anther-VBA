import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate, useAction } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { formatDate } from "../../utils/format";

const RESOURCE = "stock-adjustments";

const ADJUSTMENT_TYPES = [
  "INCREASE",
  "DECREASE",
  "DAMAGED",
  "EXPIRED",
  "PHYSICAL_COUNT_PLUS",
  "PHYSICAL_COUNT_MINUS",
  "OPENING_CORRECTION_PLUS",
  "OPENING_CORRECTION_MINUS",
];

function AdjustmentForm({ items, onSubmit, submitting }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      type: "DAMAGED",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Item</label>
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("item", { required: true })}>
          <option value="">Select item…</option>
          {items?.map((i) => (
            <option key={i._id} value={i._id}>{i.name} (on hand: {i.stockOnHand})</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Adjustment Date</label>
          <input
            type="date"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("date", { required: true })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("type")}>
            {ADJUSTMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Quantity</label>
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("qty", { valueAsNumber: true, required: true, min: 0.01 })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Reason</label>
        <textarea
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          rows={2}
          {...register("reason", { required: "Reason is required" })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post Adjustment"}
        </Button>
      </div>
    </form>
  );
}

export function StockAdjustmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useList(RESOURCE);
  const { data: itemsData } = useList("items", { limit: 200, active: true });
  const createMutation = useCreate(RESOURCE, { relatedResources: ["items"] });
  const reverseMutation = useAction(RESOURCE, "reverse", { relatedResources: ["items"] });

  const handleReverse = (row) => {
    const reason = window.prompt("Reason for reversing this adjustment:");
    if (!reason) return;
    reverseMutation.mutate({ id: row._id, body: { reason } });
  };

  const columns = [
    { key: "adjNo", header: "Adj No" },
    { key: "date", header: "Date", render: (row) => formatDate(row.date ?? row.createdAt) },
    { key: "item", header: "Item", render: (row) => row.item?.name },
    { key: "type", header: "Type", render: (row) => row.type.replaceAll("_", " ") },
    { key: "qty", header: "Qty" },
    { key: "reason", header: "Reason" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.status === "POSTED" && (
          <button className="text-red-600 hover:underline" onClick={() => handleReverse(row)}>
            Reverse
          </button>
        ),
    },
  ];

  const handleSubmit = async (values) => {
    await createMutation.mutateAsync(values);
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader title="Stock Adjustments" action={<Button onClick={() => setModalOpen(true)}>New Adjustment</Button>} />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No stock adjustments yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Stock Adjustment">
        <AdjustmentForm items={itemsData?.items} onSubmit={handleSubmit} submitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
