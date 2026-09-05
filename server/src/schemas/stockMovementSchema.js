import { Schema } from "mongoose";

export const STOCK_MOVEMENT_TYPES = [
  "OPENING", "PURCHASE", "SALE", "CUSTOMER_RETURN", "SUPPLIER_RETURN", "ADJUSTMENT",
];

export const stockMovementSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    sourceRef: { type: String, trim: true },
    note: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

stockMovementSchema.index({ item: 1, date: -1 });
