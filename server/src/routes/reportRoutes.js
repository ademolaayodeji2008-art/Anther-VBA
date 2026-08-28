import { Router } from "express";
import {
  getSalesReport,
  getPurchasesReport,
  getExpensesReport,
  getReceivablesReport,
  getPayablesReport,
  getInventoryReport,
  getDashboard,
} from "../controllers/reportController.js";
import { authenticate, requirePermission, requireAnyPermission } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/dashboard", requirePermission("reports:view"), getDashboard);
router.get("/sales", requirePermission("reports:view"), getSalesReport);
router.get("/purchases", requirePermission("reports:view"), getPurchasesReport);
router.get("/expenses", requirePermission("reports:view"), getExpensesReport);
router.get("/receivables", requirePermission("reports:view"), getReceivablesReport);
router.get("/payables", requirePermission("reports:view"), getPayablesReport);
// Inventory Manager needs this report without full reports:view access to everything else.
router.get(
  "/inventory",
  requireAnyPermission("reports:view", "inventory:report"),
  getInventoryReport
);

export default router;
