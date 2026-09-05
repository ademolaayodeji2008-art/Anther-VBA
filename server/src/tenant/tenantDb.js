import mongoose from "mongoose";
import { buildDbUri } from "../platform/platformDb.js";
import { customerSchema }        from "../schemas/customerSchema.js";
import { vendorSchema }          from "../schemas/vendorSchema.js";
import { itemSchema }            from "../schemas/itemSchema.js";
import { bankAccountSchema }     from "../schemas/bankAccountSchema.js";
import { bankTransactionSchema } from "../schemas/bankTransactionSchema.js";
import { salesOrderSchema }      from "../schemas/salesOrderSchema.js";
import { purchaseOrderSchema }   from "../schemas/purchaseOrderSchema.js";
import { stockAdjustmentSchema } from "../schemas/stockAdjustmentSchema.js";
import { stockMovementSchema }   from "../schemas/stockMovementSchema.js";
import { invoiceSchema }         from "../schemas/invoiceSchema.js";
import { invoicePaymentSchema }  from "../schemas/invoicePaymentSchema.js";
import { paymentVoucherSchema }  from "../schemas/paymentVoucherSchema.js";
import { assetSchema }           from "../schemas/assetSchema.js";
import { returnSchema }          from "../schemas/returnSchema.js";
import { expenseSchema }         from "../schemas/expenseSchema.js";
import { fabricOptionsSchema }   from "../schemas/fabricOptionsSchema.js";
import { roleSchema }            from "../schemas/roleSchema.js";
import { counterSchema }         from "../schemas/counterSchema.js";

/** Connection cache keyed by database name. One connection per org, reused forever. */
const _cache = new Map();

/**
 * Returns a live Mongoose connection for the given org slug.
 * Database: anther_org_{slug}  (hyphens replaced with underscores)
 */
export async function getTenantDb(orgSlug) {
  if (!orgSlug) throw new Error("orgSlug is required");
  const dbName = `anther_org_${orgSlug.replace(/-/g, "_")}`;

  if (_cache.has(dbName)) {
    const cached = _cache.get(dbName);
    if (cached.readyState === 1) return cached;
    _cache.delete(dbName);
  }

  const conn = mongoose.createConnection(buildDbUri(dbName));
  await conn.asPromise();
  _cache.set(dbName, conn);
  return conn;
}

/**
 * Returns all business model constructors bound to the given tenant connection.
 * Use in every controller:
 *   const { Invoice, Customer } = getModels(req.tenantDb);
 */
export function getModels(conn) {
  const m = (name, schema) => conn.models[name] ?? conn.model(name, schema);
  return {
    Customer:        m("Customer",        customerSchema),
    Vendor:          m("Vendor",          vendorSchema),
    Item:            m("Item",            itemSchema),
    BankAccount:     m("BankAccount",     bankAccountSchema),
    BankTransaction: m("BankTransaction", bankTransactionSchema),
    SalesOrder:      m("SalesOrder",      salesOrderSchema),
    PurchaseOrder:   m("PurchaseOrder",   purchaseOrderSchema),
    StockAdjustment: m("StockAdjustment", stockAdjustmentSchema),
    StockMovement:   m("StockMovement",   stockMovementSchema),
    Invoice:         m("Invoice",         invoiceSchema),
    InvoicePayment:  m("InvoicePayment",  invoicePaymentSchema),
    PaymentVoucher:  m("PaymentVoucher",  paymentVoucherSchema),
    Asset:           m("Asset",           assetSchema),
    Return:          m("Return",          returnSchema),
    Expense:         m("Expense",         expenseSchema),
    FabricOptions:   m("FabricOptions",   fabricOptionsSchema),
    Role:            m("Role",            roleSchema),
    Counter:         m("Counter",         counterSchema),
  };
}

/**
 * Convenience: get nextSequence from the tenant's Counter collection.
 * Drop-in replacement for the old global nextSequence() from models/Counter.js
 */
export async function nextSequence(conn, key, session) {
  const Counter = getModels(conn).Counter;
  const opts = session ? { new: true, upsert: true, session } : { new: true, upsert: true };
  const doc = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, opts);
  return doc.seq;
}
