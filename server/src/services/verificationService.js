import crypto from "crypto";
import { sendVerificationEmail } from "./mailerService.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates and stores a verification token for the given user,
 * then sends the verification email.
 *
 * @param {Document} user - PlatformUser document
 * @param {Model} PlatformUser - the PlatformUser model (injected to avoid circular imports)
 */
export async function issueVerificationEmail(user, PlatformUser) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Use findByIdAndUpdate to avoid triggering full model validation on save
  await PlatformUser.findByIdAndUpdate(user._id, {
    verificationTokenHash: hash,
    verificationTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
  });

  await sendVerificationEmail(user, rawToken);
}

/**
 * Verifies the submitted token against the stored hash.
 *
 * @param {string} email
 * @param {string} rawToken
 * @param {Model} PlatformUser - injected model
 */
export async function verifyEmailToken(email, rawToken, PlatformUser) {
  const user = await PlatformUser.findOne({ email }).select(
    "+verificationTokenHash +verificationTokenExpires"
  );

  if (!user) return { ok: false, reason: "No account found with that email address." };
  if (!user.verificationTokenHash) return { ok: false, reason: "No pending verification for this account." };
  if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    return { ok: false, reason: "Verification link has expired. Please request a new one." };
  }

  const submittedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  if (submittedHash !== user.verificationTokenHash) {
    return { ok: false, reason: "Invalid verification token." };
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  return { ok: true, user };
}
