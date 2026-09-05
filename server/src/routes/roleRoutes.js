import { Router } from "express";
import { listRoles, listPermissions } from "../controllers/roleController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

// List roles — any authenticated user can see the role list (used in user management forms)
router.get("/", authenticate, listRoles);

// List all available permissions — Super Admin only, used in admin UI
router.get("/permissions", authenticate, requirePermission("roles:manage"), listPermissions);

export default router;
