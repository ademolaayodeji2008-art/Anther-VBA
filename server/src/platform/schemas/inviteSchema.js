import { Schema } from "mongoose";

export const inviteSchema = new Schema(
  {
    org: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    roleName: { type: String, required: true, default: "Viewer" },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

inviteSchema.index({ org: 1, email: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
