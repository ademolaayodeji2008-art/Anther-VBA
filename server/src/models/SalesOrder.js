import { Schema, model } from "mongoose";
import { fabricAttributeFields } from "./schemas/fabricAttributes.js";

const saleLineSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    vat: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    ...fabricAttributeFields,
  },
  { _id: false }
);

const salesOrderSchema = new Schema(
  {
    receiptNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: {
      type: [saleLineSchema],
      validate: { validator: (v) => v.length > 0, message: "At least one item line is required" },
    },
    paymentType: { type: String, enum: ["CASH", "BANK", "CREDIT"], required: true },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    status: { type: String, enum: ["POSTED", "PENDING"], default: "POSTED" },
    subtotal: { type: Number, required: true, min: 0 },
    vatTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

salesOrderSchema.index({ date: -1 });
salesOrderSchema.index({ customer: 1 });

export default model("SalesOrder", salesOrderSchema);
