import { useState } from "react";
import { useForm } from "react-hook-form";
import { useList, useCreate } from "../../api/useResource";
import { useFabricOptions } from "../../api/useFabricOptions";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { LineItemsEditor } from "../../components/LineItemsEditor";
import { PrintableDocument } from "../../components/PrintableDocument";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { AlertTriangle } from "lucide-react";

const RESOURCE = "invoices";

function InvoiceForm({ customers, items, banks, fabricOptions, onSubmit, submitting }) {
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      termsDays: 30,
      items: [
        {
          item: "",
          description: "",
          qty: 1,
          unitPrice: 0,
          vat: 0,
          colour: "",
          pattern: "",
          nature: "",
          saleType: "YARD",
          converter: 1,
        },
      ],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Customer</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("customer", { required: true })}>
            <option value="">Select customer…</option>
            {customers?.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Payment Terms (days)</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            {...register("termsDays", { valueAsNumber: true, required: true, min: 0 })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Receiving Bank</label>
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("bank", { required: true })}>
          <option value="">Select bank…</option>
          {banks?.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>

      <LineItemsEditor
        control={control}
        register={register}
        watch={watch}
        itemOptions={items}
        withVat
        withDescription
        withFabricAttributes
        fabricOptions={fabricOptions}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}

function RecordPaymentForm({ invoice, onSubmit, submitting }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { method: "CASH" } });
  const method = watch("method");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <p className="text-sm text-slate-600">
        Outstanding: <span className="font-semibold">{formatCurrency(invoice.outstanding)}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700">Amount</label>
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          {...register("amount", { valueAsNumber: true, required: true, min: 0.01 })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Method</label>
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("method")}>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
        </select>
      </div>
      {method === "BANK" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Bank</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("bank", { required: true })}>
            <option value={invoice.bank?._id ?? invoice.bank}>{invoice.bank?.name ?? "Receiving bank"}</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Received By</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("receivedBy")} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post Payment"}
        </Button>
      </div>
    </form>
  );
}

