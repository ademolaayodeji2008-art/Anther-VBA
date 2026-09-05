import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";
import { postBankTransaction } from "./bankLedgerService.js";

export async function createPurchaseOrder(tenantDb, input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const { PurchaseOrder } = getModels(tenantDb);
      const seq = await nextSequence(tenantDb, "BILL", session);
      const billNo = formatSequence("BILL", seq);
      const items = input.items.map((line) => ({ ...line, lineTotal: line.qty * line.unitPrice }));
      const total = items.reduce((sum, l) => sum + l.lineTotal, 0);

      [order] = await PurchaseOrder.create(
        [{ billNo, date: input.date, vendor: input.vendor, items, category: input.category, paymentType: input.paymentType, bank: input.bank, status: input.status ?? "POSTED", total, postedBy }],
        { session }
      );

      if (order.status === "POSTED") {
        for (const line of items) {
          await recordStockMovement(tenantDb, { item: line.item, qty: line.qty, type: "PURCHASE", sourceRef: billNo, createdBy: postedBy }, { session });
        }
        if (order.paymentType === "BANK") {
          await postBankTransaction(tenantDb, { bank: order.bank, type: "EXPENSE", withdrawal: total, date: order.date, ref: billNo, sourceModule: "PurchaseOrder", narration: `Purchase bill ${billNo}`, postedBy }, { session });
        }
      }
    });
    return order;
  } finally {
    session.endSession();
  }
}
