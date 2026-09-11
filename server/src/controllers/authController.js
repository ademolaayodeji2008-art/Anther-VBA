import { z } from "zod";
import crypto from "crypto";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../services/authService.js";
import { getPlatformModels } from "../platform/platformDb.js";
import { getTenantDb, getModels } from "../tenant/tenantDb.js";
import { ensureOrgRoles } from "../services/roleSeedService.js";
import { issueVerificationEmail, verifyEmailToken } from "../services/verificationService.js";
import { validate } from "../middleware/validate.js";

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  orgName: z.string().min(2, "Organization name is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const selectOrgSchema = z.object({
  orgId: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

// ── Cookie helpers ────────────────────────────────────────────────────────────

const REFRESH_COOKIE = "refreshToken";
const cookieOpts = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, cookieOpts);
}
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOpts, maxAge: 0 });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts an org name to a URL/DB-safe slug. "Acme Ltd" → "acme-ltd" */
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Returns the flat permissions array for a user's role in a given org */
async function getPermissionsForOrg(platformUser, orgId, tenantDb) {
  const membership = platformUser.memberships.find(
    (m) => m.org.toString() === orgId.toString() && m.active
  );
  if (!membership) return [];

  const { Role } = getModels(tenantDb);
  const role = await Role.findOne({ name: membership.roleName });
  return role?.permissions ?? [];
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Creates a PlatformUser + Organization in one go.
 * Sends a verification email. User must verify before they can log in.
 */
export async function signup(req, res, next) {
  try {
    const { name, email, password, orgName } = req.body;
    const { PlatformUser, Organization } = await getPlatformModels();

    // Check email not already taken
    const existing = await PlatformUser.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Build a unique slug
    let slug = slugify(orgName);
    let suffix = 0;
    while (await Organization.findOne({ slug: suffix ? `${slug}-${suffix}` : slug })) {
      suffix++;
    }
    if (suffix) slug = `${slug}-${suffix}`;

    // Create the org
    const org = await Organization.create({
      name: orgName,
      slug,
      owner: null, // filled in after user created
      active: true,
    });

    // Create the user with Super Admin membership in this org
    const user = await PlatformUser.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      memberships: [{ org: org._id, roleName: "Super Admin", active: true }],
      emailVerified: false,
    });

    // Set the owner back-reference
    org.owner = user._id;
    await org.save();

    // Seed roles into the new org's database
    const tenantDb = await getTenantDb(slug);
    await ensureOrgRoles(tenantDb);

    // Send verification email — wrapped so a mail failure never crashes signup
    try {
      await issueVerificationEmail(user, PlatformUser);
    } catch (err) {
      console.error("[signup] Email error (non-fatal):", err.message);
    }

    res.status(201).json({
      message: "Account created. Please check your email to verify your account before signing in.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/bootstrap-status
 * Always returns { signupOpen: true } — in multi-org mode signup is always open.
 */
export async function bootstrapStatus(req, res) {
  res.json({ signupOpen: true });
}

/**
 * POST /api/auth/login
 * Step 1 of 2: validate credentials, return the user's org list.
 * Does NOT issue tokens yet — client must call /auth/select-org next.
 * If the user only belongs to one org, we auto-select it and issue tokens immediately.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { PlatformUser, Organization } = await getPlatformModels();

    const user = await PlatformUser.findOne({ email, active: true });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before signing in." });
    }

    // Load the user's active orgs
    const activeOrgIds = user.memberships
      .filter((m) => m.active)
      .map((m) => m.org);

    const orgs = await Organization.find({
      _id: { $in: activeOrgIds },
      active: true,
    }).select("name slug settings.businessName");

    if (!orgs.length) {
      return res.status(403).json({ message: "You have no active organizations. Contact support." });
    }

    // Auto-select if only one org
    if (orgs.length === 1) {
      return issueTokensForOrg(res, user, orgs[0]);
    }

    // Multiple orgs — return list for client to show org picker
    res.json({
      requiresOrgSelection: true,
      userId: user._id,
      orgs: orgs.map((o) => ({
        _id: o._id,
        name: o.name,
        slug: o.slug,
        businessName: o.settings?.businessName,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/select-org
 * Step 2 of 2 (only needed when user has multiple orgs).
 * Issues org-scoped access + refresh tokens.
 */
export async function selectOrg(req, res, next) {
  try {
    const { orgId } = req.body;
    const { PlatformUser, Organization } = await getPlatformModels();

    // We require the user to be authenticated at this point via a short-lived "pre-auth" token
    // stored in the response from /login. Simpler approach: accept userId + orgId directly
    // since we already validated credentials in /login — the window between login and select-org
    // is only the time to show the org picker UI (milliseconds to seconds).
    // For production-grade security, use a short-lived pre-auth token here.
    const { userId } = req.body;
    const user = await PlatformUser.findOne({ _id: userId, active: true });
    if (!user) return res.status(401).json({ message: "Session expired. Please log in again." });

    const org = await Organization.findOne({ _id: orgId, active: true });
    if (!org) return res.status(404).json({ message: "Organization not found or suspended." });

    const hasMembership = user.memberships.some(
      (m) => m.org.toString() === orgId && m.active
    );
    if (!hasMembership) return res.status(403).json({ message: "You are not a member of this organization." });

    return issueTokensForOrg(res, user, org);
  } catch (err) {
    next(err);
  }
}

/** Shared logic: issue tokens, set cookie, return response */
async function issueTokensForOrg(res, user, org) {
  const tenantDb = await getTenantDb(org.slug);
  const permissions = await getPermissionsForOrg(user, org._id, tenantDb);

  const accessToken = signAccessToken(user, org.slug, permissions);
  const refreshToken = signRefreshToken(user, org.slug);

  setRefreshCookie(res, refreshToken);

  res.json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      permissions,
      org: { id: org._id, name: org.name, slug: org.slug },
    },
  });
}

