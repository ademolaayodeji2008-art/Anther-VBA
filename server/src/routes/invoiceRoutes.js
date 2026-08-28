import { Router } from "express";
import {
  listInvoices,
  getInvoice,
  createInvoiceHandler,
  createInvoiceSchema,
} from "../controllers/invoiceController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authenticate);
router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.post(
  "/",
  requirePermission("invoices:manage"),
  validate(createInvoiceSchema),
  createInvoiceHandler
);

export default router;
