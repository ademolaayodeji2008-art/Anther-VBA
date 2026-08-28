import { Router } from "express";
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deactivateItem,
  getItemAnalytics,
  createItemSchema,
  updateItemSchema,
} from "../controllers/itemController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listItems);
router.get("/:id/analytics", getItemAnalytics);
router.get("/:id", getItem);
router.post("/", requirePermission("items:manage"), validate(createItemSchema), createItem);
router.patch("/:id", requirePermission("items:manage"), validate(updateItemSchema), updateItem);
router.delete("/:id", requirePermission("items:manage"), deactivateItem);

export default router;
