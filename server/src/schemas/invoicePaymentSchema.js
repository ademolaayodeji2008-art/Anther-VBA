import { Schema } from "mongoose";

export const invoicePaymentSchema = new Schema(
  {
    paymentNo: { type: String, required: true, unique: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ["CASH", "BANK"], required: true },
    bank: { type: Schema.Types.ObjectId, ref: "BankAccount" },
    reference: { type: String, trim: true },
    receivedBy: { type: String, trim: true },
    remarks: { type: String, trim: true },
    postedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

invoicePaymentSchema.index({ invoice: 1, date: -1 });
