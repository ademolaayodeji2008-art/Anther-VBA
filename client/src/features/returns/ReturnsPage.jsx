import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useList, useCreate, useAction } from "../../api/useResource";
import { useFabricOptions } from "../../api/useFabricOptions";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../utils/format";

const RESOURCE = "returns";

const RETURN_REASONS = [
  "DAMAGED",
  "WRONG_COLOUR",
  "WRONG_PATTERN",
  "WRONG_ITEM",
  "QUALITY_ISSUE",
  "CUSTOMER_CANCELLATION",
  "SUPPLIER_ERROR",
  "EXPIRED",
  "OTHER",
];

function referenceEndpoint(referenceType) {
  if (referenceType === "SALES_ORDER") return "sales-orders";
  if (referenceType === "INVOICE") return "invoices";
  return "purchase-orders";
}

function referenceLabel(referenceType, doc) {
  if (referenceType === "SALES_ORDER") return `${doc.receiptNo} — ${doc.customer?.name}`;
  if (referenceType === "INVOICE") return `${doc.invoiceNo} — ${doc.customer?.name}`;
  return `${doc.billNo} — ${doc.vendor?.name}`;
}

const SALE_TYPE_LABELS = { YARD: "Yard", TROUSER: "Trouser", BUNDLE: "Bundle" };

