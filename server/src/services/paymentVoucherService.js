import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { postBankTransaction } from "./bankLedgerService.js";

const computeTotal = (items) => items.reduce((s, l) => s + l.qty * l.unitAmount, 0);
const buildNarration = (items) => items.map((l) => l.description || l.item).join("; ");
const monthlyKey = (date) => { const d = date ?? new Date(); return `PV-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

export async function raisePaymentVoucher(tenantDb, input, { preparedBy }) {
  const { PaymentVoucher } = getModels(tenantDb);
  const date = input.date ?? new Date();
  const seq = await nextSequence(tenantDb, monthlyKey(date));
  const voucherNo = `${monthlyKey(date)}-${String(seq).padStart(4,"0")}`;
  const items = input.items.map((l) => ({ ...l, lineTotal: l.qty * l.unitAmount }));
  return PaymentVoucher.create({ voucherNo, date, payee: input.payee, payeeBank: input.payeeBank, payeeAccountNo: input.payeeAccountNo, payeeAccountName: input.payeeAccountName, source: input.source, sourceReference: input.sourceReference, items, narration: input.narration || buildNarration(items), totalAmount: computeTotal(items), preparedBy, approvalHistory: [{ action: "RAISED", by: preparedBy }] });
}

export async function approveVoucher(tenantDb, id, { approvedBy, notes }) {
  const { PaymentVoucher } = getModels(tenantDb);
  const v = await PaymentVoucher.findById(id);
  if (!v) throw Object.assign(new Error("Not found"), { status: 404 });
  if (v.status !== "PENDING") throw Object.assign(new Error(`Cannot approve: status is ${v.status}`), { status: 400 });
  v.status = "APPROVED";
  v.approvalHistory.push({ action: "APPROVED", by: approvedBy, notes });
  return v.save();
}

export async function rejectVoucher(tenantDb, id, { rejectedBy, notes }) {
  const { PaymentVoucher } = getModels(tenantDb);
  const v = await PaymentVoucher.findById(id);
  if (!v) throw Object.assign(new Error("Not found"), { status: 404 });
  if (v.status !== "PENDING") throw Object.assign(new Error(`Cannot reject: status is ${v.status}`), { status: 400 });
  v.status = "REJECTED";
  v.approvalHistory.push({ action: "REJECTED", by: rejectedBy, notes });
  return v.save();
}

export async function resubmitVoucher(tenantDb, id, updates, { resubmittedBy }) {
  const { PaymentVoucher } = getModels(tenantDb);
  const v = await PaymentVoucher.findById(id);
  if (!v) throw Object.assign(new Error("Not found"), { status: 404 });
  if (v.status !== "REJECTED") throw Object.assign(new Error("Only rejected vouchers can be resubmitted"), { status: 400 });
  if (updates.items) { v.items = updates.items.map((l) => ({ ...l, lineTotal: l.qty * l.unitAmount })); v.totalAmount = computeTotal(v.items); }
  for (const f of ["payee","payeeBank","payeeAccountNo","payeeAccountName","source","sourceReference","narration"]) { if (updates[f] !== undefined) v[f] = updates[f]; }
  v.status = "PENDING";
  v.approvalHistory.push({ action: "RESUBMITTED", by: resubmittedBy, notes: updates.notes });
  return v.save();
}

export async function payVoucher(tenantDb, id, { paidBy, paymentMethod, bank, paymentReference }) {
  const session = await mongoose.startSession();
  try {
    let v;
    await session.withTransaction(async () => {
      const { PaymentVoucher } = getModels(tenantDb);
      v = await PaymentVoucher.findById(id).session(session);
      if (!v) throw Object.assign(new Error("Not found"), { status: 404 });
      if (v.status !== "APPROVED") throw Object.assign(new Error(`Cannot pay: status is ${v.status}`), { status: 400 });
      v.status = "PAID"; v.paymentMethod = paymentMethod; v.bank = bank; v.paymentReference = paymentReference;
      v.approvalHistory.push({ action: "PAID", by: paidBy, notes: paymentReference });
      await v.save({ session });
      if (paymentMethod === "BANK") {
        await postBankTransaction(tenantDb, { bank, type: "PAYMENT_VOUCHER", withdrawal: v.totalAmount, ref: v.voucherNo, sourceModule: "PaymentVoucher", party: v.payee, narration: `PV ${v.voucherNo} - ${v.narration}`, postedBy: paidBy }, { session });
      }
    });
    return v;
  } finally { session.endSession(); }
}
