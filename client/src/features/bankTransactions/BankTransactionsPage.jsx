import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useList } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "bank-transactions";

function BankAdjustmentForm({ onSubmit, submitting }) {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Deposit</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("deposit", { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Withdrawal</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("withdrawal", { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Narration</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("narration", { required: "Narration is required" })}
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

export function BankTransactionsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("bank:manage");
  const [searchParams, setSearchParams] = useSearchParams();
  const bankId = searchParams.get("bank") ?? "";
  const [modalOpen, setModalOpen] = useState(false);

  const { data: banksData } = useList("bank-accounts", { limit: 200 });
  const { data, isLoading } = useList(RESOURCE, bankId ? { bank: bankId } : {});
  const { data: balanceData } = useQuery({
    queryKey: ["bank-transactions", "balance", bankId],
    queryFn: async () => (await api.get(`/bank-transactions/balance/${bankId}`)).data,
    enabled: !!bankId,
  });
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (body) => (await api.post(`/${RESOURCE}/adjustments`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [RESOURCE] }),
  });

  const columns = [
    { key: "txnId", header: "Txn ID" },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "bank", header: "Bank", render: (row) => row.bank?.name },
    { key: "type", header: "Type", render: (row) => row.type.replaceAll("_", " ") },
    { key: "deposit", header: "Deposit", render: (row) => (row.deposit ? formatCurrency(row.deposit) : "—") },
    { key: "withdrawal", header: "Withdrawal", render: (row) => (row.withdrawal ? formatCurrency(row.withdrawal) : "—") },
    { key: "narration", header: "Narration" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
  ];

  const handleSubmit = async (values) => {
    await createMutation.mutateAsync({ ...values, bank: bankId });
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Bank Ledger"
        action={
          canManage &&
          bankId && <Button onClick={() => setModalOpen(true)}>Post Manual Adjustment</Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <select
          value={bankId}
          onChange={(e) => setSearchParams(e.target.value ? { bank: e.target.value } : {})}
          className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All banks</option>
          {banksData?.items?.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        {bankId && balanceData && (
          <StatCard label="Current Balance" value={formatCurrency(balanceData.balance)} />
        )}
      </div>

      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No transactions yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Manual Bank Adjustment">
        <BankAdjustmentForm onSubmit={handleSubmit} submitting={createMutation.isPending} />
      </Modal>
    </div>
  );
}
