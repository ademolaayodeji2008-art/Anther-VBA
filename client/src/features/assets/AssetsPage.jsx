import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate, useUpdate } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "assets";
const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "OBSOLETE"];
const STATUSES = ["ACTIVE", "DISPOSED", "IN_REPAIR", "LOST"];

function AssetForm({ defaultValues, onSubmit, submitting, isEdit }) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Asset Name</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("name", { required: true })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("category")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Assigned User</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("assignedUser")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Location</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("location")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Serial No</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("serialNo")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
          <input type="date" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("purchaseDate", { required: true })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Supplier</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("supplier")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Invoice No</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("invoiceNo")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Cost</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("cost", { valueAsNumber: true, required: true, min: 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Useful Life (years)</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("usefulLifeYears", { valueAsNumber: true, required: true, min: 1 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Depreciation Method</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("depreciationMethod")}>
            <option value="STRAIGHT_LINE">Straight Line</option>
            <option value="REDUCING_BALANCE">Reducing Balance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Condition</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("condition")}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Remarks</label>
        <textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2" rows={2} {...register("remarks")} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("assets:manage");
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useList(RESOURCE);
  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);

  const columns = [
    { key: "assetId", header: "Asset ID" },
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "location", header: "Location" },
    { key: "cost", header: "Cost", render: (row) => formatCurrency(row.cost) },
    { key: "netBookValue", header: "Net Book Value", render: (row) => formatCurrency(row.netBookValue) },
    { key: "condition", header: "Condition" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (row) => (
              <button
                className="text-blue-600 hover:underline"
                onClick={() => setModal({ ...row, purchaseDate: row.purchaseDate?.slice(0, 10) })}
              >
                Edit
              </button>
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
    }
    setModal(null);
  };

  return (
    <div>
      <PageHeader
        title="Fixed Assets"
        action={canManage && <Button onClick={() => setModal("create")}>Add Asset</Button>}
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No assets yet." />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Add Asset" : "Edit Asset"} wide>
        <AssetForm
          defaultValues={
            modal && modal !== "create" ? modal : { depreciationMethod: "STRAIGHT_LINE", condition: "NEW" }
          }
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
          isEdit={modal && modal !== "create"}
        />
      </Modal>
    </div>
  );
}
