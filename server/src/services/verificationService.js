import crypto from "crypto";
import { sendVerificationEmail } from "./mailerService.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates and stores a verification token for the given user,
 * then attempts to send the verification email.
 *
 * Email errors are caught and logged — they must NOT crash the signup flow.
 * If email fails the user can request a resend later.
 */
export async function issueVerificationEmail(user, PlatformUser) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await PlatformUser.findByIdAndUpdate(user._id, {
    verificationTokenHash: hash,
    verificationTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
  });

  try {
    await sendVerificationEmail(user, rawToken);
  } catch (err) {
    // Log but do not rethrow — signup must still complete successfully.
    // The user can request a new verification email from the login page.
    console.error(`[mailer] Failed to send verification email to ${user.email}:`, err.message);
  }
}

/**
 * Verifies the submitted token against the stored hash.
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
