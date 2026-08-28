import mongoose from "mongoose";
import SalesOrder from "../models/SalesOrder.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";
import { postBankTransaction } from "./bankLedgerService.js";

function computeTotals(items) {
  const subtotal = items.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const vatTotal = items.reduce((sum, line) => sum + (line.vat ?? 0), 0);
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
}

/**
 * Creates a sales order, and — only when status is POSTED (i.e. "picked", matching the VBA's
 * Picked/Not Yet Picked distinction) — decrements stock per line and, for BANK payments, posts
 * a matching deposit to the bank ledger. All three writes happen in one transaction.
 */
export async function createSalesOrder(input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const seq = await nextSequence("RCT", { session });
      const receiptNo = formatSequence("RCT", seq);
      const items = input.items.map((line) => {
        const converter = line.saleType === "BUNDLE" ? line.converter : 1;
        return { ...line, converter, stockQty: line.qty * converter, lineTotal: line.qty * line.unitPrice };
      });
      const totals = computeTotals(items);

      [order] = await SalesOrder.create(
        [
          {
            receiptNo,
            date: input.date,
            customer: input.customer,
            items,
            paymentType: input.paymentType,
            bank: input.bank,
            status: input.status ?? "POSTED",
            ...totals,
            postedBy,
          },
        ],
        { session }
      );

      if (order.status === "POSTED") {
        for (const line of items) {
          await recordStockMovement(
            { item: line.item, qty: -line.stockQty, type: "SALE", sourceRef: receiptNo, createdBy: postedBy },
            { session }
          );
        }
        if (order.paymentType === "BANK") {
          await postBankTransaction(
            {
              bank: order.bank,
              type: "INCOME",
              deposit: totals.grandTotal,
              date: order.date,
              ref: receiptNo,
              sourceModule: "SalesOrder",
              narration: `Sales receipt ${receiptNo}`,
              postedBy,
            },
            { session }
          );
        }
      }
    });
    return order;
  } finally {
    session.endSession();
  }
}
