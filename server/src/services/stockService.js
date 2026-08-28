import StockMovement from "../models/StockMovement.js";
import Item from "../models/Item.js";

/** Returns a Map of itemId(string) -> current stock on hand, summed from the movement ledger. */
export async function getStockLevels(itemIds) {
  const match = itemIds?.length ? { item: { $in: itemIds } } : {};
  const rows = await StockMovement.aggregate([
    { $match: match },
    { $group: { _id: "$item", qty: { $sum: "$qty" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.qty]));
}

export async function getStockLevel(itemId) {
  const levels = await getStockLevels([itemId]);
  return levels.get(itemId.toString()) ?? 0;
}

export async function recordStockMovement(data, options) {
  const [doc] = await StockMovement.create([data], options);
  return doc;
}

export async function listItemsWithStock(filter, { skip = 0, limit = 50, sort = { name: 1 } } = {}) {
  const items = await Item.find(filter).sort(sort).skip(skip).limit(limit);
  const levels = await getStockLevels(items.map((i) => i._id));
  return items.map((item) => ({
    ...item.toObject(),
    stockOnHand: levels.get(item._id.toString()) ?? 0,
  }));
}
