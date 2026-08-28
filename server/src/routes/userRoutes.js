import { Router } from "express";
import {
  listUsers,
  createUser,
  updateUser,
  createUserSchema,
  updateUserSchema,
} from "../controllers/userController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authenticate, requirePermission("users:manage"));
router.get("/", listUsers);
router.post("/", validate(createUserSchema), createUser);
router.patch("/:id", validate(updateUserSchema), updateUser);

export default router;
