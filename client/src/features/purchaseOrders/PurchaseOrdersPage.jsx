import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { LineItemsEditor } from "../../components/LineItemsEditor";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "purchase-orders";

function PurchaseOrderForm({ vendors, items, banks, onSubmit, submitting }) {
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: { paymentType: "CASH", status: "POSTED", items: [{ item: "", qty: 1, unitPrice: 0 }] },
  });
  const paymentType = watch("paymentType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Vendor</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("vendor", { required: true })}>
            <option value="">Select vendor…</option>
            {vendors?.map((v) => (
              <option key={v._id} value={v._id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("category")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("status")}>
            <option value="POSTED">Posted (Delivered)</option>
            <option value="PENDING">Pending (Not Yet Delivered)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Payment Type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("paymentType")}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>
      </div>
      {paymentType === "BANK" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Bank</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("bank", { required: true })}>
            <option value="">Select bank…</option>
            {banks?.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <LineItemsEditor control={control} register={register} itemOptions={items} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post Purchase"}
        </Button>
      </div>
    </form>
  );
}

export function PurchaseOrdersPage() {
  const { hasPermission } = useAuth();
  const canPost = hasPermission("purchase:post");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useList(RESOURCE);
  const { data: vendorsData } = useList("vendors", { limit: 200, active: true });
  const { data: itemsData } = useList("items", { limit: 200, active: true });
  const { data: banksData } = useList("bank-accounts", { limit: 200 });
  const createMutation = useCreate(RESOURCE, { relatedResources: ["items", "bank-transactions"] });

  const columns = [
    { key: "billNo", header: "Bill No" },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "vendor", header: "Vendor", render: (row) => row.vendor?.name },
    { key: "category", header: "Category" },
    { key: "paymentType", header: "Payment Type" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
  ];

  const handleSubmit = async (values) => {
    await createMutation.mutateAsync(values);
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        action={canPost && <Button onClick={() => setModalOpen(true)}>New Purchase</Button>}
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No purchase orders yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Purchase" wide>
        <PurchaseOrderForm
          vendors={vendorsData?.items}
          items={itemsData?.items}
          banks={banksData?.items}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending}
        />
      </Modal>
    </div>
  );
}
