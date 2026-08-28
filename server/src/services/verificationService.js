import crypto from "node:crypto";
import User from "../models/User.js";
import { sendVerificationEmail } from "./mailerService.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generates a verification token for the user, stores its hash, and emails the raw token as a link. */
export async function issueVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString("hex");
  user.verificationTokenHash = hashToken(token);
  user.verificationTokenExpires = new Date(Date.now() + TOKEN_TTL_MS);
  await user.save();
  return sendVerificationEmail(user, token);
}

/** Verifies a submitted token against the stored hash + expiry; marks the user verified on success. */
export async function verifyEmailToken(email, token) {
  const user = await User.findOne({ email }).select(
    "+verificationTokenHash +verificationTokenExpires"
  );
  if (!user || !user.verificationTokenHash || !user.verificationTokenExpires) {
    return { ok: false, reason: "No pending verification for this email" };
  }
  if (user.verificationTokenExpires < new Date()) {
    return { ok: false, reason: "Verification link has expired" };
  }
  if (user.verificationTokenHash !== hashToken(token)) {
    return { ok: false, reason: "Invalid verification token" };
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();
  return { ok: true, user };
}
