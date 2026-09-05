import mongoose from "mongoose";
import { getModels, nextSequence } from "../tenant/tenantDb.js";
import { formatSequence } from "../utils/numbering.js";
import { postBankTransaction } from "./bankLedgerService.js";

const EPSILON = 1e-9;

export async function recordInvoicePayment(tenantDb, input, { postedBy }) {
  const session = await mongoose.startSession();
  try {
    let payment;
    await session.withTransaction(async () => {
      const { Invoice, InvoicePayment } = getModels(tenantDb);
      const invoice = await Invoice.findById(input.invoice).session(session);
      if (!invoice) throw Object.assign(new Error("Invoice not found"), { status: 404 });
      if (invoice.paymentStatus === "PAID") throw Object.assign(new Error("Invoice is already fully paid"), { status: 400 });
      if (input.amount > invoice.outstanding + EPSILON) throw Object.assign(new Error(`Payment exceeds outstanding balance of ${invoice.outstanding}`), { status: 400 });

      const seq = await nextSequence(tenantDb, "PAY", session);
      const paymentNo = formatSequence("PAY", seq);

      [payment] = await InvoicePayment.create(
        [{ paymentNo, invoice: invoice._id, date: input.date, amount: input.amount, method: input.method, bank: input.bank, reference: input.reference, receivedBy: input.receivedBy, remarks: input.remarks, postedBy }],
        { session }
      );

      invoice.amountPaid += input.amount;
      invoice.outstanding = Math.max(0, invoice.grandTotal - invoice.amountPaid);
      invoice.lastPaymentDate = payment.date ?? new Date();
      invoice.paymentStatus = invoice.outstanding <= EPSILON ? "PAID" : invoice.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";
      await invoice.save({ session });

      if (input.method === "BANK") {
        await postBankTransaction(tenantDb, { bank: input.bank, type: "CUSTOMER_PAYMENT", deposit: input.amount, date: payment.date, ref: paymentNo, sourceModule: "InvoicePayment", narration: `Payment for invoice ${invoice.invoiceNo}`, postedBy }, { session });
      }
    });
    return payment;
  } finally {
    session.endSession();
  }
}
