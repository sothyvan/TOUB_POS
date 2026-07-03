import { Category } from '../models/index.js';

/**
 * Fetch all global categories.
 */
export function findAllCategories(whereClause = {}) {
  return Category.findAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
  });
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
