import { Router } from "express";
import {
  listVouchers,
  getVoucher,
  raiseVoucherHandler,
  approveVoucherHandler,
  rejectVoucherHandler,
  resubmitVoucherHandler,
  payVoucherHandler,
  raiseVoucherSchema,
  approveVoucherSchema,
  rejectVoucherSchema,
  resubmitVoucherSchema,
  payVoucherSchema,
} from "../controllers/paymentVoucherController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listVouchers);
router.get("/:id", getVoucher);
router.post(
  "/",
  requirePermission("voucher:raise"),
  validate(raiseVoucherSchema),
  raiseVoucherHandler
);
router.post(
  "/:id/approve",
  requirePermission("voucher:approve"),
  validate(approveVoucherSchema),
  approveVoucherHandler
);
router.post(
  "/:id/reject",
  requirePermission("voucher:approve"),
  validate(rejectVoucherSchema),
  rejectVoucherHandler
);
router.post(
  "/:id/resubmit",
  requirePermission("voucher:raise"),
  validate(resubmitVoucherSchema),
  resubmitVoucherHandler
);
router.post(
  "/:id/pay",
  requirePermission("voucher:pay"),
  validate(payVoucherSchema),
  payVoucherHandler
);

export default router;