export function InvoicesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("invoices:manage");
  const canPay = hasPermission("invoicePayments:record");
  const [modalOpen, setModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [overdueExpanded, setOverdueExpanded] = useState(false);

  const { data, isLoading } = useList(RESOURCE);
  const { data: customersData } = useList("customers", { limit: 200, active: true });
  const { data: itemsData } = useList("items", { limit: 200, active: true });
  const itemNameById = new Map((itemsData?.items ?? []).map((i) => [i._id, i.name]));
  const { data: banksData } = useList("bank-accounts", { limit: 200 });
  const { data: fabricOptions } = useFabricOptions();
  const createMutation = useCreate(RESOURCE, { relatedResources: ["items"] });
  const payMutation = useCreate("invoice-payments", { relatedResources: ["invoices", "bank-transactions"] });

  // Derive overdue and not-yet-due lists from current data — no extra API call needed
  const allInvoices = data?.items ?? [];
  const now = new Date();
  const overdueInvoices = allInvoices.filter(
    (inv) => inv.paymentStatus !== "PAID" && inv.dueDate && new Date(inv.dueDate) < now
  );
  const notYetDueInvoices = allInvoices.filter(
    (inv) => inv.paymentStatus !== "PAID" && inv.dueDate && new Date(inv.dueDate) >= now
  );

  const daysDiff = (dateStr) => {
    const diff = Math.round((new Date(dateStr) - now) / (1000 * 60 * 60 * 24));
    return diff;
  }

  const columns = [
    { key: "invoiceNo", header: "Invoice No" },
    { key: "customer", header: "Customer", render: (row) => row.customer?.name },
    { key: "issueDate", header: "Issue Date", render: (row) => formatDate(row.issueDate) },
    { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
    { key: "grandTotal", header: "Grand Total", render: (row) => formatCurrency(row.grandTotal) },
    { key: "outstanding", header: "Outstanding", render: (row) => formatCurrency(row.outstanding) },
    { key: "paymentStatus", header: "Payment Status", render: (row) => <Badge status={row.paymentStatus} /> },
    { key: "invoiceStatus", header: "Invoice Status", render: (row) => <Badge status={row.invoiceStatus} /> },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex gap-3">
          {canPay && row.paymentStatus !== "PAID" && (
            <button className="text-brand-600 hover:underline" onClick={() => setPayingInvoice(row)}>
              Record Payment
            </button>
          )}
          <button className="text-slate-500 hover:underline" onClick={() => setPrintingInvoice(row)}>
            Print
          </button>
        </div>
      ),
    },
  ];

  const handleCreate = async (values) => {
    await createMutation.mutateAsync(values);
    setModalOpen(false);
  };

  const handlePay = async (values) => {
    await payMutation.mutateAsync({ ...values, invoice: payingInvoice._id });
    setPayingInvoice(null);
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={canCreate && <Button onClick={() => setModalOpen(true)}>New Invoice</Button>}
      />

      {/* ── Overdue / Not-Yet-Due monitoring panel ── */}
      {!isLoading && (overdueInvoices.length > 0 || notYetDueInvoices.length > 0) && (
        <div className="mb-5 space-y-3">
          {/* Overdue alert banner */}
          {overdueInvoices.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <button
                className="flex w-full items-center justify-between"
                onClick={() => setOverdueExpanded((v) => !v)}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <AlertTriangle size={16} />
                  {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""} require attention
                </div>
                <span className="text-xs text-red-500">{overdueExpanded ? "Hide ▲" : "Show ▼"}</span>
              </button>
              {overdueExpanded && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-200 text-left text-xs font-semibold uppercase tracking-wide text-red-500">
                        <th className="py-1 pr-4">Invoice No</th>
                        <th className="py-1 pr-4">Customer</th>
                        <th className="py-1 pr-4">Due Date</th>
                        <th className="py-1 pr-4">Days Overdue</th>
                        <th className="py-1 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices.map((inv) => (
                        <tr key={inv._id} className="border-b border-red-100">
                          <td className="py-1 pr-4 font-medium text-red-700">{inv.invoiceNo}</td>
                          <td className="py-1 pr-4 text-slate-700">{inv.customer?.name}</td>
                          <td className="py-1 pr-4 text-slate-600">{formatDate(inv.dueDate)}</td>
                          <td className="py-1 pr-4 font-medium text-red-600">{Math.abs(daysDiff(inv.dueDate))} days</td>
                          <td className="py-1 text-right font-medium text-red-700">{formatCurrency(inv.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Not-yet-due summary */}
          {notYetDueInvoices.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              <span className="font-semibold">{notYetDueInvoices.length}</span> outstanding invoice{notYetDueInvoices.length !== 1 ? "s" : ""} not yet due
              {" — "}total: <span className="font-semibold">{formatCurrency(notYetDueInvoices.reduce((s, i) => s + i.outstanding, 0))}</span>
            </div>
          )}
        </div>
      )}
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No invoices yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Invoice" wide>
        <InvoiceForm
          customers={customersData?.items}
          items={itemsData?.items}
          banks={banksData?.items}
          fabricOptions={fabricOptions}
          onSubmit={handleCreate}
          submitting={createMutation.isPending}
        />
      </Modal>

      <Modal
        open={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        title={payingInvoice ? `Record Payment — ${payingInvoice.invoiceNo}` : ""}
      >
        {payingInvoice && (
          <RecordPaymentForm invoice={payingInvoice} onSubmit={handlePay} submitting={payMutation.isPending} />
        )}
      </Modal>

      <Modal open={!!printingInvoice} onClose={() => setPrintingInvoice(null)} title="Print Invoice" wide>
        {printingInvoice && (
          <>
            <PrintableDocument
              docType="Invoice"
              docNo={printingInvoice.invoiceNo}
              date={printingInvoice.issueDate}
              party={printingInvoice.customer?.name}
              meta={[
                { label: "Due Date", value: formatDate(printingInvoice.dueDate) },
                { label: "Terms", value: `${printingInvoice.termsDays} days` },
                { label: "Status", value: printingInvoice.invoiceStatus?.replaceAll("_", " ") },
              ]}
              lines={printingInvoice.items.map((line) => ({
                description: itemNameById.get(line.item) ?? line.item,
                qty: line.qty,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
                colour: line.colour,
                pattern: line.pattern,
                nature: line.nature,
                saleType: line.saleType,
                converter: line.converter,
              }))}
              totals={[
                { label: "Subtotal", value: printingInvoice.subtotal },
                { label: "VAT", value: printingInvoice.vatTotal },
                { label: "Grand Total", value: printingInvoice.grandTotal, emphasis: true },
                { label: "Amount Paid", value: printingInvoice.amountPaid },
                { label: "Outstanding", value: printingInvoice.outstanding, emphasis: true },
              ]}
              payTo={
                printingInvoice.bank
                  ? {
                      bank: printingInvoice.bank?.name ?? printingInvoice.bank,
                      accountNo: printingInvoice.bank?.accountNo,
                      accountName: printingInvoice.bank?.accountName,
                    }
                  : null
              }
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
