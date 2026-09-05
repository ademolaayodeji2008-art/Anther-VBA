import { Schema, model } from "mongoose";

/**
 * PlatformUser — lives in the platform DB (anther_platform).
 *
 * A single real-world person has ONE PlatformUser account.
 * They can belong to multiple organizations via the `memberships` array.
 * Each membership stores their role name within that org.
 */
const membershipSchema = new Schema(
  {
    org: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    // Role name matches one of the fixed roles seeded into the org DB
    roleName: { type: String, required: true, default: "Viewer" },
    active: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const platformUserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    memberships: [membershipSchema],
    active: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    // Verification token fields — hidden from default queries
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
    // Platform-level admin flag — only set manually via seed script
    isPlatformAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("PlatformUser", platformUserSchema);
