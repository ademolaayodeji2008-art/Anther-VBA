import { verifyAccessToken } from "../services/authService.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing access token" });
  }
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, permissions: payload.permissions ?? [] };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const granted = new Set(req.user?.permissions ?? []);
    const hasAll = permissions.every((p) => granted.has(p));
    if (!hasAll) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const granted = new Set(req.user?.permissions ?? []);
    const hasAny = permissions.some((p) => granted.has(p));
    if (!hasAny) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
