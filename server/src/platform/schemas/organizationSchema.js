import { Schema } from "mongoose";

export const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    owner: { type: Schema.Types.ObjectId },
    active: { type: Boolean, default: true },
    settings: {
      businessName: { type: String, trim: true },
      currency: { type: String, default: "NGN" },
      timezone: { type: String, default: "Africa/Lagos" },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    suspensionReason: { type: String, trim: true },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);
