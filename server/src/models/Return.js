import { Schema, model } from "mongoose";
import { SALE_TYPES } from "../config/fabricOptions.js";

export const RETURN_TYPES = ["CUSTOMER", "SUPPLIER"];
export const RETURN_REFERENCE_TYPES = ["SALES_ORDER", "INVOICE", "PURCHASE_ORDER"];
export const RETURN_SETTLEMENT_TYPES = ["CASH_REFUND", "BANK_REFUND", "CREDIT_NOTE"];
export const RETURN_REASONS = [
  "DAMAGED",
  "WRONG_COLOUR",
  "WRONG_PATTERN",
  "WRONG_ITEM",
  "QUALITY_ISSUE",
  "CUSTOMER_CANCELLATION",
  "SUPPLIER_ERROR",
  "EXPIRED",
  "OTHER",
];

const returnLineSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    vat: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: RETURN_REASONS, required: true },
    // Optional at the schema level: meaningful (and enforced as required, see returnController)
    // for CUSTOMER returns, since SalesOrder/Invoice lines now carry them — but SUPPLIER returns
    // reference PurchaseOrder lines, which never captured fabric attributes in the first place.
    colour: { type: String, trim: true },
    pattern: { type: String, trim: true },
    nature: { type: String, trim: true },
    saleType: { type: String, enum: SALE_TYPES },
    converter: { type: Number, default: 1, min: 0.01 },
    stockQty: { type: Number, min: 0.01 },
  },
  { _id: false }
);

const returnSchema = new Schema(
  {
    returnNo: { type: String, required: true, unique: true },
    returnType: { type: String, enum: RETURN_TYPES, required: true },
    returnDate: { type: Date, default: Date.now },
    referenceType: { type: String, enum: RETURN_REFERENCE_TYPES, required: true },
    // Not a schema-level `ref` (would need refPath keyed on referenceType) — resolved manually
    // by the controller/service since referenceType already tells us which collection to use.
    referenceId: { type: Schema.Types.ObjectId, required: true },
    // Customer if returnType is CUSTOMER, Vendor if SUPPLIER — same reasoning as referenceId.
    party: { type: Schema.Types.ObjectId, required: true },
    settlementType: { type: String, enum: RETURN_SETTLEMENT_TYPES, required: true },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    items: {
      type: [returnLineSchema],
      validate: { validator: (v) => v.length > 0, message: "At least one item line is required" },
    },
    grandTotal: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reversedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reversedAt: { type: Date },
    reversalReason: { type: String, trim: true },
  },
  { timestamps: true }
);

returnSchema.index({ referenceId: 1 });
returnSchema.index({ returnDate: -1 });

export default model("Return", returnSchema);
