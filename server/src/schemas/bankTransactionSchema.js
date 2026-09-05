import { Schema } from "mongoose";

export const BANK_TXN_TYPES = [
  "OPENING_BALANCE", "INCOME", "CUSTOMER_PAYMENT", "EXPENSE",
  "VENDOR_PAYMENT", "BANK_ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "PAYMENT_VOUCHER",
];

export const bankTransactionSchema = new Schema(
  {
    txnId: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true },
    type: { type: String, enum: BANK_TXN_TYPES, required: true },
    deposit: { type: Number, default: 0, min: 0 },
    withdrawal: { type: Number, default: 0, min: 0 },
    ref: { type: String, trim: true },
    sourceModule: { type: String, trim: true },
    party: { type: String, trim: true },
    narration: { type: String, trim: true },
    status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
    postedBy: { type: Schema.Types.ObjectId },
    reversedBy: { type: Schema.Types.ObjectId },
    reversedAt: { type: Date },
    reversalReason: { type: String, trim: true },
  },
  { timestamps: true }
);

bankTransactionSchema.index({ bank: 1, date: -1 });
