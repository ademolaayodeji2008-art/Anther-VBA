import { Router } from "express";
import {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrderHandler,
  createPurchaseOrderSchema,
} from "../controllers/purchaseOrderController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listPurchaseOrders);
router.get("/:id", getPurchaseOrder);
router.post(
  "/",
  requirePermission("purchase:post"),
  validate(createPurchaseOrderSchema),
  createPurchaseOrderHandler
);

export default router;
