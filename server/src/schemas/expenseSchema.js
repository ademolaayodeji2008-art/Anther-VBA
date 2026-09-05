import { Schema } from "mongoose";

export const EXPENSE_PAYMENT_METHODS = ["CASH", "TRANSFER", "CHEQUE", "POS", "DIRECT_DEBIT"];

export const expenseSchema = new Schema(
  {
    expenseNo: { type: String, required: true, unique: true },
    date: { type: Date, required: true, default: Date.now },
    particulars: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    paymentMethod: { type: String, required: true, trim: true },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    amount: { type: Number, required: true, min: 0.01 },
    remarks: { type: String, trim: true },
    sourceVoucher: { type: String, trim: true },
    isFixedAsset: { type: Boolean, default: false },
    postedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
