import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";
import { postBankTransaction } from "./bankLedgerService.js";

export async function createExpense(tenantDb, input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let expense;
    await session.withTransaction(async () => {
      const { Expense } = getModels(tenantDb);
      const seq = await nextSequence(tenantDb, "EXP", session);
      const expenseNo = formatSequence("EXP", seq);
      const isCash = input.paymentMethod?.toUpperCase() === "CASH";
      [expense] = await Expense.create(
        [{ expenseNo, date: input.date ?? new Date(), particulars: input.particulars, category: input.category, paymentMethod: input.paymentMethod, bank: isCash ? undefined : input.bank, amount: input.amount, remarks: input.remarks, sourceVoucher: input.sourceVoucher, isFixedAsset: input.isFixedAsset ?? false, postedBy }],
        { session }
      );
      if (!isCash && input.bank) {
        await postBankTransaction(tenantDb, { bank: input.bank, type: "EXPENSE", withdrawal: input.amount, date: expense.date, ref: expenseNo, sourceModule: "Expense", party: input.particulars, narration: `Expense ${expenseNo}: ${input.particulars}`, postedBy }, { session });
      }
    });
    return expense;
  } finally { session.endSession(); }
}

export async function updateExpense(tenantDb, id, input) {
  const { Expense } = getModels(tenantDb);
  const expense = await Expense.findById(id);
  if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });
  for (const field of ["date","particulars","category","remarks","isFixedAsset"]) {
    if (input[field] !== undefined) expense[field] = input[field];
  }
  return expense.save();
}

export async function deleteExpense(tenantDb, id) {
  const { Expense } = getModels(tenantDb);
  const expense = await Expense.findById(id);
  if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });
  await expense.deleteOne();
  return { deleted: true };
}
