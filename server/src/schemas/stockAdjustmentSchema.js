import { Schema } from "mongoose";

export const STOCK_ADJUSTMENT_TYPES = [
  "INCREASE", "DECREASE", "DAMAGED", "EXPIRED",
  "PHYSICAL_COUNT_PLUS", "PHYSICAL_COUNT_MINUS",
  "OPENING_CORRECTION_PLUS", "OPENING_CORRECTION_MINUS",
];

export const INCREASE_ADJUSTMENT_TYPES = new Set([
  "INCREASE", "PHYSICAL_COUNT_PLUS", "OPENING_CORRECTION_PLUS",
]);

export const stockAdjustmentSchema = new Schema(
  {
    adjNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    type: { type: String, enum: STOCK_ADJUSTMENT_TYPES, required: true },
    qty: { type: Number, required: true, min: 0.01 },
    reason: { type: String, trim: true, required: true },
    status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
    postedBy: { type: Schema.Types.ObjectId },
    reversedBy: { type: Schema.Types.ObjectId },
    reversedAt: { type: Date },
    reversalReason: { type: String, trim: true },
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ item: 1, createdAt: -1 });
