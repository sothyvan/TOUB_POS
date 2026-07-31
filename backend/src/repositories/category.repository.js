import { Category } from '../models/index.js';
import { parsePagination, buildOrderClause, paginatedResponse } from '../utils/pagination.js';

/**
 * Fetch all global categories.
 */
export async function findAllCategories(whereClause = {}, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'name'], [['created_at', 'DESC']]);

  const { rows, count } = await Category.findAndCountAll({
    where: whereClause,
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Find a category by ID.
 */
export function findCategoryById(id, options = {}) {
  return Category.findByPk(id, options);
}

/**
 * Create a new category.
 */
export function insertCategory(data, options = {}) {
  return Category.create(data, options);
}

/**
 * Update a category by ID.
 */
export async function updateCategoryById(id, data, options = {}) {
  const [affectedRows] = await Category.update(data, { where: { id }, ...options });
  return affectedRows > 0;
}

/**
 * Delete a category by ID.
 */
export async function deleteCategoryById(id, options = {}) {
  const affectedRows = await Category.destroy({ where: { id }, ...options });
  return affectedRows > 0;
}