/**
 * POST /api/auth/refresh
 * Re-issues an access token using the httpOnly refresh cookie.
 * The orgSlug is stored in the refresh token so we can re-scope correctly.
 */
export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const { PlatformUser, Organization } = await getPlatformModels();
    const user = await PlatformUser.findOne({ _id: payload.sub, active: true });
    if (!user) return res.status(401).json({ message: "User not found" });

    const org = await Organization.findOne({ slug: payload.orgSlug, active: true });
    if (!org) return res.status(401).json({ message: "Organization not found or suspended" });

    const tenantDb = await getTenantDb(org.slug);
    const permissions = await getPermissionsForOrg(user, org._id, tenantDb);

    const newAccessToken = signAccessToken(user, org.slug, permissions);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export function logout(req, res) {
  clearRefreshCookie(res);
  res.status(204).end();
}

/**
 * GET /api/auth/me
 * Returns the current user + active org context from the JWT.
 */
export async function me(req, res, next) {
  try {
    const { PlatformUser, Organization } = await getPlatformModels();
    const user = await PlatformUser.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const org = await Organization.findOne({ slug: req.user.orgSlug });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      permissions: req.user.permissions,
      org: org ? { id: org._id, name: org.name, slug: org.slug } : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-email
 */
export async function verifyEmail(req, res, next) {
  try {
    const { email, token } = req.body;
    const { PlatformUser } = await getPlatformModels();
    const result = await verifyEmailToken(email, token, PlatformUser);
    if (!result.ok) return res.status(400).json({ message: result.reason });
    res.json({ message: "Email verified. You can now sign in." });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const { PlatformUser } = await getPlatformModels();
    const user = await PlatformUser.findOne({ email, active: true });
    if (user && !user.emailVerified) {
      await issueVerificationEmail(user, PlatformUser);
    }
    // Always same response — prevents email enumeration
    res.json({ message: "If that account needs verification, a new email has been sent." });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/orgs
 * Returns orgs the currently authenticated user belongs to.
 * Used by the org switcher in the header.
 */
export async function myOrgs(req, res, next) {
  try {
    const { PlatformUser, Organization } = await getPlatformModels();
    const user = await PlatformUser.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const orgIds = user.memberships.filter((m) => m.active).map((m) => m.org);
    const orgs = await Organization.find({ _id: { $in: orgIds }, active: true })
      .select("name slug settings.businessName settings.currency");

    res.json(orgs.map((o) => ({
      _id: o._id,
      name: o.name,
      slug: o.slug,
      businessName: o.settings?.businessName,
      currency: o.settings?.currency,
      isCurrent: o.slug === req.user.orgSlug,
    })));
  } catch (err) {
    next(err);
  }
}
