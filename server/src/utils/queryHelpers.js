/** Builds a case-insensitive OR-regex filter across the given fields, or {} if search is empty. */
export function buildSearchFilter(fields, search) {
  if (!search?.trim()) return {};
  const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

export function parsePagination(query, defaultLimit = 50, maxLimit = 200) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Defaults to month-to-date, matching the VBA report center's default range. */
export function parseDateRange(query) {
  const now = new Date();
  const start = query.startDate ? new Date(query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = query.endDate ? new Date(query.endDate) : now;
  return { start, end };
}
