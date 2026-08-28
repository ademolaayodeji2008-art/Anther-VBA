import { z } from "zod";
import InvoicePayment from "../models/InvoicePayment.js";
import { recordInvoicePayment } from "../services/invoicePaymentService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate } from "../utils/zodHelpers.js";

export const createInvoicePaymentSchema = z
  .object({
    invoice: z.string().min(1),
    date: optionalDate(),
    amount: z.number().positive(),
    method: z.enum(["CASH", "BANK"]),
    bank: z.string().min(1).optional(),
    reference: z.string().optional(),
    receivedBy: z.string().optional(),
    remarks: z.string().optional(),
  })
  .refine((data) => data.method !== "BANK" || !!data.bank, {
    message: "bank is required when method is BANK",
    path: ["bank"],
  });

export async function listInvoicePayments(req, res, next) {
  try {
    const { invoice } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (invoice) filter.invoice = invoice;

    const [items, total] = await Promise.all([
      InvoicePayment.find(filter)
        .populate("bank", "name")
        .populate({ path: "invoice", select: "invoiceNo customer", populate: { path: "customer", select: "name" } })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      InvoicePayment.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function createInvoicePaymentHandler(req, res, next) {
  try {
    const payment = await recordInvoicePayment(req.body, { postedBy: req.user.id });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}
