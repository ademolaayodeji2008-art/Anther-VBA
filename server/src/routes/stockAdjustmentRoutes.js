import { Router } from "express";
import {
  listAdjustments,
  createAdjustment,
  reverseAdjustmentHandler,
  createAdjustmentSchema,
  reverseAdjustmentSchema,
} from "../controllers/stockAdjustmentController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate, requirePermission("stock:adjust"));
router.get("/", listAdjustments);
router.post("/", validate(createAdjustmentSchema), createAdjustment);
router.post("/:id/reverse", validate(reverseAdjustmentSchema), reverseAdjustmentHandler);

export default router;
