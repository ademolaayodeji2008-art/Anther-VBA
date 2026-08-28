import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";
import { postBankTransaction } from "./bankLedgerService.js";

/**
 * Creates a purchase order, and — only when status is POSTED (matching the VBA's
 * Delivered/Not Yet Delivered distinction) — increments stock per line and, for BANK payments,
 * posts a matching withdrawal to the bank ledger. All writes happen in one transaction.
 */
export async function createPurchaseOrder(input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const seq = await nextSequence("BILL", { session });
      const billNo = formatSequence("BILL", seq);
      const items = input.items.map((line) => ({ ...line, lineTotal: line.qty * line.unitPrice }));
      const total = items.reduce((sum, line) => sum + line.lineTotal, 0);

      [order] = await PurchaseOrder.create(
        [
          {
            billNo,
            date: input.date,
            vendor: input.vendor,
            items,
            category: input.category,
            paymentType: input.paymentType,
            bank: input.bank,
            status: input.status ?? "POSTED",
            total,
            postedBy,
          },
        ],
        { session }
      );

      if (order.status === "POSTED") {
        for (const line of items) {
          await recordStockMovement(
            { item: line.item, qty: line.qty, type: "PURCHASE", sourceRef: billNo, createdBy: postedBy },
            { session }
          );
        }
        if (order.paymentType === "BANK") {
          await postBankTransaction(
            {
              bank: order.bank,
              type: "EXPENSE",
              withdrawal: total,
              date: order.date,
              ref: billNo,
              sourceModule: "PurchaseOrder",
              narration: `Purchase bill ${billNo}`,
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
