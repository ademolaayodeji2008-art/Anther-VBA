import { buildSearchFilter, parsePagination } from "./queryHelpers.js";
import { getModels } from "../tenant/tenantDb.js";

/**
 * Tenant-aware generic CRUD handlers.
 * modelName must match a key in getModels() (e.g. "Customer", "Vendor").
 */
export function createCrudController(
  modelName,
  { searchFields = [], softDelete = { field: "active", value: false }, extraFilter } = {}
) {
  function getModel(req) {
    return getModels(req.tenantDb)[modelName];
  }

  async function list(req, res, next) {
    try {
      const Model = getModel(req);
      const { search } = req.query;
      const { limit, skip, page } = parsePagination(req.query);
      const filter = { ...buildSearchFilter(searchFields, search), ...(extraFilter ? extraFilter(req.query) : {}) };
      const [items, total] = await Promise.all([Model.find(filter).sort({ name: 1 }).skip(skip).limit(limit), Model.countDocuments(filter)]);
      res.json({ items, total, page, limit });
    } catch (err) { next(err); }
  }

  async function get(req, res, next) {
    try {
      const Model = getModel(req);
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${modelName} not found` });
      res.json(doc);
    } catch (err) { next(err); }
  }

  async function create(req, res, next) {
    try {
      const Model = getModel(req);
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    } catch (err) { next(err); }
  }

  async function update(req, res, next) {
    try {
      const Model = getModel(req);
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ message: `${modelName} not found` });
      res.json(doc);
    } catch (err) { next(err); }
  }

  async function remove(req, res, next) {
    try {
      const Model = getModel(req);
      const doc = await Model.findByIdAndUpdate(req.params.id, { [softDelete.field]: softDelete.value }, { new: true });
      if (!doc) return res.status(404).json({ message: `${modelName} not found` });
      res.status(204).end();
    } catch (err) { next(err); }
  }

  return { list, get, create, update, remove };
}
