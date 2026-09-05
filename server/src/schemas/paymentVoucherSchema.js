import { Schema } from "mongoose";

export const VOUCHER_SOURCES = [
  "DIRECT_PAYMENT", "PAYABLE_SETTLEMENT", "EXPENSE_REIMBURSEMENT",
  "PURCHASE_PAYMENT", "ASSET_PAYMENT", "OTHER",
];

const voucherLineSchema = new Schema(
  {
    item: { type: String, trim: true, required: true },
    description: { type: String, trim: true },
    qty: { type: Number, required: true, min: 0.01 },
    unitAmount: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const approvalHistorySchema = new Schema(
  {
    action: { type: String, enum: ["RAISED", "APPROVED", "REJECTED", "PAID", "RESUBMITTED"], required: true },
    by: { type: Schema.Types.ObjectId, required: true },
    at: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

export const paymentVoucherSchema = new Schema(
  {
    voucherNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    payee: { type: String, required: true, trim: true },
    payeeBank: { type: String, trim: true },
    payeeAccountNo: { type: String, trim: true },
    payeeAccountName: { type: String, trim: true },
    source: { type: String, enum: VOUCHER_SOURCES, required: true },
    sourceReference: { type: String, trim: true },
    items: {
      type: [voucherLineSchema],
      validate: { validator: (v) => v.length > 0, message: "At least one item line is required" },
    },
    narration: { type: String, trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "PAID"], default: "PENDING" },
    preparedBy: { type: Schema.Types.ObjectId, required: true },
    paymentMethod: { type: String, enum: ["CASH", "BANK"] },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    paymentReference: { type: String, trim: true },
    approvalHistory: { type: [approvalHistorySchema], default: [] },
  },
  { timestamps: true }
);

paymentVoucherSchema.index({ status: 1, date: -1 });
