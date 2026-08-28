import { z } from "zod";
import BankTransaction from "../models/BankTransaction.js";
import { postBankTransaction, getBankBalance } from "../services/bankLedgerService.js";
import { parsePagination } from "../utils/queryHelpers.js";
import { optionalDate, optionalNumber } from "../utils/zodHelpers.js";

export const createBankAdjustmentSchema = z
  .object({
    bank: z.string().min(1),
    date: optionalDate(),
    deposit: optionalNumber(z.coerce.number().min(0)),
    withdrawal: optionalNumber(z.coerce.number().min(0)),
    narration: z.string().min(1),
  })
  .refine((d) => (d.deposit ?? 0) > 0 || (d.withdrawal ?? 0) > 0, {
    message: "Either deposit or withdrawal must be greater than 0",
  });

export async function listBankTransactions(req, res, next) {
  try {
    const { bank, type, status } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = {};
    if (bank) filter.bank = bank;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      BankTransaction.find(filter)
        .populate("bank", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      BankTransaction.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getBankAccountBalance(req, res, next) {
  try {
    const asOf = req.query.asOf ? new Date(req.query.asOf) : undefined;
    const balance = await getBankBalance(req.params.bankId, asOf);
    res.json({ bank: req.params.bankId, balance });
  } catch (err) {
    next(err);
  }
}

export async function createBankAdjustment(req, res, next) {
  try {
    const { bank, date, deposit = 0, withdrawal = 0, narration } = req.body;
    const txn = await postBankTransaction({
      bank,
      type: "BANK_ADJUSTMENT",
      deposit,
      withdrawal,
      date,
      sourceModule: "Manual",
      narration,
      postedBy: req.user.id,
    });
    res.status(201).json(txn);
  } catch (err) {
    next(err);
  }
}
