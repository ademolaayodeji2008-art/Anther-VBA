import { z } from "zod";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { createPurchaseOrder } from "../services/purchaseService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate } from "../utils/zodHelpers.js";

const lineSchema = z.object({
  item: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
});

export const createPurchaseOrderSchema = z
  .object({
    date: optionalDate(),
    vendor: z.string().min(1),
    items: z.array(lineSchema).min(1),
    category: z.string().optional(),
    paymentType: z.enum(["CASH", "BANK", "CREDIT"]),
    bank: z.string().min(1).optional(),
    status: z.enum(["POSTED", "PENDING"]).optional(),
  })
  .refine((data) => data.paymentType !== "BANK" || !!data.bank, {
    message: "bank is required when paymentType is BANK",
    path: ["bank"],
  });

export async function listPurchaseOrders(req, res, next) {
  try {
    const { vendor, status, paymentType } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (vendor) filter.vendor = vendor;
    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;

    const [items, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate("vendor", "name")
        .populate("bank", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseOrder.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getPurchaseOrder(req, res, next) {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("vendor")
      .populate("bank")
      .populate("items.item", "name");
    if (!order) return res.status(404).json({ message: "Purchase order not found" });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

export async function createPurchaseOrderHandler(req, res, next) {
  try {
    const order = await createPurchaseOrder(req.body, { postedBy: req.user.id });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}
