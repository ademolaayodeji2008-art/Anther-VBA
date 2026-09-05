import { getModels } from "../tenant/tenantDb.js";

export async function getStockLevels(tenantDb, itemIds) {
  const { StockMovement } = getModels(tenantDb);
  const match = itemIds?.length ? { item: { $in: itemIds } } : {};
  const rows = await StockMovement.aggregate([
    { $match: match },
    { $group: { _id: "$item", qty: { $sum: "$qty" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.qty]));
}

export async function getStockLevel(tenantDb, itemId) {
  const levels = await getStockLevels(tenantDb, [itemId]);
  return levels.get(itemId.toString()) ?? 0;
}

export async function recordStockMovement(tenantDb, data, options) {
  const { StockMovement } = getModels(tenantDb);
  const [doc] = await StockMovement.create([data], options);
  return doc;
}

export async function listItemsWithStock(tenantDb, filter, { skip = 0, limit = 50, sort = { name: 1 } } = {}) {
  const { Item } = getModels(tenantDb);
  const items = await Item.find(filter).sort(sort).skip(skip).limit(limit);
  const levels = await getStockLevels(tenantDb, items.map((i) => i._id));
  return items.map((item) => ({
    ...item.toObject(),
    stockOnHand: levels.get(item._id.toString()) ?? 0,
  }));
}
