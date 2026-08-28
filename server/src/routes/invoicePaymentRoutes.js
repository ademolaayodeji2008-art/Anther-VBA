import { Router } from "express";
import {
  listInvoicePayments,
  createInvoicePaymentHandler,
  createInvoicePaymentSchema,
} from "../controllers/invoicePaymentController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listInvoicePayments);
router.post(
  "/",
  requirePermission("invoicePayments:record"),
  validate(createInvoicePaymentSchema),
  createInvoicePaymentHandler
);

export default router;
