import { z } from "zod";
import PaymentVoucher, { VOUCHER_SOURCES } from "../models/PaymentVoucher.js";
import {
  raisePaymentVoucher,
  approveVoucher,
  rejectVoucher,
  resubmitVoucher,
  payVoucher,
} from "../services/paymentVoucherService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate } from "../utils/zodHelpers.js";

const lineSchema = z.object({
  item: z.string().min(1),
  description: z.string().optional(),
  qty: z.number().positive(),
  unitAmount: z.number().min(0),
});

export const raiseVoucherSchema = z.object({
  date: optionalDate(),
  payee: z.string().min(1),
  payeeBank: z.string().optional(),
  payeeAccountNo: z.string().optional(),
  payeeAccountName: z.string().optional(),
  source: z.enum(VOUCHER_SOURCES),
  sourceReference: z.string().optional(),
  items: z.array(lineSchema).min(1),
  narration: z.string().optional(),
});

export const approveVoucherSchema = z.object({ notes: z.string().optional() });
export const rejectVoucherSchema = z.object({ notes: z.string().min(1) });
export const resubmitVoucherSchema = raiseVoucherSchema
  .partial()
  .extend({ notes: z.string().optional() });
export const payVoucherSchema = z
  .object({
    paymentMethod: z.enum(["CASH", "BANK"]),
    bank: z.string().min(1).optional(),
    paymentReference: z.string().optional(),
  })
  .refine((d) => d.paymentMethod !== "BANK" || !!d.bank, {
    message: "bank is required when paymentMethod is BANK",
    path: ["bank"],
  });

export async function listVouchers(req, res, next) {
  try {
    const { status, payee } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (payee) filter.payee = new RegExp(payee.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [items, total] = await Promise.all([
      PaymentVoucher.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      PaymentVoucher.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getVoucher(req, res, next) {
  try {
    const voucher = await PaymentVoucher.findById(req.params.id)
      .populate("bank", "name")
      .populate("preparedBy", "name")
      .populate("approvalHistory.by", "name");
    if (!voucher) return res.status(404).json({ message: "Payment voucher not found" });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
}

export async function raiseVoucherHandler(req, res, next) {
  try {
    const voucher = await raisePaymentVoucher(req.body, { preparedBy: req.user.id });
    res.status(201).json(voucher);
  } catch (err) {
    next(err);
  }
}

export async function approveVoucherHandler(req, res, next) {
  try {
    const voucher = await approveVoucher(req.params.id, {
      approvedBy: req.user.id,
      notes: req.body.notes,
    });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
}

export async function rejectVoucherHandler(req, res, next) {
  try {
    const voucher = await rejectVoucher(req.params.id, {
      rejectedBy: req.user.id,
      notes: req.body.notes,
    });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
}

export async function resubmitVoucherHandler(req, res, next) {
  try {
    const voucher = await resubmitVoucher(req.params.id, req.body, {
      resubmittedBy: req.user.id,
    });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
}

export async function payVoucherHandler(req, res, next) {
  try {
    const voucher = await payVoucher(req.params.id, { paidBy: req.user.id, ...req.body });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
}
