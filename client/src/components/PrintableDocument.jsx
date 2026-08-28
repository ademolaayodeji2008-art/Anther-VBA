import { Logo } from "./Logo";
import { formatCurrency, formatDate } from "../utils/format";

/**
 * Generic letterhead-style document, reused for Invoice and Payment Voucher print views.
 * Wrap in a Modal and pair with a "Print" button calling window.print() — the .print-area
 * class (see index.css's @media print rule) hides everything else, including the modal chrome.
 *
 * `payTo` — optional object { bank, accountNo, accountName } rendered as a "Pay To" block
 * at the bottom, matching the VBA's POS invoice "PAY TO" section.
 */
export function PrintableDocument({ docType, docNo, date, party, partyLabel = "Billed to", meta = [], lines, totals, note, payTo }) {
  return (
    <div className="print-area rounded-2xl border border-slate-200 bg-white p-8">
      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <Logo size="sm" />
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{docType}</p>
          <p className="text-lg font-bold text-slate-900">{docNo}</p>
          <p className="text-sm text-slate-500">{formatDate(date)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{partyLabel}</p>
          <p className="mt-1 font-medium text-slate-900">{party}</p>
        </div>
        <div className="flex flex-wrap gap-8">
          {meta.map((m) => (
            <div key={m.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m.label}</p>
              <p className="mt-1 font-medium text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2">
                <span>{line.description}</span>
                {(line.colour || line.pattern || line.nature) && (
                  <span className="ml-2 text-xs text-slate-400">
                    {[line.colour, line.pattern, line.nature].filter(Boolean).join(" · ")}
                  </span>
                )}
                {line.saleType && (
                  <span className="ml-2 text-xs text-slate-400">
                    {line.saleType}
                    {line.saleType === "BUNDLE" && line.converter ? ` ×${line.converter}` : ""}
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">{line.qty}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(line.unitPrice)}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrency(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-60 space-y-1">
          {totals.map((t) => (
            <div
              key={t.label}
              className={`flex justify-between text-sm ${
                t.emphasis ? "border-t border-slate-200 pt-1.5 font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              <span>{t.label}</span>
              <span className="tabular-nums">{formatCurrency(t.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pay To section — only rendered for invoices where a receiving bank is known */}
      {payTo && (payTo.bank || payTo.accountNo) && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pay To</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {payTo.bank && (
              <div>
                <p className="text-xs text-slate-400">Bank</p>
                <p className="font-medium text-slate-800">{payTo.bank}</p>
              </div>
            )}
            {payTo.accountNo && (
              <div>
                <p className="text-xs text-slate-400">Account No</p>
                <p className="font-medium text-slate-800">{payTo.accountNo}</p>
              </div>
            )}
            {payTo.accountName && (
              <div>
                <p className="text-xs text-slate-400">Account Name</p>
                <p className="font-medium text-slate-800">{payTo.accountName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {note && <p className="mt-6 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
