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

const RESOURCE = "sales-orders";

function SalesOrderForm({ customers, items, banks, fabricOptions, onSubmit, submitting }) {
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      paymentType: "CASH",
      status: "POSTED",
      items: [{ item: "", qty: 1, unitPrice: 0, vat: 0, colour: "", pattern: "", nature: "", saleType: "YARD", converter: 1 }],
    },
  });
  const paymentType = watch("paymentType");

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
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("status")}>
            <option value="POSTED">Posted (Picked)</option>
            <option value="PENDING">Pending (Not Yet Picked)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Payment Type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("paymentType")}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CREDIT">Credit</option>
          </select>
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
      </div>

      <LineItemsEditor
        control={control}
        register={register}
        watch={watch}
        itemOptions={items}
        withVat
        withFabricAttributes
        fabricOptions={fabricOptions}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post Sale"}
        </Button>
      </div>
    </form>
  );
}

export function SalesOrdersPage() {
  const { hasPermission } = useAuth();
  const canPost = hasPermission("sales:post");
  const [modalOpen, setModalOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(null);

  const { data, isLoading } = useList(RESOURCE);
  const { data: customersData } = useList("customers", { limit: 200, active: true });
  const { data: itemsData } = useList("items", { limit: 200, active: true });
  const itemNameById = new Map((itemsData?.items ?? []).map((i) => [i._id, i.name]));
  const { data: banksData } = useList("bank-accounts", { limit: 200 });
  const { data: fabricOptions } = useFabricOptions();
  const createMutation = useCreate(RESOURCE, { relatedResources: ["items", "bank-transactions"] });

  const columns = [
    { key: "receiptNo", header: "Receipt No" },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "customer", header: "Customer", render: (row) => row.customer?.name },
    { key: "paymentType", header: "Payment Type" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    { key: "grandTotal", header: "Grand Total", render: (row) => formatCurrency(row.grandTotal) },
    {
      key: "print",
      header: "",
      render: (row) => (
        <button className="text-slate-500 hover:underline" onClick={() => setPrintingOrder(row)}>
          Print
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
      <PageHeader
        title="Sales Orders"
        action={canPost && <Button onClick={() => setModalOpen(true)}>New Sale</Button>}
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No sales orders yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Sale" wide>
        <SalesOrderForm
          customers={customersData?.items}
          items={itemsData?.items}
          banks={banksData?.items}
          fabricOptions={fabricOptions}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!printingOrder} onClose={() => setPrintingOrder(null)} title="Print Sales Receipt" wide>
        {printingOrder && (
          <>
            <PrintableDocument
              docType="Sales Receipt"
              docNo={printingOrder.receiptNo}
              date={printingOrder.date}
              party={printingOrder.customer?.name}
              partyLabel="Sold to"
              meta={[
                { label: "Payment", value: printingOrder.paymentType },
                { label: "Status", value: printingOrder.status },
              ]}
              lines={(printingOrder.items ?? []).map((line) => ({
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
                { label: "Subtotal", value: printingOrder.subtotal },
                { label: "VAT", value: printingOrder.vatTotal },
                { label: "Grand Total", value: printingOrder.grandTotal, emphasis: true },
              ]}
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
