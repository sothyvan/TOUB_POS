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
export function findCategoryById(id) {
  return Category.findByPk(id);
}

/**
 * Create a new category.
 */
export function insertCategory(data) {
  return Category.create(data);
}

/**
 * Update a category by ID.
 */
export async function updateCategoryById(id, data) {
  const [affectedRows] = await Category.update(data, { where: { id } });
  return affectedRows > 0;
}

/**
 * Delete a category by ID.
 */
export async function deleteCategoryById(id) {
  const affectedRows = await Category.destroy({ where: { id } });
  return affectedRows > 0;
}
