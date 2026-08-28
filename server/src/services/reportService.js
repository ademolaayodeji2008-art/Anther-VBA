import SalesOrder from "../models/SalesOrder.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Invoice from "../models/Invoice.js";
import Expense from "../models/Expense.js";
import Item from "../models/Item.js";
import Customer from "../models/Customer.js";
import Vendor from "../models/Vendor.js";
import StockMovement from "../models/StockMovement.js";
import { getStockLevels } from "./stockService.js";

/**
 * Note on scope: PurchaseOrder lines never carry colour/pattern/nature (the source's purchase
 * form never captured them either), so the Purchases/Expenses/Payables reports below only group
 * by item, vendor, or category. Sales, however, supports colour/pattern/nature groupBy — see
 * FABRIC_GROUP_FIELDS below — since SalesOrder/Invoice lines now carry those attributes.
 */

async function attachNames(rows, Model) {
  const ids = rows.map((r) => r._id).filter(Boolean);
  const docs = await Model.find({ _id: { $in: ids } }, "name");
  const nameById = new Map(docs.map((d) => [d._id.toString(), d.name]));
  return rows.map((r) => ({ ...r, name: r._id ? nameById.get(r._id.toString()) : "Unknown" }));
}

// Fabric attributes (colour/pattern/nature) are plain strings on each line, not references, so
// the group key IS the display name already — no attachNames lookup needed for those.
const FABRIC_GROUP_FIELDS = { colour: "$items.colour", pattern: "$items.pattern", nature: "$items.nature" };

export async function salesReport({ start, end, groupBy = "item", status = "POSTED" }) {
  const match = { date: { $gte: start, $lte: end }, ...(status ? { status } : {}) };

  if (groupBy === "none") {
    return SalesOrder.find(match)
      .populate("customer", "name")
      .populate("items.item", "name")
      .sort({ date: -1 });
  }

  const fabricField = FABRIC_GROUP_FIELDS[groupBy];
  const groupField = fabricField ?? (groupBy === "customer" ? "$customer" : "$items.item");
  const rows = await SalesOrder.aggregate([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: groupField,
        qty: { $sum: "$items.qty" },
        subtotal: { $sum: "$items.lineTotal" },
        vatTotal: { $sum: "$items.vat" },
      },
    },
    { $sort: { subtotal: -1 } },
  ]);

  if (fabricField) return rows.map((r) => ({ ...r, name: r._id ?? "Unspecified" }));
  return attachNames(rows, groupBy === "customer" ? Customer : Item);
}

export async function purchasesReport({ start, end, groupBy = "item", status = "POSTED" }) {
  const match = { date: { $gte: start, $lte: end }, ...(status ? { status } : {}) };

  if (groupBy === "none") {
    return PurchaseOrder.find(match)
      .populate("vendor", "name")
      .populate("items.item", "name")
      .sort({ date: -1 });
  }

  const groupField = groupBy === "vendor" ? "$vendor" : "$items.item";
  const rows = await PurchaseOrder.aggregate([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: groupField,
        qty: { $sum: "$items.qty" },
        total: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { total: -1 } },
  ]);
  return attachNames(rows, groupBy === "vendor" ? Vendor : Item);
}

export async function expensesReport({ start, end, groupBy = "category" }) {
  const match = { date: { $gte: start, $lte: end } };

  if (groupBy === "none") {
    return Expense.find(match).populate("bank", "name").sort({ date: -1 });
  }

  const groupField =
    groupBy === "paymentMethod"
      ? "$paymentMethod"
      : { $ifNull: ["$category", "Uncategorized"] };

  const rows = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupField,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return rows.map((r) => ({ ...r, name: r._id ?? "Uncategorized" }));
}

export async function receivablesReport({ start, end, groupBy = "customer" }) {
  const match = { issueDate: { $gte: start, $lte: end }, outstanding: { $gt: 0 } };

  if (groupBy === "none") {
    return Invoice.find(match).populate("customer", "name").sort({ dueDate: 1 });
  }

  const rows = await Invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$customer",
        outstanding: { $sum: "$outstanding" },
        invoiceCount: { $sum: 1 },
      },
    },
    { $sort: { outstanding: -1 } },
  ]);
  return attachNames(rows, Customer);
}

