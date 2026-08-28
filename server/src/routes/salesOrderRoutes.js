import { Router } from "express";
import {
  listSalesOrders,
  getSalesOrder,
  createSalesOrderHandler,
  createSalesOrderSchema,
} from "../controllers/salesOrderController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listSalesOrders);
router.get("/:id", getSalesOrder);
router.post(
  "/",
  requirePermission("sales:post"),
  validate(createSalesOrderSchema),
  createSalesOrderHandler
);

export default router;
