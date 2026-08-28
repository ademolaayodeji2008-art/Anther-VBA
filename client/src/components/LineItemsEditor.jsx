import { useFieldArray } from "react-hook-form";

const SALE_TYPE_LABELS = { YARD: "Yard", TROUSER: "Trouser", BUNDLE: "Bundle" };

/**
 * Reusable repeated item/qty/unitPrice(/vat) row editor shared by sales, purchase, invoice, and
 * return forms. `withFabricAttributes` adds the mandatory Colour/Pattern/Nature/Sale Type(/
 * Converter) fields the source requires on every sales and invoice line — Purchase Orders never
 * had them, so that form simply doesn't pass the flag. `withDescription` adds the free-text
 * per-line description Invoices require but Sales doesn't.
 */
export function LineItemsEditor({
  control,
  register,
  watch,
  name = "items",
  itemOptions,
  withVat = false,
  withDescription = false,
  withFabricAttributes = false,
  fabricOptions,
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  const newLine = {
    item: "",
    qty: 1,
    unitPrice: 0,
    vat: 0,
    ...(withDescription && { description: "" }),
    ...(withFabricAttributes && { colour: "", pattern: "", nature: "", saleType: "YARD", converter: 1 }),
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Line Items</label>
      {fields.map((field, index) => {
        const saleType = withFabricAttributes ? watch?.(`${name}.${index}.saleType`) : null;
        return (
          <div key={field.id} className="space-y-2 rounded border border-slate-200 p-2">
            <div className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-4">
                <label className="block text-xs text-slate-500">Item</label>
                <select
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`${name}.${index}.item`, { required: true })}
                >
                  <option value="">Select item…</option>
                  {itemOptions?.map((opt) => (
                    <option key={opt._id} value={opt._id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500">Qty</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`${name}.${index}.qty`, { valueAsNumber: true, required: true, min: 0.01 })}
                />
              </div>
              <div className={withVat ? "col-span-2" : "col-span-3"}>
                <label className="block text-xs text-slate-500">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`${name}.${index}.unitPrice`, { valueAsNumber: true, required: true, min: 0 })}
                />
              </div>
              {withVat && (
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">VAT</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    {...register(`${name}.${index}.vat`, { valueAsNumber: true, min: 0 })}
                  />
                </div>
              )}
              <div className="col-span-1">
                <button type="button" onClick={() => remove(index)} className="text-sm text-red-600">
                  ✕
                </button>
              </div>
            </div>

            {withDescription && (
              <div>
                <label className="block text-xs text-slate-500">Description</label>
                <input
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  {...register(`${name}.${index}.description`, { required: true })}
                />
              </div>
            )}

            {withFabricAttributes && (
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Colour</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    {...register(`${name}.${index}.colour`, { required: true })}
                  >
                    <option value="">Select…</option>
                    {fabricOptions?.colours?.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Pattern</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    {...register(`${name}.${index}.pattern`, { required: true })}
                  >
                    <option value="">Select…</option>
                    {fabricOptions?.patterns?.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500">Nature</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    {...register(`${name}.${index}.nature`, { required: true })}
                  >
                    <option value="">Select…</option>
                    {fabricOptions?.natures?.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className={saleType === "BUNDLE" ? "col-span-2" : "col-span-3"}>
                  <label className="block text-xs text-slate-500">Sale Type</label>
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    {...register(`${name}.${index}.saleType`, { required: true })}
                  >
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
                      {...register(`${name}.${index}.converter`, { valueAsNumber: true, required: true, min: 0.01 })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => append(newLine)} className="text-sm text-blue-600 hover:underline">
        + Add line
      </button>
    </div>
  );
}
