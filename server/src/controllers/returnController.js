import { z } from "zod";
import { getModels } from "../tenant/tenantDb.js";
import { RETURN_TYPES, RETURN_REFERENCE_TYPES, RETURN_SETTLEMENT_TYPES, RETURN_REASONS } from "../schemas/returnSchema.js";
import { postReturn, reverseReturn } from "../services/returnService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate, optionalNumber } from "../utils/zodHelpers.js";
import { SALE_TYPES } from "../config/fabricOptions.js";

const lineSchema = z.object({
  item: z.string().min(1), qty: z.number().positive(), unitPrice: z.number().min(0),
  vat: optionalNumber(z.coerce.number().min(0)), reason: z.enum(RETURN_REASONS),
  colour: z.string().optional(), pattern: z.string().optional(), nature: z.string().optional(),
  saleType: z.enum(SALE_TYPES).optional(), converter: optionalNumber(z.coerce.number().positive()),
});

export const postReturnSchema = z.object({
  returnType: z.enum(RETURN_TYPES), returnDate: optionalDate(),
  referenceType: z.enum(RETURN_REFERENCE_TYPES), referenceId: z.string().min(1),
  party: z.string().min(1), settlementType: z.enum(RETURN_SETTLEMENT_TYPES),
  bank: z.string().min(1).optional(), items: z.array(lineSchema).min(1),
}).refine((d) => d.settlementType !== "BANK_REFUND" || !!d.bank, { message: "bank required for BANK_REFUND", path: ["bank"] });

export const reverseReturnSchema = z.object({ reason: z.string().min(1) });

export async function listReturns(req, res, next) {
  try {
    const { Return } = getModels(req.tenantDb);
    const { returnType, status, referenceId } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (returnType) filter.returnType = returnType;
    if (status) filter.status = status;
    if (referenceId) filter.referenceId = referenceId;
    const [items, total] = await Promise.all([Return.find(filter).sort({ returnDate: -1 }).skip(skip).limit(limit), Return.countDocuments(filter)]);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
}

export async function getReturn(req, res, next) {
  try {
    const { Return } = getModels(req.tenantDb);
    const ret = await Return.findById(req.params.id).populate("items.item","name");
    if (!ret) return res.status(404).json({ message: "Return not found" });
    res.json(ret);
  } catch (err) { next(err); }
}

export async function postReturnHandler(req, res, next) {
  try {
    const ret = await postReturn(req.tenantDb, req.body, { postedBy: req.user.id });
    res.status(201).json(ret);
  } catch (err) { next(err); }
}

export async function reverseReturnHandler(req, res, next) {
  try {
    const ret = await reverseReturn(req.tenantDb, req.params.id, { reversedBy: req.user.id, reason: req.body.reason });
    res.json(ret);
  } catch (err) { next(err); }
}
