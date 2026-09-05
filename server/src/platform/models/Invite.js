import { Schema, model } from "mongoose";

/**
 * Invite — lives in the platform DB.
 * Created when a Super Admin invites someone to their org.
 * The invite link is: APP_URL/accept-invite?token=<raw_token>
 */
const inviteSchema = new Schema(
  {
    org: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    roleName: { type: String, required: true, default: "Viewer" },
    // Only the SHA-256 hash is stored — raw token lives only in the email link
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "PlatformUser" },
  },
  { timestamps: true }
);

inviteSchema.index({ org: 1, email: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default model("Invite", inviteSchema);
