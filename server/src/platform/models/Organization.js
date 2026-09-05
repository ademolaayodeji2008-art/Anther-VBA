import { Schema, model } from "mongoose";

/**
 * Organization — lives in the platform DB (anther_platform).
 * Each org gets its own MongoDB database: anther_org_{slug}
 */
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Owner is the platform user who created this org
    owner: { type: Schema.Types.ObjectId, ref: "PlatformUser", required: true },
    active: { type: Boolean, default: true },
    // Settings stored per-org
    settings: {
      businessName: { type: String, trim: true },
      currency: { type: String, default: "NGN" },
      timezone: { type: String, default: "Africa/Lagos" },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    // Suspension reason shown to users when org is suspended
    suspensionReason: { type: String, trim: true },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: "PlatformUser" },
  },
  { timestamps: true }
);

organizationSchema.index({ slug: 1 }, { unique: true });

export default model("Organization", organizationSchema);
