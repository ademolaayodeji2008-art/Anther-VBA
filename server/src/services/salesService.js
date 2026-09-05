import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";
import { postBankTransaction } from "./bankLedgerService.js";

function computeTotals(items) {
  const subtotal = items.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const vatTotal = items.reduce((sum, l) => sum + (l.vat ?? 0), 0);
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
}

export async function createSalesOrder(tenantDb, input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const { SalesOrder } = getModels(tenantDb);
      const seq = await nextSequence(tenantDb, "RCT", session);
      const receiptNo = formatSequence("RCT", seq);
      const items = input.items.map((line) => {
        const converter = line.saleType === "BUNDLE" ? line.converter : 1;
        return { ...line, converter, stockQty: line.qty * converter, lineTotal: line.qty * line.unitPrice };
      });
      const totals = computeTotals(items);

      [order] = await SalesOrder.create(
        [{ receiptNo, date: input.date, customer: input.customer, items, paymentType: input.paymentType, bank: input.bank, status: input.status ?? "POSTED", ...totals, postedBy }],
        { session }
      );

      if (order.status === "POSTED") {
        for (const line of items) {
          await recordStockMovement(tenantDb, { item: line.item, qty: -line.stockQty, type: "SALE", sourceRef: receiptNo, createdBy: postedBy }, { session });
        }
        if (order.paymentType === "BANK") {
          await postBankTransaction(tenantDb, { bank: order.bank, type: "INCOME", deposit: totals.grandTotal, date: order.date, ref: receiptNo, sourceModule: "SalesOrder", narration: `Sales receipt ${receiptNo}`, postedBy }, { session });
        }
      }
    });
    return order;
  } finally {
    session.endSession();
  }
}
