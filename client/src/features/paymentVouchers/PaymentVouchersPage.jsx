import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useList, useCreate, useAction } from "../../api/useResource";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { PrintableDocument } from "../../components/PrintableDocument";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDateTime } from "../../utils/format";

const RESOURCE = "payment-vouchers";

const VOUCHER_SOURCES = [
  "DIRECT_PAYMENT",
  "PAYABLE_SETTLEMENT",
  "EXPENSE_REIMBURSEMENT",
  "PURCHASE_PAYMENT",
  "ASSET_PAYMENT",
  "OTHER",
];

function VoucherLineItems({ control, register }) {
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Line Items</label>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-12 items-end gap-2 rounded border border-slate-200 p-2">
          <div className="col-span-4">
            <label className="block text-xs text-slate-500">Item / Description</label>
            <input
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              {...register(`items.${index}.item`, { required: true })}
            />
          </div>
          <div className="col-span-4">
            <label className="block text-xs text-slate-500">Details</label>
            <input className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.description`)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-500">Qty</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              {...register(`items.${index}.qty`, { valueAsNumber: true, required: true, min: 0.01 })}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-slate-500">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              {...register(`items.${index}.unitAmount`, { valueAsNumber: true, required: true, min: 0 })}
            />
          </div>
          <div className="col-span-1">
            <button type="button" onClick={() => remove(index)} className="text-sm text-red-600">✕</button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ item: "", description: "", qty: 1, unitAmount: 0 })}
        className="text-sm text-blue-600 hover:underline"
      >
        + Add line
      </button>
    </div>
  );
}

function RaiseVoucherForm({ onSubmit, submitting }) {
  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: { source: "DIRECT_PAYMENT", items: [{ item: "", description: "", qty: 1, unitAmount: 0 }] },
  });

  const source = watch("source");
  const sourceReference = watch("sourceReference");
  const isPayableSettlement = source === "PAYABLE_SETTLEMENT";

  // Load outstanding CREDIT purchase orders for the auto-fill dropdown — always fetched
  // but the dropdown is only displayed when source === PAYABLE_SETTLEMENT.
  const { data: creditPOs } = useList("purchase-orders", { paymentType: "CREDIT", status: "POSTED", limit: 200 });

  // When a payable reference is selected, auto-fill payee and line items
  const handlePayableSelect = (e) => {
    const billNo = e.target.value;
    setValue("sourceReference", billNo);
    if (!billNo) return;

    const po = creditPOs?.items?.find((p) => p.billNo === billNo);
    if (!po) return;

    // Auto-fill payee from vendor name
    setValue("payee", po.vendor?.name ?? "");

    // Auto-fill line items from PO lines
    const autoLines = po.items.map((line) => ({
      item: line.item?.name ?? "",
      description: `Settlement of payable ${billNo}`,
      qty: line.qty,
      unitAmount: line.unitPrice,
    }));
    setValue("items", autoLines.length ? autoLines : [{ item: "", description: `Settlement of ${billNo}`, qty: 1, unitAmount: po.total }]);

    // Auto-fill payee bank if vendor has address/bank info
    // (vendor bank isn't stored on PO — user fills manually if needed)
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Payee</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("payee", { required: true })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Source</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("source")}>
            {VOUCHER_SOURCES.map((s) => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payable Settlement reference picker with auto-fill */}
      {isPayableSettlement && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Payable Reference (Purchase Bill)
          </label>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={sourceReference ?? ""}
            onChange={handlePayableSelect}
          >
            <option value="">Select outstanding bill…</option>
            {(creditPOs?.items ?? []).map((po) => (
              <option key={po._id} value={po.billNo}>
                {po.billNo} — {po.vendor?.name} — {formatCurrency(po.total)}
              </option>
            ))}
          </select>
          {/* hidden field keeps sourceReference in RHF state */}
          <input type="hidden" {...register("sourceReference")} />
          {(creditPOs?.items ?? []).length === 0 && (
            <p className="mt-1 text-xs text-slate-400">No outstanding CREDIT purchase orders found.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Payee Bank</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("payeeBank")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Account No</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("payeeAccountNo")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Account Name</label>
          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("payeeAccountName")} />
        </div>
      </div>

      <VoucherLineItems control={control} register={register} />

      <div>
        <label className="block text-sm font-medium text-slate-700">Narration (optional)</label>
        <textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2" rows={2} {...register("narration")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Raising…" : "Raise Voucher"}
        </Button>
      </div>
    </form>
  );
}

function PayVoucherForm({ voucher, banks, onSubmit, submitting }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { paymentMethod: "CASH" } });
  const method = watch("paymentMethod");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <p className="text-sm text-slate-600">
        Amount: <span className="font-semibold">{formatCurrency(voucher.totalAmount)}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700">Payment Method</label>
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("paymentMethod")}>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank (Transfer/Cheque)</option>
        </select>
      </div>
      {method === "BANK" && (
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
      <div>
        <label className="block text-sm font-medium text-slate-700">Payment Reference</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("paymentReference")} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Processing…" : "Process Payment"}
        </Button>
      </div>
    </form>
  );
}

export function PaymentVouchersPage() {
  const { hasPermission } = useAuth();
  const canRaise = hasPermission("voucher:raise");
  const canApprove = hasPermission("voucher:approve");
  const canPay = hasPermission("voucher:pay");

  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [payingVoucher, setPayingVoucher] = useState(null);
  const [printingVoucher, setPrintingVoucher] = useState(null);

  const { data, isLoading } = useList(RESOURCE);
  const { data: banksData } = useList("bank-accounts", { limit: 200 });
  const createMutation = useCreate(RESOURCE);
  const approveMutation = useAction(RESOURCE, "approve");
  const rejectMutation = useAction(RESOURCE, "reject");
  const resubmitMutation = useAction(RESOURCE, "resubmit");
  const payMutation = useAction(RESOURCE, "pay", { relatedResources: ["bank-transactions"] });

  const handleReject = (row) => {
    const notes = window.prompt("Reason for rejecting this voucher:");
    if (!notes) return;
    rejectMutation.mutate({ id: row._id, body: { notes } });
  };

  const handleResubmit = (row) => {
    resubmitMutation.mutate({ id: row._id, body: {} });
  };

  const columns = [
    { key: "voucherNo", header: "Voucher No" },
    { key: "date", header: "Date", render: (row) => formatDateTime(row.date) },
    { key: "payee", header: "Payee" },
    { key: "source", header: "Source", render: (row) => row.source.replaceAll("_", " ") },
    { key: "totalAmount", header: "Amount", render: (row) => formatCurrency(row.totalAmount) },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex flex-wrap gap-3">
          {row.status === "PENDING" && canApprove && (
            <>
              <button
                className="text-blue-600 hover:underline"
                onClick={() => approveMutation.mutate({ id: row._id, body: {} })}
              >
                Approve
              </button>
              <button className="text-red-600 hover:underline" onClick={() => handleReject(row)}>
                Reject
              </button>
            </>
          )}
          {row.status === "REJECTED" && canRaise && (
            <button className="text-blue-600 hover:underline" onClick={() => handleResubmit(row)}>
              Resubmit
            </button>
          )}
          {row.status === "APPROVED" && canPay && (
            <button className="text-blue-600 hover:underline" onClick={() => setPayingVoucher(row)}>
              Pay
            </button>
          )}
          <button className="text-slate-500 hover:underline" onClick={() => setPrintingVoucher(row)}>
            Print
          </button>
        </div>
      ),
    },
  ];

  const handleRaise = async (values) => {
    await createMutation.mutateAsync(values);
    setRaiseModalOpen(false);
  };

  const handlePay = async (values) => {
    await payMutation.mutateAsync({ id: payingVoucher._id, body: values });
    setPayingVoucher(null);
  };

  return (
    <div>
      <PageHeader
        title="Payment Vouchers"
        action={canRaise && <Button onClick={() => setRaiseModalOpen(true)}>New Voucher</Button>}
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No payment vouchers yet." />

      <Modal open={raiseModalOpen} onClose={() => setRaiseModalOpen(false)} title="Raise Payment Voucher" wide>
        <RaiseVoucherForm onSubmit={handleRaise} submitting={createMutation.isPending} />
      </Modal>

      <Modal
        open={!!payingVoucher}
        onClose={() => setPayingVoucher(null)}
        title={payingVoucher ? `Pay Voucher — ${payingVoucher.voucherNo}` : ""}
      >
        {payingVoucher && (
          <PayVoucherForm
            voucher={payingVoucher}
            banks={banksData?.items}
            onSubmit={handlePay}
            submitting={payMutation.isPending}
          />
        )}
      </Modal>

      <Modal open={!!printingVoucher} onClose={() => setPrintingVoucher(null)} title="Print Voucher" wide>
        {printingVoucher && (
          <>
            <PrintableDocument
              docType="Payment Voucher"
              docNo={printingVoucher.voucherNo}
              date={printingVoucher.date}
              party={printingVoucher.payee}
              partyLabel="Payee"
              meta={[
                { label: "Source", value: printingVoucher.source.replaceAll("_", " ") },
                { label: "Status", value: printingVoucher.status },
              ]}
              lines={printingVoucher.items.map((line) => ({
                description: line.description || line.item,
                qty: line.qty,
                unitPrice: line.unitAmount,
                lineTotal: line.lineTotal ?? line.qty * line.unitAmount,
              }))}
              totals={[{ label: "Total Amount", value: printingVoucher.totalAmount, emphasis: true }]}
              note={printingVoucher.narration}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => window.print()}>Print</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
