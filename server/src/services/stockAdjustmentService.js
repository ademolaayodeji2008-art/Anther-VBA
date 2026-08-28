import mongoose from "mongoose";
import StockAdjustment, { INCREASE_ADJUSTMENT_TYPES } from "../models/StockAdjustment.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";

export async function postStockAdjustment({ item, type, qty, reason, date, postedBy }) {
  const session = await mongoose.startSession();
  try {
    let adjustment;
    await session.withTransaction(async () => {
      const seq = await nextSequence("ADJ", { session });
      const adjNo = formatSequence("ADJ", seq);
      const signedQty = INCREASE_ADJUSTMENT_TYPES.has(type) ? qty : -qty;
      const adjDate = date ? new Date(date) : new Date();

      [adjustment] = await StockAdjustment.create(
        [{ adjNo, date: adjDate, item, type, qty, reason, postedBy }],
        { session }
      );
      await recordStockMovement(
        { item, qty: signedQty, type: "ADJUSTMENT", date: adjDate, sourceRef: adjNo, note: reason, createdBy: postedBy },
        { session }
      );
    });
    return adjustment;
  } finally {
    session.endSession();
  }
}

/** Reverses a posted adjustment by appending an opposite movement — the ledger stays append-only. */
export async function reverseStockAdjustment(id, { reversedBy, reason }) {
  const session = await mongoose.startSession();
  try {
    let adjustment;
    await session.withTransaction(async () => {
      adjustment = await StockAdjustment.findById(id).session(session);
      if (!adjustment) {
        throw Object.assign(new Error("Stock adjustment not found"), { status: 404 });
      }
      if (adjustment.status === "REVERSED") {
        throw Object.assign(new Error("Stock adjustment already reversed"), { status: 400 });
      }

      const signedQty = INCREASE_ADJUSTMENT_TYPES.has(adjustment.type)
        ? -adjustment.qty
        : adjustment.qty;
      await recordStockMovement(
        {
          item: adjustment.item,
          qty: signedQty,
          type: "ADJUSTMENT",
          sourceRef: `${adjustment.adjNo}-REVERSAL`,
          note: `Reversal: ${reason}`,
          createdBy: reversedBy,
        },
        { session }
      );

      adjustment.status = "REVERSED";
      adjustment.reversedBy = reversedBy;
      adjustment.reversedAt = new Date();
      adjustment.reversalReason = reason;
      await adjustment.save({ session });
    });
    return adjustment;
  } finally {
    session.endSession();
  }
}
