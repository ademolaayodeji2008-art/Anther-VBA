import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";

function computeTotals(items) {
  const subtotal = items.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const vatTotal = items.reduce((sum, line) => sum + (line.vat ?? 0), 0);
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
}

/**
 * Creates an invoice and immediately decrements stock per line (invoicing bills for goods
 * already delivered, unlike a SalesOrder which can be PENDING/not-yet-picked). No bank posting
 * happens here — money only moves when a payment is recorded against the invoice.
 */
export async function createInvoice(input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let invoice;
    await session.withTransaction(async () => {
      const invSeq = await nextSequence("INV", { session });
      const poSeq = await nextSequence("PO", { session });
      const invoiceNo = formatSequence("INV", invSeq);
      const poNo = formatSequence("PO", poSeq);

      const items = input.items.map((line) => {
        const converter = line.saleType === "BUNDLE" ? line.converter : 1;
        return { ...line, converter, stockQty: line.qty * converter, lineTotal: line.qty * line.unitPrice };
      });
      const totals = computeTotals(items);
      const issueDate = input.issueDate ?? new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + input.termsDays);

      [invoice] = await Invoice.create(
        [
          {
            invoiceNo,
            poNo,
            customer: input.customer,
            items,
            issueDate,
            termsDays: input.termsDays,
            dueDate,
            bank: input.bank,
            ...totals,
            outstanding: totals.grandTotal,
            postedBy,
          },
        ],
        { session }
      );

      for (const line of items) {
        await recordStockMovement(
          { item: line.item, qty: -line.stockQty, type: "SALE", sourceRef: invoiceNo, createdBy: postedBy },
          { session }
        );
      }
    });
    return invoice;
  } finally {
    session.endSession();
  }
}
