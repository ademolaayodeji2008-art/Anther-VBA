import { z } from "zod";
import { getModels } from "../tenant/tenantDb.js";
import { createInvoice } from "../services/invoiceService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate, optionalNumber } from "../utils/zodHelpers.js";

const lineSchema = z.object({
  item: z.string().min(1),
  description: z.string().min(1, "Description is required"),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  vat: optionalNumber(z.coerce.number().min(0)),
  colour: z.string().min(1, "Colour is required"),
  pattern: z.string().min(1, "Pattern is required"),
  nature: z.string().min(1, "Nature is required"),
  saleType: z.enum(["YARD", "TROUSER", "BUNDLE"]),
  converter: optionalNumber(z.coerce.number().positive()),
}).refine((d) => d.saleType !== "BUNDLE" || !!d.converter, { message: "converter required for BUNDLE", path: ["converter"] });

export const createInvoiceSchema = z.object({
  issueDate: optionalDate(),
  customer: z.string().min(1),
  items: z.array(lineSchema).min(1),
  termsDays: z.number().int().min(0),
  bank: z.string().min(1),
});

export async function listInvoices(req, res, next) {
  try {
    const { Invoice } = getModels(req.tenantDb);
    const { customer, paymentStatus } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (customer) filter.customer = customer;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    const [items, total] = await Promise.all([
      Invoice.find(filter).populate("customer","name").populate("bank","name accountNo accountName").sort({ issueDate: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
}

export async function getInvoice(req, res, next) {
  try {
    const { Invoice } = getModels(req.tenantDb);
    const invoice = await Invoice.findById(req.params.id).populate("customer").populate("bank").populate("items.item","name");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) { next(err); }
}

export async function createInvoiceHandler(req, res, next) {
  try {
    const invoice = await createInvoice(req.tenantDb, req.body, { postedBy: req.user.id });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
}
