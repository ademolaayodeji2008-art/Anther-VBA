import { getModels } from "../tenant/tenantDb.js";
import { getStockLevels } from "./stockService.js";

async function attachNames(rows, Model) {
  const ids = rows.map((r) => r._id).filter(Boolean);
  const docs = await Model.find({ _id: { $in: ids } }, "name");
  const nameById = new Map(docs.map((d) => [d._id.toString(), d.name]));
  return rows.map((r) => ({ ...r, name: r._id ? nameById.get(r._id.toString()) : "Unknown" }));
}

const FABRIC_FIELDS = { colour: "$items.colour", pattern: "$items.pattern", nature: "$items.nature" };

export async function salesReport(tenantDb, { start, end, groupBy = "item", status = "POSTED" }) {
  const { SalesOrder, Customer, Item } = getModels(tenantDb);
  const match = { date: { $gte: start, $lte: end }, ...(status ? { status } : {}) };
  if (groupBy === "none") return SalesOrder.find(match).populate("customer","name").populate("items.item","name").sort({ date: -1 });
  const fabricField = FABRIC_FIELDS[groupBy];
  const groupField = fabricField ?? (groupBy === "customer" ? "$customer" : "$items.item");
  const rows = await SalesOrder.aggregate([{ $match: match }, { $unwind: "$items" }, { $group: { _id: groupField, qty: { $sum: "$items.qty" }, subtotal: { $sum: "$items.lineTotal" }, vatTotal: { $sum: "$items.vat" } } }, { $sort: { subtotal: -1 } }]);
  if (fabricField) return rows.map((r) => ({ ...r, name: r._id ?? "Unspecified" }));
  return attachNames(rows, groupBy === "customer" ? Customer : Item);
}

export async function purchasesReport(tenantDb, { start, end, groupBy = "item", status = "POSTED" }) {
  const { PurchaseOrder, Vendor, Item } = getModels(tenantDb);
  const match = { date: { $gte: start, $lte: end }, ...(status ? { status } : {}) };
  if (groupBy === "none") return PurchaseOrder.find(match).populate("vendor","name").populate("items.item","name").sort({ date: -1 });
  const groupField = groupBy === "vendor" ? "$vendor" : "$items.item";
  const rows = await PurchaseOrder.aggregate([{ $match: match }, { $unwind: "$items" }, { $group: { _id: groupField, qty: { $sum: "$items.qty" }, total: { $sum: "$items.lineTotal" } } }, { $sort: { total: -1 } }]);
  return attachNames(rows, groupBy === "vendor" ? Vendor : Item);
}

