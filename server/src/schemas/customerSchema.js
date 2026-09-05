import { Schema } from "mongoose";
import { addressSchema } from "./addressSchema.js";

export const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    tin: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: addressSchema, default: () => ({}) },
    openingBalance: { type: Number, default: 0 },
    openingBalanceDate: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ name: 1 });
