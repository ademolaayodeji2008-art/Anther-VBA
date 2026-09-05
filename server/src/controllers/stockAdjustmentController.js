import { z } from "zod";
import { getModels } from "../tenant/tenantDb.js";
import { STOCK_ADJUSTMENT_TYPES } from "../schemas/stockAdjustmentSchema.js";
import { postStockAdjustment, reverseStockAdjustment } from "../services/stockAdjustmentService.js";
import { parsePagination } from "../utils/queryHelpers.js";

export const createAdjustmentSchema = z.object({
  item: z.string().min(1),
  type: z.enum(STOCK_ADJUSTMENT_TYPES),
  qty: z.number().positive(),
  reason: z.string().min(1),
  date: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.date().optional()),
});

export const reverseAdjustmentSchema = z.object({ reason: z.string().min(1) });

export async function listAdjustments(req, res, next) {
  try {
    const { StockAdjustment } = getModels(req.tenantDb);
    const { item, status } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (item) filter.item = item;
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      StockAdjustment.find(filter).populate("item","name").sort({ createdAt: -1 }).skip(skip).limit(limit),
      StockAdjustment.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
}

export async function createAdjustment(req, res, next) {
  try {
    const adjustment = await postStockAdjustment(req.tenantDb, { ...req.body, postedBy: req.user.id });
    res.status(201).json(adjustment);
  } catch (err) { next(err); }
}

export async function reverseAdjustmentHandler(req, res, next) {
  try {
    const adjustment = await reverseStockAdjustment(req.tenantDb, req.params.id, { reversedBy: req.user.id, reason: req.body.reason });
    res.json(adjustment);
  } catch (err) { next(err); }
}
