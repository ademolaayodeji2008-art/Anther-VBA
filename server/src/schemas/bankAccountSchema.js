import { Schema } from "mongoose";

export const bankAccountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    accountNo: { type: String, required: true, trim: true, unique: true },
    accountName: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    openingBalanceDate: { type: Date },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

bankAccountSchema.index({ name: 1 });
