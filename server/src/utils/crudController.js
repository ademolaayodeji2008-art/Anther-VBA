import { buildSearchFilter, parsePagination } from "./queryHelpers.js";

/**
 * Generic list/get/create/update/soft-delete handlers for simple master-data models.
 * softDelete controls which field+value marks a record inactive (e.g. active:false, or status:'INACTIVE').
 * extraFilter(query) lets callers translate extra query params (e.g. ?active=true) into a Mongo filter.
 */
export function createCrudController(
  Model,
  { searchFields = [], softDelete = { field: "active", value: false }, extraFilter } = {}
) {
  async function list(req, res, next) {
    try {
      const { search } = req.query;
      const { limit, skip, page } = parsePagination(req.query);
      const filter = {
        ...buildSearchFilter(searchFields, search),
        ...(extraFilter ? extraFilter(req.query) : {}),
      };

      const [items, total] = await Promise.all([
        Model.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
        Model.countDocuments(filter),
      ]);
      res.json({ items, total, page, limit });
    } catch (err) {
      next(err);
    }
  }

  async function get(req, res, next) {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${Model.modelName} not found` });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }

  async function create(req, res, next) {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  }

  async function update(req, res, next) {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ message: `${Model.modelName} not found` });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }

  async function remove(req, res, next) {
    try {
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        { [softDelete.field]: softDelete.value },
        { new: true }
      );
      if (!doc) return res.status(404).json({ message: `${Model.modelName} not found` });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  return { list, get, create, update, remove };
}
