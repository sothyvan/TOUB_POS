import * as categoryRepository from '../repositories/category.repository.js';

/**
 * Get all categories.
 */
export async function getCategories(req, res, next) {
  try {
    const categories = await categoryRepository.findAllCategories({});
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new category.
 */
export async function createCategory(req, res, next) {
  try {
    const { name, tone } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const category = await categoryRepository.insertCategory({ name, tone });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing category.
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, tone } = req.body;

    const updateData = {};
    if (name !== undefined) {updateData.name = name;}
    if (tone !== undefined) {updateData.tone = tone;}

    const success = await categoryRepository.updateCategoryById(id, updateData);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Category not found or no changes made.' });
    }
    res.json({ success: true, message: 'Category updated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a category by ID.
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const success = await categoryRepository.deleteCategoryById(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
