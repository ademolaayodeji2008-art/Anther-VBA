import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";
import { recordStockMovement } from "./stockService.js";
import { postBankTransaction, reverseBankTransaction } from "./bankLedgerService.js";

const EPSILON = 1e-9;

async function getAlreadyReturnedQty(Return, referenceId, itemId, session) {
  const rows = await Return.aggregate([
    { $match: { referenceId: new mongoose.Types.ObjectId(referenceId), status: "POSTED" } },
    { $unwind: "$items" },
    { $match: { "items.item": new mongoose.Types.ObjectId(itemId) } },
    { $group: { _id: null, qty: { $sum: "$items.qty" } } },
  ]).session(session);
  return rows[0]?.qty ?? 0;
}

export async function postReturn(tenantDb, input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let ret;
    await session.withTransaction(async () => {
      const { Return, SalesOrder, Invoice, PurchaseOrder } = getModels(tenantDb);
      const REFERENCE_MODELS = { SALES_ORDER: SalesOrder, INVOICE: Invoice, PURCHASE_ORDER: PurchaseOrder };
      const RefModel = REFERENCE_MODELS[input.referenceType];
      const reference = await RefModel.findById(input.referenceId).session(session);
      if (!reference) throw Object.assign(new Error(`${input.referenceType} not found`), { status: 404 });

      const items = [];
      for (const line of input.items) {
        const originalLine = reference.items.find((l) => l.item.toString() === line.item);
        if (!originalLine) throw Object.assign(new Error(`Item ${line.item} not in original transaction`), { status: 400 });
        const alreadyReturned = await getAlreadyReturnedQty(Return, reference._id, line.item, session);
        const remaining = originalLine.qty - alreadyReturned;
        if (line.qty > remaining + EPSILON) throw Object.assign(new Error(`Cannot return ${line.qty}: only ${remaining} remaining`), { status: 400 });
        const converter = line.saleType === "BUNDLE" ? line.converter : 1;
        items.push({ ...line, converter, stockQty: line.qty * converter, lineTotal: line.qty * line.unitPrice });
      }

      const prefix = input.returnType === "CUSTOMER" ? "CRN" : "SRN";
      const seq = await nextSequence(tenantDb, prefix, session);
      const returnNo = formatSequence(prefix, seq);
      const grandTotal = items.reduce((s, l) => s + l.lineTotal + (l.vat ?? 0), 0);

      [ret] = await Return.create([{ returnNo, returnType: input.returnType, returnDate: input.returnDate, referenceType: input.referenceType, referenceId: input.referenceId, party: input.party, settlementType: input.settlementType, bank: input.bank, items, grandTotal, postedBy }], { session });

      const movementType = input.returnType === "CUSTOMER" ? "CUSTOMER_RETURN" : "SUPPLIER_RETURN";
      const stockSign = input.returnType === "CUSTOMER" ? 1 : -1;
      for (const line of items) {
        await recordStockMovement(tenantDb, { item: line.item, qty: stockSign * line.stockQty, type: movementType, sourceRef: returnNo, createdBy: postedBy }, { session });
      }

      if (input.settlementType === "BANK_REFUND") {
        const direction = input.returnType === "CUSTOMER" ? "withdrawal" : "deposit";
        await postBankTransaction(tenantDb, { bank: input.bank, type: "BANK_ADJUSTMENT", [direction]: grandTotal, ref: returnNo, sourceModule: "Return", narration: `Return ${returnNo}`, postedBy }, { session });
      }
    });
    return ret;
  } finally { session.endSession(); }
}

export async function reverseReturn(tenantDb, id, { reversedBy, reason }) {
  const session = await mongoose.startSession();
  try {
    let ret;
    await session.withTransaction(async () => {
      const { Return, BankTransaction } = getModels(tenantDb);
      ret = await Return.findById(id).session(session);
      if (!ret) throw Object.assign(new Error("Return not found"), { status: 404 });
      if (ret.status === "REVERSED") throw Object.assign(new Error("Already reversed"), { status: 400 });

      const movementType = ret.returnType === "CUSTOMER" ? "CUSTOMER_RETURN" : "SUPPLIER_RETURN";
      const stockSign = ret.returnType === "CUSTOMER" ? -1 : 1;
      for (const line of ret.items) {
        await recordStockMovement(tenantDb, { item: line.item, qty: stockSign * (line.stockQty ?? line.qty), type: movementType, sourceRef: `${ret.returnNo}-REVERSAL`, note: `Reversal: ${reason}`, createdBy: reversedBy }, { session });
      }

      if (ret.settlementType === "BANK_REFUND") {
        const txn = await BankTransaction.findOne({ ref: ret.returnNo, status: "POSTED" }).session(session);
        if (txn) await reverseBankTransaction(tenantDb, txn._id, { reversedBy, reason }, { session });
      }

      ret.status = "REVERSED"; ret.reversedBy = reversedBy; ret.reversedAt = new Date(); ret.reversalReason = reason;
      await ret.save({ session });
    });
    return ret;
  } finally { session.endSession(); }
}
