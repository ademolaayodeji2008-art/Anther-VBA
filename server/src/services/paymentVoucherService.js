import mongoose from "mongoose";
import PaymentVoucher from "../models/PaymentVoucher.js";
import { nextSequence } from "../models/Counter.js";
import { postBankTransaction } from "./bankLedgerService.js";

function computeTotal(items) {
  return items.reduce((sum, line) => sum + line.qty * line.unitAmount, 0);
}

function buildNarration(items) {
  return items.map((line) => line.description || line.item).join("; ");
}

function monthlyCounterKey(date) {
  const d = date ?? new Date();
  return `PV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function raisePaymentVoucher(input, { preparedBy }) {
  const date = input.date ?? new Date();
  const key = monthlyCounterKey(date);
  const seq = await nextSequence(key);
  const voucherNo = `${key}-${String(seq).padStart(4, "0")}`;
  const items = input.items.map((line) => ({ ...line, lineTotal: line.qty * line.unitAmount }));

  return PaymentVoucher.create({
    voucherNo,
    date,
    payee: input.payee,
    payeeBank: input.payeeBank,
    payeeAccountNo: input.payeeAccountNo,
    payeeAccountName: input.payeeAccountName,
    source: input.source,
    sourceReference: input.sourceReference,
    items,
    narration: input.narration || buildNarration(items),
    totalAmount: computeTotal(items),
    preparedBy,
    approvalHistory: [{ action: "RAISED", by: preparedBy, notes: "Voucher raised" }],
  });
}

export async function approveVoucher(id, { approvedBy, notes }) {
  const voucher = await PaymentVoucher.findById(id);
  if (!voucher) throw Object.assign(new Error("Payment voucher not found"), { status: 404 });
  if (voucher.status !== "PENDING") {
    throw Object.assign(new Error(`Cannot approve a voucher with status ${voucher.status}`), {
      status: 400,
    });
  }
  voucher.status = "APPROVED";
  voucher.approvalHistory.push({ action: "APPROVED", by: approvedBy, notes });
  await voucher.save();
  return voucher;
}

export async function rejectVoucher(id, { rejectedBy, notes }) {
  const voucher = await PaymentVoucher.findById(id);
  if (!voucher) throw Object.assign(new Error("Payment voucher not found"), { status: 404 });
  if (voucher.status !== "PENDING") {
    throw Object.assign(new Error(`Cannot reject a voucher with status ${voucher.status}`), {
      status: 400,
    });
  }
  voucher.status = "REJECTED";
  voucher.approvalHistory.push({ action: "REJECTED", by: rejectedBy, notes });
  await voucher.save();
  return voucher;
}

const RESUBMITTABLE_FIELDS = [
  "payee",
  "payeeBank",
  "payeeAccountNo",
  "payeeAccountName",
  "source",
  "sourceReference",
];

export async function resubmitVoucher(id, updates, { resubmittedBy }) {
  const voucher = await PaymentVoucher.findById(id);
  if (!voucher) throw Object.assign(new Error("Payment voucher not found"), { status: 404 });
  if (voucher.status !== "REJECTED") {
    throw Object.assign(new Error("Only a rejected voucher can be resubmitted"), { status: 400 });
  }

  if (updates.items) {
    const items = updates.items.map((line) => ({ ...line, lineTotal: line.qty * line.unitAmount }));
    voucher.items = items;
    voucher.totalAmount = computeTotal(items);
    voucher.narration = updates.narration || buildNarration(items);
  } else if (updates.narration) {
    voucher.narration = updates.narration;
  }
  for (const field of RESUBMITTABLE_FIELDS) {
    if (updates[field] !== undefined) voucher[field] = updates[field];
  }

  voucher.status = "PENDING";
  voucher.approvalHistory.push({ action: "RESUBMITTED", by: resubmittedBy, notes: updates.notes });
  await voucher.save();
  return voucher;
}

export async function payVoucher(id, { paidBy, paymentMethod, bank, paymentReference }) {
  const session = await mongoose.startSession();
  try {
    let voucher;
    await session.withTransaction(async () => {
      voucher = await PaymentVoucher.findById(id).session(session);
      if (!voucher) throw Object.assign(new Error("Payment voucher not found"), { status: 404 });
      if (voucher.status !== "APPROVED") {
        throw Object.assign(new Error(`Cannot pay a voucher with status ${voucher.status}`), {
          status: 400,
        });
      }

      voucher.status = "PAID";
      voucher.paymentMethod = paymentMethod;
      voucher.bank = bank;
      voucher.paymentReference = paymentReference;
      voucher.approvalHistory.push({ action: "PAID", by: paidBy, notes: paymentReference });
      await voucher.save({ session });

      if (paymentMethod === "BANK") {
        await postBankTransaction(
          {
            bank,
            type: "PAYMENT_VOUCHER",
            withdrawal: voucher.totalAmount,
            ref: voucher.voucherNo,
            sourceModule: "PaymentVoucher",
            party: voucher.payee,
            narration: `Payment voucher ${voucher.voucherNo} - ${voucher.narration}`,
            postedBy: paidBy,
          },
          { session }
        );
      }
    });
    return voucher;
  } finally {
    session.endSession();
  }
}
