import { Router } from "express";
import { listRoles, createRole, updateRole, roleSchema } from "../controllers/roleController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authenticate, requirePermission("roles:manage"));
router.get("/", listRoles);
router.post("/", validate(roleSchema), createRole);
router.patch("/:id", updateRole);

export default router;