// Colour/Pattern/Nature/Sale Type are required here — matches SalesOrder/Invoice lines, which
// is where a CUSTOMER return's original transaction data comes from. SUPPLIER returns reference
// PurchaseOrder lines, which never captured these attributes, so they're skipped entirely.
function ReturnLineItems({ control, register, watch, items, returnType, fabricOptions }) {
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const showFabricAttributes = returnType === "CUSTOMER";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Line Items</label>
      {fields.map((field, index) => {
        const saleType = watch(`items.${index}.saleType`);
        return (
          <div key={field.id} className="space-y-2 rounded border border-slate-200 p-2">
            <div className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-3">
                <label className="block text-xs text-slate-500">Item</label>
                <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.item`, { required: true })}>
                  <option value="">Select item…</option>
                  {items?.map((i) => (
                    <option key={i._id} value={i._id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500">Return Qty</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`items.${index}.qty`, { valueAsNumber: true, required: true, min: 0.01 })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true, required: true, min: 0 })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500">VAT</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`items.${index}.vat`, { valueAsNumber: true, min: 0 })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500">Reason</label>
                <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.reason`, { required: true })}>
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>{r.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <button type="button" onClick={() => remove(index)} className="text-sm text-red-600">✕</button>
              </div>
            </div>

            {showFabricAttributes && (
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Colour</label>
                  <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.colour`, { required: true })}>
                    <option value="">Select…</option>
                    {fabricOptions?.colours?.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Pattern</label>
                  <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.pattern`, { required: true })}>
                    <option value="">Select…</option>
                    {fabricOptions?.patterns?.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Nature</label>
                  <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.nature`, { required: true })}>
                    <option value="">Select…</option>
                    {fabricOptions?.natures?.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className={saleType === "BUNDLE" ? "col-span-2" : "col-span-3"}>
                  <label className="block text-xs text-slate-500">Sale Type</label>
                  <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" {...register(`items.${index}.saleType`, { required: true })}>
                    {(fabricOptions?.saleTypes ?? ["YARD", "TROUSER", "BUNDLE"]).map((t) => (
                      <option key={t} value={t}>{SALE_TYPE_LABELS[t] ?? t}</option>
                    ))}
                  </select>
                </div>
                {saleType === "BUNDLE" && (
                  <div className="col-span-1">
                    <label className="block text-xs text-slate-500">Per Bundle</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      {...register(`items.${index}.converter`, { valueAsNumber: true, required: true, min: 0.01 })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          append({ item: "", qty: 1, unitPrice: 0, vat: 0, reason: "OTHER", colour: "", pattern: "", nature: "", saleType: "YARD", converter: 1 })
        }
        className="text-sm text-blue-600 hover:underline"
      >
        + Add line
      </button>
    </div>
  );
}

function ReturnForm({ items, banks, fabricOptions, onSubmit, submitting }) {
  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      returnType: "CUSTOMER",
      referenceType: "SALES_ORDER",
      settlementType: "CASH_REFUND",
      items: [
        { item: "", qty: 1, unitPrice: 0, vat: 0, reason: "DAMAGED", colour: "", pattern: "", nature: "", saleType: "YARD", converter: 1 },
      ],
    },
  });
  const returnType = watch("returnType");
  const referenceType = watch("referenceType");
  const referenceId = watch("referenceId");
  const settlementType = watch("settlementType");

  // The Reference Type <select>'s option list depends on Return Type (native <select> silently
  // falls back to whatever option remains when the previously-selected one disappears, without
  // react-hook-form's uncontrolled ref noticing) — force both back to a valid pairing explicitly.
  useEffect(() => {
    if (returnType === "SUPPLIER") {
      setValue("referenceType", "PURCHASE_ORDER");
    } else if (referenceType === "PURCHASE_ORDER") {
      setValue("referenceType", "SALES_ORDER");
    }
    setValue("referenceId", "");
  }, [returnType]); // eslint-disable-line react-hooks/exhaustive-deps

  const referenceOptions = useList(referenceEndpoint(referenceType), { limit: 200 });
  const selectedReference = referenceOptions.data?.items?.find((d) => d._id === referenceId);

  const handleFormSubmit = (values) => {
    const party = returnType === "CUSTOMER" ? selectedReference?.customer?._id : selectedReference?.vendor?._id;
    onSubmit({ ...values, referenceId, party: party ?? values.party });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Return Type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("returnType")}>
            <option value="CUSTOMER">Customer Return</option>
            <option value="SUPPLIER">Return to Supplier</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Reference Type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("referenceType")}>
            {returnType === "CUSTOMER" ? (
              <>
                <option value="SALES_ORDER">Sales Receipt</option>
                <option value="INVOICE">Invoice</option>
              </>
            ) : (
              <option value="PURCHASE_ORDER">Purchase Order</option>
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Original Transaction</label>
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("referenceId", { required: true })}>
          <option value="">Select transaction…</option>
          {referenceOptions.data?.items?.map((doc) => (
            <option key={doc._id} value={doc._id}>{referenceLabel(referenceType, doc)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Settlement Type</label>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...register("settlementType")}>
            <option value="CASH_REFUND">Cash Refund</option>
            <option value="BANK_REFUND">Bank Refund</option>
            <option value="CREDIT_NOTE">Credit Note</option>
          </select>
        </div>
        {settlementType === "BANK_REFUND" && (
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

      <ReturnLineItems
        control={control}
        register={register}
        watch={watch}
        items={items}
        returnType={returnType}
        fabricOptions={fabricOptions}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting…" : "Post Return"}
        </Button>
      </div>
    </form>
  );
}

export function ReturnsPage() {
  const { hasPermission } = useAuth();
  const canPost = hasPermission("returns:post");
  const canReverse = hasPermission("returns:reverse");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useList(RESOURCE);
  const { data: itemsData } = useList("items", { limit: 200, active: true });
  const { data: banksData } = useList("bank-accounts", { limit: 200 });
  const { data: fabricOptions } = useFabricOptions();
  const createMutation = useCreate(RESOURCE, { relatedResources: ["items", "bank-transactions"] });
  const reverseMutation = useAction(RESOURCE, "reverse", { relatedResources: ["items", "bank-transactions"] });

  const handleReverse = (row) => {
    const reason = window.prompt("Reason for reversing this return:");
    if (!reason) return;
    reverseMutation.mutate({ id: row._id, body: { reason } });
  };

  const columns = [
    { key: "returnNo", header: "Return No" },
    { key: "returnDate", header: "Date", render: (row) => formatDate(row.returnDate) },
    { key: "returnType", header: "Type" },
    { key: "referenceType", header: "Reference Type", render: (row) => row.referenceType.replaceAll("_", " ") },
    { key: "settlementType", header: "Settlement", render: (row) => row.settlementType.replaceAll("_", " ") },
    { key: "grandTotal", header: "Amount", render: (row) => formatCurrency(row.grandTotal) },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    ...(canReverse
      ? [
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
        ]
      : []),
  ];

  const handleSubmit = async (values) => {
    await createMutation.mutateAsync(values);
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Customer & Supplier Returns"
        action={canPost && <Button onClick={() => setModalOpen(true)}>New Return</Button>}
      />
      <DataTable columns={columns} rows={data?.items} loading={isLoading} emptyMessage="No returns yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post Return" wide>
        <ReturnForm
          items={itemsData?.items}
          banks={banksData?.items}
          fabricOptions={fabricOptions}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending}
        />
      </Modal>
    </div>
  );
}