export async function expensesReport(tenantDb, { start, end, groupBy = "category" }) {
  const { Expense } = getModels(tenantDb);
  const match = { date: { $gte: start, $lte: end } };
  if (groupBy === "none") return Expense.find(match).populate("bank","name").sort({ date: -1 });
  const groupField = groupBy === "paymentMethod" ? "$paymentMethod" : { $ifNull: ["$category","Uncategorized"] };
  const rows = await Expense.aggregate([{ $match: match }, { $group: { _id: groupField, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]);
  return rows.map((r) => ({ ...r, name: r._id ?? "Uncategorized" }));
}

export async function receivablesReport(tenantDb, { start, end, groupBy = "customer" }) {
  const { Invoice, Customer } = getModels(tenantDb);
  const match = { issueDate: { $gte: start, $lte: end }, outstanding: { $gt: 0 } };
  if (groupBy === "none") return Invoice.find(match).populate("customer","name").sort({ dueDate: 1 });
  const rows = await Invoice.aggregate([{ $match: match }, { $group: { _id: "$customer", outstanding: { $sum: "$outstanding" }, invoiceCount: { $sum: 1 } } }, { $sort: { outstanding: -1 } }]);
  return attachNames(rows, Customer);
}

export async function payablesReport(tenantDb, { start, end, groupBy = "vendor" }) {
  const { PurchaseOrder, Vendor, Item } = getModels(tenantDb);
  const match = { date: { $gte: start, $lte: end }, paymentType: "CREDIT" };
  if (groupBy === "none") return PurchaseOrder.find(match).populate("vendor","name").sort({ date: -1 });
  const groupField = groupBy === "item" ? "$items.item" : "$vendor";
  const pipeline = [{ $match: match }];
  if (groupBy === "item") pipeline.push({ $unwind: "$items" });
  pipeline.push({ $group: { _id: groupField, total: { $sum: groupBy === "item" ? "$items.lineTotal" : "$total" }, count: { $sum: 1 } } }, { $sort: { total: -1 } });
  const rows = await PurchaseOrder.aggregate(pipeline);
  return attachNames(rows, groupBy === "item" ? Item : Vendor);
}

export async function inventoryReport(tenantDb, { start, end }) {
  const { Item, StockMovement } = getModels(tenantDb);
  const items = await Item.find({ active: true }).sort({ name: 1 });
  const itemIds = items.map((i) => i._id);

  const [openingRows, byTypeRows, netRows] = await Promise.all([
    StockMovement.aggregate([{ $match: { item: { $in: itemIds }, date: { $lt: start } } }, { $group: { _id: "$item", qty: { $sum: "$qty" } } }]),
    StockMovement.aggregate([{ $match: { item: { $in: itemIds }, date: { $gte: start, $lte: end } } }, { $group: { _id: { item: "$item", type: "$type" }, qty: { $sum: "$qty" } } }]),
    StockMovement.aggregate([{ $match: { item: { $in: itemIds }, date: { $gte: start, $lte: end } } }, { $group: { _id: "$item", qty: { $sum: "$qty" } } }]),
  ]);

  const openingMap = new Map(openingRows.map((r) => [r._id.toString(), r.qty]));
  const netMap = new Map(netRows.map((r) => [r._id.toString(), r.qty]));
  const byTypeMap = new Map();
  for (const row of byTypeRows) {
    const key = row._id.item.toString();
    if (!byTypeMap.has(key)) byTypeMap.set(key, {});
    byTypeMap.get(key)[row._id.type] = row.qty;
  }

  return items.map((item) => {
    const key = item._id.toString();
    const openingStock = openingMap.get(key) ?? 0;
    const types = byTypeMap.get(key) ?? {};
    return { item: item._id, name: item.name, openingStock, purchases: types.PURCHASE ?? 0, sales: Math.abs(types.SALE ?? 0), customerReturns: types.CUSTOMER_RETURN ?? 0, supplierReturns: Math.abs(types.SUPPLIER_RETURN ?? 0), adjustments: types.ADJUSTMENT ?? 0, closingStock: openingStock + (netMap.get(key) ?? 0), costPrice: item.costPrice, sellingPrice: item.sellingPrice };
  });
}

async function salesTrend(SalesOrder, days = 14) {
  const start = new Date(); start.setDate(start.getDate() - (days - 1)); start.setHours(0, 0, 0, 0);
  const rows = await SalesOrder.aggregate([{ $match: { date: { $gte: start }, status: "POSTED" } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$grandTotal" } } }]);
  const byDate = new Map(rows.map((r) => [r._id, r.total]));
  return Array.from({ length: days }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); const key = d.toISOString().slice(0, 10); return { date: key, total: byDate.get(key) ?? 0 }; });
}

export async function dashboardSummary(tenantDb) {
  const { SalesOrder, PurchaseOrder, Invoice, Item } = getModels(tenantDb);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

  const [todaySales, todayPurchases, receivables, payables, pendingSales, overdueCount, items, trend] = await Promise.all([
    SalesOrder.aggregate([{ $match: { date: { $gte: startOfToday, $lte: endOfToday }, status: "POSTED" } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
    PurchaseOrder.aggregate([{ $match: { date: { $gte: startOfToday, $lte: endOfToday }, status: "POSTED" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Invoice.aggregate([{ $match: { outstanding: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$outstanding" } } }]),
    PurchaseOrder.aggregate([{ $match: { paymentType: "CREDIT" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    SalesOrder.aggregate([{ $match: { status: "PENDING" } }, { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } }]),
    Invoice.countDocuments({ paymentStatus: { $ne: "PAID" }, dueDate: { $lt: new Date() } }),
    Item.find({ active: true }, "name lowStockThreshold"),
    salesTrend(SalesOrder, 14),
  ]);

  const stockLevels = await getStockLevels(tenantDb, items.map((i) => i._id));
  const itemsWithStock = items.map((i) => ({ name: i.name, stockOnHand: stockLevels.get(i._id.toString()) ?? 0, lowStockThreshold: i.lowStockThreshold }));
  const lowStockCount = itemsWithStock.filter((i) => i.stockOnHand < i.lowStockThreshold).length;
  const lowStockItems = [...itemsWithStock].sort((a, b) => a.stockOnHand - b.stockOnHand).slice(0, 5);

  return {
    todaySales: todaySales[0]?.total ?? 0,
    todayPurchases: todayPurchases[0]?.total ?? 0,
    receivablesTotal: receivables[0]?.total ?? 0,
    payablesTotal: payables[0]?.total ?? 0,
    pendingSalesTotal: pendingSales[0]?.total ?? 0,
    pendingSalesCount: pendingSales[0]?.count ?? 0,
    overdueInvoiceCount: overdueCount,
    lowStockCount,
    lowStockItems,
    salesTrend: trend,
  };
}
