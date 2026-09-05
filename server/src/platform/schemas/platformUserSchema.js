import { Schema } from "mongoose";

const membershipSchema = new Schema(
  {
    org: { type: Schema.Types.ObjectId, required: true },
    roleName: { type: String, required: true, default: "Viewer" },
    active: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const platformUserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    memberships: [membershipSchema],
    active: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },
    isPlatformAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);
