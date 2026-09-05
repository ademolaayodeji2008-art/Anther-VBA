import { verifyAccessToken } from "../services/authService.js";
import { getTenantDb } from "../tenant/tenantDb.js";

/**
 * authenticate — verifies the JWT and attaches req.user + req.tenantDb.
 *
 * req.user = { id, orgSlug, permissions[] }
 * req.tenantDb = live Mongoose connection for this org's database
 *
 * Every protected handler downstream uses req.tenantDb to get models:
 *   const { Invoice } = getModels(req.tenantDb);
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing access token" });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }

  if (!payload.orgSlug) {
    return res.status(401).json({ message: "Token missing org context. Please log in again." });
  }

  try {
    req.tenantDb = await getTenantDb(payload.orgSlug);
  } catch (err) {
    return res.status(503).json({ message: "Could not connect to organization database." });
  }

  req.user = {
    id: payload.sub,
    orgSlug: payload.orgSlug,
    permissions: payload.permissions ?? [],
  };

  next();
}

/**
 * requirePermission(...perms) — all listed permissions must be present.
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    const missing = permissions.filter((p) => !req.user?.permissions.includes(p));
    if (missing.length) {
      return res.status(403).json({ message: `Missing permission: ${missing.join(", ")}` });
    }
    next();
  };
}

/**
 * requireAnyPermission(...perms) — at least one must be present.
 */
export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const has = permissions.some((p) => req.user?.permissions.includes(p));
    if (!has) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

/**
 * requirePlatformAdmin — only platform admins (isPlatformAdmin flag) may proceed.
 * Used exclusively on /api/platform-admin/* routes.
 */
export function requirePlatformAdmin(req, res, next) {
  if (!req.platformUser?.isPlatformAdmin) {
    return res.status(403).json({ message: "Platform admin access required" });
  }
  next();
}

/**
 * authenticatePlatformAdmin — separate middleware for /api/platform-admin/*.
 * Verifies the JWT but does NOT require orgSlug — platform admins act globally.
 */
export async function authenticatePlatformAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing access token" });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }

  const { getPlatformModels } = await import("../platform/platformDb.js");
  const { PlatformUser } = await getPlatformModels();
  const user = await PlatformUser.findById(payload.sub);

  if (!user?.isPlatformAdmin) {
    return res.status(403).json({ message: "Platform admin access required" });
  }

  req.platformUser = user;
  next();
}
