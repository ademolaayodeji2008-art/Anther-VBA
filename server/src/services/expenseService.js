import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import { nextSequence } from "../models/Counter.js";
import { formatSequence } from "../utils/numbering.js";
import { postBankTransaction } from "./bankLedgerService.js";

/**
 * Creates an expense record. For bank/transfer/cheque/POS payment methods, also posts a
 * withdrawal to the bank ledger — matching the VBA's PostBankTransaction call on expense save.
 */
export async function createExpense(input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let expense;
    await session.withTransaction(async () => {
      const seq = await nextSequence("EXP", { session });
      const expenseNo = formatSequence("EXP", seq);

      const isCash = input.paymentMethod?.toUpperCase() === "CASH";

      [expense] = await Expense.create(
        [
          {
            expenseNo,
            date: input.date ?? new Date(),
            particulars: input.particulars,
            category: input.category,
            paymentMethod: input.paymentMethod,
            bank: isCash ? undefined : input.bank,
            amount: input.amount,
            remarks: input.remarks,
            sourceVoucher: input.sourceVoucher,
            isFixedAsset: input.isFixedAsset ?? false,
            postedBy,
          },
        ],
        { session }
      );

      // Post bank withdrawal for non-cash payments
      if (!isCash && input.bank) {
        await postBankTransaction(
          {
            bank: input.bank,
            type: "EXPENSE",
            withdrawal: input.amount,
            date: expense.date,
            ref: expenseNo,
            sourceModule: "Expense",
            party: input.particulars,
            narration: `Expense ${expenseNo}: ${input.particulars}`,
            postedBy,
          },
          { session }
        );
      }
    });
    return expense;
  } finally {
    session.endSession();
  }
}

export async function updateExpense(id, input, { updatedBy }) {
  const expense = await Expense.findById(id);
  if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });

  // Only allow editing before any bank posting to avoid ledger inconsistency.
  // If amount or bank changed we'd need to reverse/re-post; for simplicity, disallow those fields.
  const allowedFields = ["date", "particulars", "category", "remarks", "isFixedAsset"];
  for (const field of allowedFields) {
    if (input[field] !== undefined) expense[field] = input[field];
  }
  await expense.save();
  return expense;
}

export async function deleteExpense(id) {
  const expense = await Expense.findById(id);
  if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });
  // Note: bank transactions are append-only — deletion doesn't reverse a bank entry.
  // The VBA deleted the Excel row directly; here we remove the document from MongoDB.
  await expense.deleteOne();
  return { deleted: true };
}
