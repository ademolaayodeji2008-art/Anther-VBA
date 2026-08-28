import { z } from "zod";
import Item from "../models/Item.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import SalesOrder from "../models/SalesOrder.js";
import StockAdjustment from "../models/StockAdjustment.js";
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

export const updateItemSchema = createItemSchema
  .omit({ openingStock: true })
  .partial()
  .extend({ active: z.boolean().optional() });

export async function listItems(req, res, next) {
  try {
    const { search, active } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = { ...buildSearchFilter(["name"], search) };
    if (active !== undefined) filter.active = active === "true";

    const [items, total] = await Promise.all([
      listItemsWithStock(filter, { skip, limit }),
      Item.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getItem(req, res, next) {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const stockOnHand = await getStockLevel(item._id);
    res.json({ ...item.toObject(), stockOnHand });
  } catch (err) {
    next(err);
  }
}

export async function createItem(req, res, next) {
  try {
    const { openingStock, ...itemFields } = req.body;
    const item = await Item.create(itemFields);
    if (openingStock) {
      await recordStockMovement({
        item: item._id,
        qty: openingStock,
        type: "OPENING",
        note: "Opening stock",
        createdBy: req.user.id,
      });
    }
    res.status(201).json({ ...item.toObject(), stockOnHand: openingStock ?? 0 });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    const stockOnHand = await getStockLevel(item._id);
    res.json({ ...item.toObject(), stockOnHand });
  } catch (err) {
    next(err);
  }
}

export async function deactivateItem(req, res, next) {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/**
 * Returns purchase history, sales history, stock adjustments and derived analytics for a single
 * item — mirrors the VBA Item Register's analysis panel (average cost, average selling price,
 * actual profit %, last purchase/sale date, cost trend, net adjustment, inventory value).
 */
export async function getItemAnalytics(req, res, next) {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const itemId = item._id;

    // Purchase analysis — aggregate from PO lines where this item appears
    const purchaseRows = await PurchaseOrder.aggregate([
      { $match: { status: "POSTED" } },
      { $unwind: "$items" },
      { $match: { "items.item": itemId } },
      {
        $group: {
          _id: null,
          totalQty: { $sum: "$items.qty" },
          totalValue: { $sum: "$items.lineTotal" },
          lastDate: { $max: "$date" },
          lastPrice: { $last: "$items.unitPrice" },
        },
      },
    ]);

    const purRow = purchaseRows[0] ?? {};
    const totalPurchaseQty = purRow.totalQty ?? 0;
    const totalPurchaseValue = purRow.totalValue ?? 0;
    const averageCostPrice = totalPurchaseQty > 0 ? totalPurchaseValue / totalPurchaseQty : (item.costPrice ?? 0);
    const lastPurchaseDate = purRow.lastDate ?? null;
    const lastPurchasePrice = purRow.lastPrice ?? 0;

    // Determine cost trend
    let costTrend = "NO_PURCHASE_HISTORY";
    if (lastPurchasePrice > 0 && averageCostPrice > 0) {
      const diff = lastPurchasePrice - averageCostPrice;
      if (diff > 0.005) costTrend = `INCREASED_BY_${diff.toFixed(2)}`;
      else if (diff < -0.005) costTrend = `REDUCED_BY_${Math.abs(diff).toFixed(2)}`;
      else costTrend = "UNCHANGED";
    }

    // Sales analysis — aggregate from SalesOrder lines
    const salesRows = await SalesOrder.aggregate([
      { $match: { status: "POSTED" } },
      { $unwind: "$items" },
      { $match: { "items.item": itemId } },
      {
        $group: {
          _id: null,
          totalQty: { $sum: "$items.qty" },
          totalValue: { $sum: "$items.lineTotal" },
          lastDate: { $max: "$date" },
          lastPrice: { $last: "$items.unitPrice" },
        },
      },
    ]);

    const salRow = salesRows[0] ?? {};
    const totalSalesQty = salRow.totalQty ?? 0;
    const totalSalesValue = salRow.totalValue ?? 0;
    const averageSellingPrice = totalSalesQty > 0 ? totalSalesValue / totalSalesQty : (item.sellingPrice ?? 0);
    const lastSaleDate = salRow.lastDate ?? null;
    const lastSellingPrice = salRow.lastPrice ?? 0;

    // Profit analytics
    const actualProfit = averageSellingPrice - averageCostPrice;
    const actualProfitPct = averageCostPrice > 0 ? (actualProfit / averageCostPrice) * 100 : 0;

    // Net stock adjustments
    const adjRows = await StockAdjustment.aggregate([
      { $match: { item: itemId, status: "POSTED" } },
      { $group: { _id: null, netQty: { $sum: { $cond: [{ $in: ["$type", ["INCREASE", "PHYSICAL_COUNT_PLUS", "OPENING_CORRECTION_PLUS"]] }, "$qty", { $multiply: ["$qty", -1] }] } } } },
    ]);
    const netAdjustment = adjRows[0]?.netQty ?? 0;

    // Current stock on hand and inventory value
    const stockOnHand = await getStockLevel(itemId);
    const inventoryValue = stockOnHand * averageCostPrice;

    res.json({
      item: { _id: item._id, name: item.name, costPrice: item.costPrice, sellingPrice: item.sellingPrice, packConverter: item.packConverter },
      purchase: { totalQty: totalPurchaseQty, totalValue: totalPurchaseValue, averageCostPrice, lastDate: lastPurchaseDate, lastPrice: lastPurchasePrice },
      sales: { totalQty: totalSalesQty, totalValue: totalSalesValue, averageSellingPrice, lastDate: lastSaleDate, lastPrice: lastSellingPrice },
      profit: { actualProfit, actualProfitPct },
      stock: { stockOnHand, netAdjustment, inventoryValue },
      costTrend,
    });
  } catch (err) {
    next(err);
  }
}
