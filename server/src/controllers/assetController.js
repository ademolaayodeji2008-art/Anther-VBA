import { z } from "zod";
import Asset, { DEPRECIATION_METHODS, ASSET_CONDITIONS, ASSET_STATUSES } from "../models/Asset.js";
import { createAsset } from "../services/assetService.js";
import { buildSearchFilter, parsePagination } from "../utils/queryHelpers.js";
import { requiredDate } from "../utils/zodHelpers.js";

export const createAssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  assignedUser: z.string().optional(),
  location: z.string().optional(),
  serialNo: z.string().optional(),
  purchaseDate: requiredDate("Purchase date is required"),
  supplier: z.string().optional(),
  invoiceNo: z.string().optional(),
  cost: z.number().min(0),
  usefulLifeYears: z.number().min(1),
  depreciationMethod: z.enum(DEPRECIATION_METHODS),
  condition: z.enum(ASSET_CONDITIONS).optional(),
  remarks: z.string().optional(),
});

export const updateAssetSchema = createAssetSchema
  .partial()
  .extend({ status: z.enum(ASSET_STATUSES).optional() });

export async function listAssets(req, res, next) {
  try {
    const { search, status, category } = req.query;
    const { limit, skip, page } = parsePagination(req.query);
    const filter = { ...buildSearchFilter(["name", "assetId", "serialNo"], search) };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [items, total] = await Promise.all([
      Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Asset.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getAsset(req, res, next) {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function createAssetHandler(req, res, next) {
  try {
    const asset = await createAsset(req.body);
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}

export async function updateAsset(req, res, next) {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function deleteAsset(req, res, next) {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, { status: "DISPOSED" }, { new: true });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
