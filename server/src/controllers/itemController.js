import { z } from "zod";
import { getModels } from "../tenant/tenantDb.js";
import { buildSearchFilter, parsePagination } from "../utils/queryHelpers.js";
import { listItemsWithStock, getStockLevel, recordStockMovement } from "../services/stockService.js";
import { optionalNumber } from "../utils/zodHelpers.js";

export const createItemSchema = z.object({
  name: z.string().min(1),
  isVatable: z.boolean().optional(),
  packConverter: optionalNumber(z.coerce.number().min(1)),
  costPrice: optionalNumber(z.coerce.number().min(0)),
  sellingPrice: optionalNumber(z.coerce.number().min(0)),
  lowStockThreshold: optionalNumber(z.coerce.number().min(0)),
  openingStock: optionalNumber(z.coerce.number().min(0)),
});

export const updateItemSchema = createItemSchema.omit({ openingStock: true }).partial().extend({ active: z.boolean().optional() });

export async function listItems(req, res, next) {
  try {
    const { Item } = getModels(req.tenantDb);
    const { search, active } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = { ...buildSearchFilter(["name"], search) };
    if (active !== undefined) filter.active = active === "true";
    const [items, total] = await Promise.all([
      listItemsWithStock(req.tenantDb, filter, { skip, limit }),
      Item.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
}

export async function getItem(req, res, next) {
  try {
    const { Item } = getModels(req.tenantDb);
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const stockOnHand = await getStockLevel(req.tenantDb, item._id);
    res.json({ ...item.toObject(), stockOnHand });
  } catch (err) { next(err); }
}

export async function createItem(req, res, next) {
  try {
    const { Item } = getModels(req.tenantDb);
    const { openingStock, ...itemFields } = req.body;
    const item = await Item.create(itemFields);
    if (openingStock) {
      await recordStockMovement(req.tenantDb, { item: item._id, qty: openingStock, type: "OPENING", note: "Opening stock", createdBy: req.user.id });
    }
    res.status(201).json({ ...item.toObject(), stockOnHand: openingStock ?? 0 });
  } catch (err) { next(err); }
}

export async function updateItem(req, res, next) {
  try {
    const { Item } = getModels(req.tenantDb);
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Item not found" });
    const stockOnHand = await getStockLevel(req.tenantDb, item._id);
    res.json({ ...item.toObject(), stockOnHand });
  } catch (err) { next(err); }
}

export async function deactivateItem(req, res, next) {
  try {
    const { Item } = getModels(req.tenantDb);
    const item = await Item.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function getItemAnalytics(req, res, next) {
  try {
    const { Item, PurchaseOrder, SalesOrder, StockAdjustment } = getModels(req.tenantDb);
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const itemId = item._id;

    const [purchaseRows, salesRows, adjRows] = await Promise.all([
      PurchaseOrder.aggregate([{ $match: { status: "POSTED" } }, { $unwind: "$items" }, { $match: { "items.item": itemId } }, { $group: { _id: null, totalQty: { $sum: "$items.qty" }, totalValue: { $sum: "$items.lineTotal" }, lastDate: { $max: "$date" }, lastPrice: { $last: "$items.unitPrice" } } }]),
      SalesOrder.aggregate([{ $match: { status: "POSTED" } }, { $unwind: "$items" }, { $match: { "items.item": itemId } }, { $group: { _id: null, totalQty: { $sum: "$items.qty" }, totalValue: { $sum: "$items.lineTotal" }, lastDate: { $max: "$date" }, lastPrice: { $last: "$items.unitPrice" } } }]),
      StockAdjustment.aggregate([{ $match: { item: itemId, status: "POSTED" } }, { $group: { _id: null, netQty: { $sum: { $cond: [{ $in: ["$type", ["INCREASE","PHYSICAL_COUNT_PLUS","OPENING_CORRECTION_PLUS"]] }, "$qty", { $multiply: ["$qty",-1] }] } } } }]),
    ]);

    const purRow = purchaseRows[0] ?? {};
    const salRow = salesRows[0] ?? {};
    const totalPurchaseQty = purRow.totalQty ?? 0;
    const totalPurchaseValue = purRow.totalValue ?? 0;
    const averageCostPrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : (item.costPrice ?? 0);
    const totalSalesQty = salRow.totalQty ?? 0;
    const totalSalesValue = salRow.totalValue ?? 0;
    const averageSellingPrice = totalSalesQty > 0 ? totalSalesValue / totalSalesQty : (item.sellingPrice ?? 0);
    const lastPurchasePrice = purRow.lastPrice ?? 0;
    let costTrend = "NO_PURCHASE_HISTORY";
    if (lastPurchasePrice > 0 && averageCostPrice > 0) {
      const diff = lastPurchasePrice - averageCostPrice;
      costTrend = Math.abs(diff) <= 0.005 ? "UNCHANGED" : diff > 0 ? `INCREASED_BY_${diff.toFixed(2)}` : `REDUCED_BY_${Math.abs(diff).toFixed(2)}`;
    }

    const stockOnHand = await getStockLevel(req.tenantDb, itemId);
    const inventoryValue = stockOnHand * averageCostPrice;
    const actualProfit = averageSellingPrice - averageCostPrice;
    const actualProfitPct = averageCostPrice > 0 ? (actualProfit / averageCostPrice) * 100 : 0;

    res.json({
      item: { _id: item._id, name: item.name, costPrice: item.costPrice, sellingPrice: item.sellingPrice, packConverter: item.packConverter },
      purchase: { totalQty: totalPurchaseQty, totalValue: totalPurchaseValue, averageCostPrice, lastDate: purRow.lastDate, lastPrice: lastPurchasePrice },
      sales: { totalQty: totalSalesQty, totalValue: totalSalesValue, averageSellingPrice, lastDate: salRow.lastDate, lastPrice: salRow.lastPrice ?? 0 },
      profit: { actualProfit, actualProfitPct },
      stock: { stockOnHand, netAdjustment: adjRows[0]?.netQty ?? 0, inventoryValue },
      costTrend,
    });
  } catch (err) { next(err); }
}
