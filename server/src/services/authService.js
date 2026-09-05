import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Signs an access token scoped to a specific org.
 * Payload: { sub: userId, orgSlug, permissions[] }
 * Short-lived (default 15m).
 */
export function signAccessToken(user, orgSlug, permissions) {
  return jwt.sign(
    { sub: user._id.toString(), orgSlug, permissions: permissions ?? [] },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL ?? "15m" }
  );
}

/**
 * Signs a refresh token. Carries userId + orgSlug so refresh can re-issue
 * a correctly scoped access token without a second DB lookup for the org.
 * Long-lived (default 7d).
 */
export function signRefreshToken(user, orgSlug) {
  return jwt.sign(
    { sub: user._id.toString(), orgSlug },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_TTL ?? "7d" }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
