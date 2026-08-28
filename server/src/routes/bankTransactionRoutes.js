import { Router } from "express";
import {
  listBankTransactions,
  getBankAccountBalance,
  createBankAdjustment,
  createBankAdjustmentSchema,
} from "../controllers/bankTransactionController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate, requirePermission("bank:view"));
router.get("/", listBankTransactions);
router.get("/balance/:bankId", getBankAccountBalance);
router.post(
  "/adjustments",
  requirePermission("bank:manage"),
  validate(createBankAdjustmentSchema),
  createBankAdjustment
);

export default router;
