import { z } from "zod";
import { getModels } from "../tenant/tenantDb.js";
import { createSalesOrder } from "../services/salesService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate, optionalNumber } from "../utils/zodHelpers.js";

const lineSchema = z.object({
  item: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  vat: optionalNumber(z.coerce.number().min(0)),
  colour: z.string().min(1, "Colour is required"),
  pattern: z.string().min(1, "Pattern is required"),
  nature: z.string().min(1, "Nature is required"),
  saleType: z.enum(["YARD", "TROUSER", "BUNDLE"]),
  converter: optionalNumber(z.coerce.number().positive()),
}).refine((d) => d.saleType !== "BUNDLE" || !!d.converter, { message: "converter required for BUNDLE", path: ["converter"] });

export const createSalesOrderSchema = z.object({
  date: optionalDate(),
  customer: z.string().min(1),
  items: z.array(lineSchema).min(1),
  paymentType: z.enum(["CASH", "BANK", "CREDIT"]),
  bank: z.string().min(1).optional(),
  status: z.enum(["POSTED", "PENDING"]).optional(),
}).refine((d) => d.paymentType !== "BANK" || !!d.bank, { message: "bank required when paymentType is BANK", path: ["bank"] });

export async function listSalesOrders(req, res, next) {
  try {
    const { SalesOrder } = getModels(req.tenantDb);
    const { customer, status, paymentType } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (customer) filter.customer = customer;
    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    const [items, total] = await Promise.all([
      SalesOrder.find(filter).populate("customer","name").populate("bank","name").sort({ date: -1 }).skip(skip).limit(limit),
      SalesOrder.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
}

export async function getSalesOrder(req, res, next) {
  try {
    const { SalesOrder } = getModels(req.tenantDb);
    const order = await SalesOrder.findById(req.params.id).populate("customer").populate("bank").populate("items.item","name");
    if (!order) return res.status(404).json({ message: "Sales order not found" });
    res.json(order);
  } catch (err) { next(err); }
}

export async function createSalesOrderHandler(req, res, next) {
  try {
    const order = await createSalesOrder(req.tenantDb, req.body, { postedBy: req.user.id });
    res.status(201).json(order);
  } catch (err) { next(err); }
}
