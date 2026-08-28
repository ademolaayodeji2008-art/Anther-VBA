import { z } from "zod";
import User from "../models/User.js";
import { loadUserWithPermissions } from "../services/userService.js";
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../services/authService.js";
import { issueVerificationEmail, verifyEmailToken } from "../services/verificationService.js";
import { hashPassword } from "../services/authService.js";
import { ensureDefaultRoles } from "../services/roleSeedService.js";
import { ApiError } from "../middleware/errorHandler.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, active: true });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }
    if (!user.emailVerified) {
      throw new ApiError(403, "Please verify your email before signing in");
    }

    const { permissions } = await loadUserWithPermissions(user._id);
    const accessToken = signAccessToken({ _id: user._id, permissions });
    const refreshToken = signRefreshToken({ _id: user._id });

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, permissions },
    });
  } catch (err) {
    next(err);
  }
}

export async function bootstrapStatus(req, res, next) {
  try {
    const userCount = await User.estimatedDocumentCount();
    res.json({ signupOpen: userCount === 0 });
  } catch (err) {
    next(err);
  }
}

export async function signup(req, res, next) {
  try {
    // Not atomic (no distributed lock) — an acceptable, extremely low-probability race for a
    // single-business internal tool's one-time bootstrap, not a public multi-tenant signup.
    const userCount = await User.estimatedDocumentCount();
    if (userCount > 0) {
      throw new ApiError(409, "Signup is closed. Ask your administrator for an invite.");
    }

    const { name, email, password } = req.body;
    const roles = await ensureDefaultRoles();
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      roles: [roles["Super Admin"]._id],
      emailVerified: false,
    });
    await issueVerificationEmail(user);

    res.status(201).json({ message: "Account created. Check your email to verify before signing in." });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new ApiError(401, "Missing refresh token");

    const payload = verifyRefreshToken(token);
    const loaded = await loadUserWithPermissions(payload.sub);
    if (!loaded || !loaded.user.active) throw new ApiError(401, "User no longer active");

    const accessToken = signAccessToken({ _id: loaded.user._id, permissions: loaded.permissions });
    res.json({ accessToken });
  } catch {
    next(new ApiError(401, "Invalid or expired refresh token"));
  }
}

export async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
  res.status(204).end();
}

export async function verifyEmail(req, res, next) {
  try {
    const { email, token } = req.body;
    const result = await verifyEmailToken(email, token);
    if (!result.ok) throw new ApiError(400, result.reason);
    res.json({ message: "Email verified. You can now sign in." });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, active: true });
    if (user && !user.emailVerified) {
      await issueVerificationEmail(user);
    }
    // Generic response regardless of whether the account exists or is already verified,
    // so this endpoint can't be used to enumerate registered emails.
    res.json({ message: "If that account needs verification, a new email has been sent." });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const loaded = await loadUserWithPermissions(req.user.id);
    if (!loaded) throw new ApiError(404, "User not found");
    const { user, permissions } = loaded;
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.name),
      permissions,
    });
  } catch (err) {
    next(err);
  }
}
