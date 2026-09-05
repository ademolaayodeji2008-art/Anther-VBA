import { getModels } from "../tenant/tenantDb.js";
import { PERMISSIONS } from "../config/permissions.js";

/** List roles from this org's tenant DB (fixed/read-only for normal users) */
export async function listRoles(req, res, next) {
  try {
    const { Role } = getModels(req.tenantDb);
    res.json(await Role.find().sort({ name: 1 }));
  } catch (err) { next(err); }
}

/** GET /api/roles/permissions — returns the full permission list for the admin UI */
export function listPermissions(req, res) {
  res.json(Object.entries(PERMISSIONS).map(([key, value]) => ({ key, value })));
}
