import { Schema, model } from "mongoose";

// Payment methods mirror the VBA bank list approach: CASH plus any named bank account.
// To keep it simple we store the method as a string (the bank name or "CASH") rather than
// requiring a BankAccount ObjectId — this matches the VBA where expenses pointed at bank names.
export const EXPENSE_PAYMENT_METHODS = ["CASH", "TRANSFER", "CHEQUE", "POS", "DIRECT_DEBIT"];

const expenseSchema = new Schema(
  {
    expenseNo: { type: String, required: true, unique: true },
    date: { type: Date, required: true, default: Date.now },
    particulars: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    paymentMethod: { type: String, required: true, trim: true }, // "CASH" or bank name
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" }, // set when paymentMethod != CASH
    amount: { type: Number, required: true, min: 0.01 },
    remarks: { type: String, trim: true },
    // Track when this expense came from a Payment Voucher (PV) process
    sourceVoucher: { type: String, trim: true },
    // Flag when the category is "FIXED ASSET" so AssetsPage can cross-reference
    isFixedAsset: { type: Boolean, default: false },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ paymentMethod: 1 });

export default model("Expense", expenseSchema);
