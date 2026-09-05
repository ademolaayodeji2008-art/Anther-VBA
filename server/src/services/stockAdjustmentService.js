import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { INCREASE_ADJUSTMENT_TYPES } from "../schemas/stockAdjustmentSchema.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";

export async function postStockAdjustment(tenantDb, { item, type, qty, reason, date, postedBy }) {
  const session = await mongoose.startSession();
  try {
    let adjustment;
    await session.withTransaction(async () => {
      const { StockAdjustment } = getModels(tenantDb);
      const seq = await nextSequence(tenantDb, "ADJ", session);
      const adjNo = formatSequence("ADJ", seq);
      const signedQty = INCREASE_ADJUSTMENT_TYPES.has(type) ? qty : -qty;
      const adjDate = date ? new Date(date) : new Date();
      [adjustment] = await StockAdjustment.create([{ adjNo, date: adjDate, item, type, qty, reason, postedBy }], { session });
      await recordStockMovement(tenantDb, { item, qty: signedQty, type: "ADJUSTMENT", date: adjDate, sourceRef: adjNo, note: reason, createdBy: postedBy }, { session });
    });
    return adjustment;
  } finally { session.endSession(); }
}

export async function reverseStockAdjustment(tenantDb, id, { reversedBy, reason }) {
  const session = await mongoose.startSession();
  try {
    let adjustment;
    await session.withTransaction(async () => {
      const { StockAdjustment } = getModels(tenantDb);
      adjustment = await StockAdjustment.findById(id).session(session);
      if (!adjustment) throw Object.assign(new Error("Not found"), { status: 404 });
      if (adjustment.status === "REVERSED") throw Object.assign(new Error("Already reversed"), { status: 400 });
      const signedQty = INCREASE_ADJUSTMENT_TYPES.has(adjustment.type) ? -adjustment.qty : adjustment.qty;
      await recordStockMovement(tenantDb, { item: adjustment.item, qty: signedQty, type: "ADJUSTMENT", sourceRef: `${adjustment.adjNo}-REVERSAL`, note: `Reversal: ${reason}`, createdBy: reversedBy }, { session });
      adjustment.status = "REVERSED"; adjustment.reversedBy = reversedBy; adjustment.reversedAt = new Date(); adjustment.reversalReason = reason;
      await adjustment.save({ session });
    });
    return adjustment;
  } finally { session.endSession(); }
}
