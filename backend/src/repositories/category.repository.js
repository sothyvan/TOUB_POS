import { Category, Stall } from '../models/index.js';

/**
 * Fetch all categories, including optional stall association.
 */
export async function findAllCategories(whereClause = {}) {
  return Category.findAll({
    where: whereClause,
    include: [
      {
        model: Stall,
        attributes: ['id', 'name'],
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Find a category by ID.
 */
export async function findCategoryById(id) {
  return Category.findByPk(id, {
    include: [
      {
        model: Stall,
        attributes: ['id', 'name'],
      },
    ],
  });
}

/**
 * Create a new category.
 */
export async function insertCategory(data) {
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
