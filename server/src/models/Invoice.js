import { Schema, model } from "mongoose";
import { fabricAttributeFields } from "./schemas/fabricAttributes.js";

const invoiceLineSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    description: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    vat: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    ...fabricAttributeFields,
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    poNo: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: {
      type: [invoiceLineSchema],
      validate: { validator: (v) => v.length > 0, message: "At least one item line is required" },
    },
    issueDate: { type: Date, default: Date.now },
    termsDays: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    subtotal: { type: Number, required: true, min: 0 },
    vatTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    outstanding: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["UNPAID", "PARTIALLY_PAID", "PAID"], default: "UNPAID" },
    lastPaymentDate: { type: Date },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Derived, never stored directly, so it can never drift from dueDate/paymentStatus reality.
invoiceSchema.virtual("invoiceStatus").get(function () {
  if (this.paymentStatus === "PAID") return "PAID";
  if (this.dueDate && this.dueDate.getTime() < Date.now()) return "OVERDUE";
  return "NOT_YET_DUE";
});

invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ dueDate: 1 });

export default model("Invoice", invoiceSchema);
