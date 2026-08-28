import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useList, useCreate, useUpdate, useRemove } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "bank-accounts";

function BankAccountForm({ defaultValues, onSubmit, submitting, isEdit }) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Bank Name</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("name", { required: true })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Account Number</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("accountNo", { required: true })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Account Name</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("accountName")} />
        </div>
      </div>
      {!isEdit && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Opening Balance</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...register("openingBalance", { valueAsNumber: true, min: 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Opening Balance Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              {...register("openingBalanceDate")}
            />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function BankAccountsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("bank:manage");
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useList(RESOURCE);
  const createMutation = useCreate(RESOURCE);
  const updateMutation = useUpdate(RESOURCE);
  const removeMutation = useRemove(RESOURCE);

  const columns = [
    { key: "name", header: "Bank Name" },
    { key: "accountNo", header: "Account No" },
    { key: "accountName", header: "Account Name" },
    { key: "openingBalance", header: "Opening Balance", render: (row) => formatCurrency(row.openingBalance) },
    { key: "openingBalanceDate", header: "Opening Date", render: (row) => formatDate(row.openingBalanceDate) },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    {
      key: "ledger",
      header: "",
      render: (row) => (
        <Link to={`/bank-transactions?bank=${row._id}`} className="text-blue-600 hover:underline">
          View Ledger
        </Link>
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex gap-3">
                <button className="text-blue-600 hover:underline" onClick={() => setModal(row)}>
                  Edit
                </button>
                {row.status === "ACTIVE" && (
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
      : []),
  ];

  const handleSubmit = async (values) => {
    if (modal && modal !== "create") {
      await updateMutation.mutateAsync({ id: modal._id, name: values.name, accountName: values.accountName });
    } else {
      await createMutation.mutateAsync(values);
    }
    setModal(null);
  };

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        action={canManage && <Button onClick={() => setModal("create")}>Add Bank Account</Button>}
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No bank accounts yet." />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Add Bank Account" : "Edit Bank Account"}
      >
        <BankAccountForm
          defaultValues={modal && modal !== "create" ? modal : {}}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending}
          isEdit={modal && modal !== "create"}
        />
      </Modal>
    </div>
  );
}
