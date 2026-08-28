import { Schema, model } from "mongoose";
import { addressSchema } from "./schemas/address.js";

const vendorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    tin: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: addressSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vendorSchema.index({ name: 1 });

export default model("Vendor", vendorSchema);
