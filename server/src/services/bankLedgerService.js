import mongoose from "mongoose";
import BankTransaction from "../models/BankTransaction.js";
import BankAccount from "../models/BankAccount.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";

/** Single shared posting function for every cash-affecting action across the app. */
export async function postBankTransaction(
  { bank, type, deposit = 0, withdrawal = 0, date, ref, sourceModule, party, narration, postedBy },
  options = {}
) {
  const seq = await nextSequence("BNK", options);
  const [txn] = await BankTransaction.create(
    [
      {
        txnId: formatSequence("BNK", seq),
        bank,
        type,
        deposit,
        withdrawal,
        date,
        ref,
        sourceModule,
        party,
        narration,
        postedBy,
      },
    ],
    options
  );
  return txn;
}

/** Marks a posted transaction as reversed. Never deletes — the ledger stays append-only for audit. */
export async function reverseBankTransaction(id, { reversedBy, reason }, options = {}) {
  const txn = await BankTransaction.findById(id).session(options.session ?? null);
  if (!txn) throw Object.assign(new Error("Bank transaction not found"), { status: 404 });
  if (txn.status === "REVERSED") {
    throw Object.assign(new Error("Bank transaction already reversed"), { status: 400 });
  }
  txn.status = "REVERSED";
  txn.reversedBy = reversedBy;
  txn.reversedAt = new Date();
  txn.reversalReason = reason;
  await txn.save(options);
  return txn;
}

export async function getBankBalance(bankId, asOfDate) {
  // Aggregation pipelines don't auto-cast query values the way Mongoose's .find() does,
  // so a plain string id here would silently match zero documents against the ObjectId field.
  const match = { bank: new mongoose.Types.ObjectId(bankId), status: "POSTED" };
  if (asOfDate) match.date = { $lte: asOfDate };

  const [totals] = await BankTransaction.aggregate([
    { $match: match },
    { $group: { _id: null, deposits: { $sum: "$deposit" }, withdrawals: { $sum: "$withdrawal" } } },
  ]);
  const bank = await BankAccount.findById(bankId);
  const opening = bank?.openingBalance ?? 0;
  return opening + (totals?.deposits ?? 0) - (totals?.withdrawals ?? 0);
}
