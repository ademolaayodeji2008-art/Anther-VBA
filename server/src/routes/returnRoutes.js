import { Router } from "express";
import {
  listReturns,
  getReturn,
  postReturnHandler,
  reverseReturnHandler,
  postReturnSchema,
  reverseReturnSchema,
} from "../controllers/returnController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listReturns);
router.get("/:id", getReturn);
router.post("/", requirePermission("returns:post"), validate(postReturnSchema), postReturnHandler);
router.post(
  "/:id/reverse",
  requirePermission("returns:reverse"),
  validate(reverseReturnSchema),
  reverseReturnHandler
);

export default router;