// PurchaseOrder has no per-transaction payment tracking (only Invoices do, via InvoicePayment),
// so "payables" here is total CREDIT-type purchases in range — an amount-owed total, not a
// running outstanding balance net of any vendor payments made via Payment Vouchers.
export async function payablesReport({ start, end, groupBy = "vendor" }) {
  const match = { date: { $gte: start, $lte: end }, paymentType: "CREDIT" };

  if (groupBy === "none") {
    return PurchaseOrder.find(match).populate("vendor", "name").sort({ date: -1 });
  }

  const groupField = groupBy === "item" ? "$items.item" : "$vendor";
  const pipeline = [{ $match: match }];
  if (groupBy === "item") pipeline.push({ $unwind: "$items" });
  pipeline.push(
    {
      $group: {
        _id: groupField,
        total: { $sum: groupBy === "item" ? "$items.lineTotal" : "$total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } }
  );

  const rows = await PurchaseOrder.aggregate(pipeline);
  return attachNames(rows, groupBy === "item" ? Item : Vendor);
}

async function stockAsOf(itemIds, asOfDate) {
  const rows = await StockMovement.aggregate([
    { $match: { item: { $in: itemIds }, date: { $lt: asOfDate } } },
    { $group: { _id: "$item", qty: { $sum: "$qty" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.qty]));
}

async function movementTotalsInRange(itemIds, start, end) {
  const rows = await StockMovement.aggregate([
    { $match: { item: { $in: itemIds }, date: { $gte: start, $lte: end } } },
    { $group: { _id: { item: "$item", type: "$type" }, qty: { $sum: "$qty" } } },
  ]);
  const byItem = new Map();
  for (const row of rows) {
    const key = row._id.item.toString();
    if (!byItem.has(key)) byItem.set(key, {});
    byItem.get(key)[row._id.type] = row.qty;
  }
  return byItem;
}

async function netMovementInRange(itemIds, start, end) {
  const rows = await StockMovement.aggregate([
    { $match: { item: { $in: itemIds }, date: { $gte: start, $lte: end } } },
    { $group: { _id: "$item", qty: { $sum: "$qty" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.qty]));
}

/**
 * costPrice/sellingPrice come from the Item master (current prices), not a weighted average of
 * transactions within the range — the VBA computed a true weighted average from purchase/sale
 * history, which this rebuild doesn't reconstruct here for simplicity.
 */
export async function inventoryReport({ start, end }) {
  const items = await Item.find({ active: true }).sort({ name: 1 });
  const itemIds = items.map((i) => i._id);

  const [openingMap, byTypeMap, netMap] = await Promise.all([
    stockAsOf(itemIds, start),
    movementTotalsInRange(itemIds, start, end),
    netMovementInRange(itemIds, start, end),
  ]);

  return items.map((item) => {
    const key = item._id.toString();
    const openingStock = openingMap.get(key) ?? 0;
    const types = byTypeMap.get(key) ?? {};
    const netChange = netMap.get(key) ?? 0;

    return {
      item: item._id,
      name: item.name,
      openingStock,
      purchases: types.PURCHASE ?? 0,
      sales: Math.abs(types.SALE ?? 0),
      customerReturns: types.CUSTOMER_RETURN ?? 0,
      supplierReturns: Math.abs(types.SUPPLIER_RETURN ?? 0),
      adjustments: types.ADJUSTMENT ?? 0,
      closingStock: openingStock + netChange,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
    };
  });
}

async function salesTrend(days = 14) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = await SalesOrder.aggregate([
    { $match: { date: { $gte: start }, status: "POSTED" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        total: { $sum: "$grandTotal" },
      },
    },
  ]);
  const totalByDate = new Map(rows.map((r) => [r._id, r.total]));

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, total: totalByDate.get(key) ?? 0 };
  });
}

export async function dashboardSummary() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    todaySalesRows,
    todayPurchasesRows,
    receivablesRows,
    payablesRows,
    pendingSalesRows,
    overdueInvoiceCount,
    items,
    trend,
  ] = await Promise.all([
    SalesOrder.aggregate([
      { $match: { date: { $gte: startOfToday, $lte: endOfToday }, status: "POSTED" } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { date: { $gte: startOfToday, $lte: endOfToday }, status: "POSTED" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Invoice.aggregate([
      { $match: { outstanding: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$outstanding" } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { paymentType: "CREDIT" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    SalesOrder.aggregate([
      { $match: { status: "PENDING" } },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
    ]),
    Invoice.countDocuments({ paymentStatus: { $ne: "PAID" }, dueDate: { $lt: new Date() } }),
    Item.find({ active: true }, "name lowStockThreshold"),
    salesTrend(14),
  ]);

  const stockLevels = await getStockLevels(items.map((i) => i._id));
  const itemsWithStock = items.map((i) => ({
    name: i.name,
    stockOnHand: stockLevels.get(i._id.toString()) ?? 0,
    lowStockThreshold: i.lowStockThreshold,
  }));
  const lowStockCount = itemsWithStock.filter((i) => i.stockOnHand < i.lowStockThreshold).length;
  const lowStockItems = [...itemsWithStock].sort((a, b) => a.stockOnHand - b.stockOnHand).slice(0, 5);

  return {
    todaySales: todaySalesRows[0]?.total ?? 0,
    todayPurchases: todayPurchasesRows[0]?.total ?? 0,
    receivablesTotal: receivablesRows[0]?.total ?? 0,
    payablesTotal: payablesRows[0]?.total ?? 0,
    pendingSalesTotal: pendingSalesRows[0]?.total ?? 0,
    pendingSalesCount: pendingSalesRows[0]?.count ?? 0,
    overdueInvoiceCount,
    lowStockCount,
    lowStockItems,
    salesTrend: trend,
  };
}
