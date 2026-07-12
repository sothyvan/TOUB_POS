const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const SORT_DIRECTIONS = ['ASC', 'DESC'];

/**
 * Parse and validate pagination parameters from req.query.
 * Returns a normalized pagination object safe for Sequelize.
 */
export function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const offset = (page - 1) * limit;
  const sort = typeof query.sort === 'string' ? query.sort : 'created_at';
  const order = SORT_DIRECTIONS.includes(String(query.order).toUpperCase())
    ? String(query.order).toUpperCase()
    : 'DESC';

  return { page, limit, offset, sort, order };
}

/**
 * Build a Sequelize-compatible order clause from pagination sort params.
 * Supports dotted paths like "created_at" or "cashier.username".
 * Falls back to the provided fallback when the sort column is not in the allowed list.
 */
export function buildOrderClause({ sort, order }, allowedColumns = [], fallback = [['created_at', 'DESC']]) {
  if (allowedColumns.length > 0 && !allowedColumns.includes(sort)) {
    return fallback;
  }
  return [[sort, order]];
}

/**
 * Build a pagination response metadata object.
 */
export function buildPaginationMeta({ page, limit }, totalCount) {
  const totalPages = Math.ceil(totalCount / limit) || 1;
  return {
    page,
    limit,
    total: totalCount,
    totalPages,
  };
}

/**
 * Wrap a findAndCountAll result into a paginated response shape.
 */
export function paginatedResponse({ rows, count }, paginationOpts) {
  return {
    data: rows,
    pagination: buildPaginationMeta(paginationOpts, count),
  };
}
