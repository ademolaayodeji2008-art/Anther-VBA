import { Schema } from "mongoose";

const purchaseLineSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export const purchaseOrderSchema = new Schema(
  {
    billNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    items: {
      type: [purchaseLineSchema],
      validate: { validator: (v) => v.length > 0, message: "At least one item line is required" },
    },
    category: { type: String, trim: true },
    paymentType: { type: String, enum: ["CASH", "BANK", "CREDIT"], required: true },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    status: { type: String, enum: ["POSTED", "PENDING"], default: "POSTED" },
    total: { type: Number, required: true, min: 0 },
    postedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ date: -1 });
purchaseOrderSchema.index({ vendor: 1 });
