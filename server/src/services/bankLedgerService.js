import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";

export async function postBankTransaction(
  tenantDb,
  { bank, type, deposit = 0, withdrawal = 0, date, ref, sourceModule, party, narration, postedBy },
  options = {}
) {
  const seq = await nextSequence(tenantDb, "BNK", options.session);
  const { BankTransaction } = getModels(tenantDb);
  const [txn] = await BankTransaction.create(
    [{ txnId: formatSequence("BNK", seq), bank, type, deposit, withdrawal, date, ref, sourceModule, party, narration, postedBy }],
    options
  );
  return txn;
}

export async function reverseBankTransaction(tenantDb, id, { reversedBy, reason }, options = {}) {
  const { BankTransaction } = getModels(tenantDb);
  const txn = await BankTransaction.findById(id).session(options.session ?? null);
  if (!txn) throw Object.assign(new Error("Bank transaction not found"), { status: 404 });
  if (txn.status === "REVERSED") throw Object.assign(new Error("Already reversed"), { status: 400 });
  txn.status = "REVERSED";
  txn.reversedBy = reversedBy;
  txn.reversedAt = new Date();
  txn.reversalReason = reason;
  await txn.save(options);
  return txn;
}

export async function getBankBalance(tenantDb, bankId, asOfDate) {
  const { BankTransaction, BankAccount } = getModels(tenantDb);
  const match = { bank: new mongoose.Types.ObjectId(bankId), status: "POSTED" };
  if (asOfDate) match.date = { $lte: asOfDate };
  const [totals] = await BankTransaction.aggregate([
    { $match: match },
    { $group: { _id: null, deposits: { $sum: "$deposit" }, withdrawals: { $sum: "$withdrawal" } } },
  ]);
  const bank = await BankAccount.findById(bankId);
  return (bank?.openingBalance ?? 0) + (totals?.deposits ?? 0) - (totals?.withdrawals ?? 0);
}
