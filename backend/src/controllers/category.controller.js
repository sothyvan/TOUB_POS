import { Op } from 'sequelize';
import * as categoryRepository from '../repositories/category.repository.js';
import * as stallRepository from '../repositories/stall.repository.js';
import * as userRepository from '../repositories/user.repository.js';

function hasProvidedStallId(stallId) {
  return stallId !== undefined && stallId !== null && stallId !== '';
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function validateOptionalStall(res, stallId) {
  if (!hasProvidedStallId(stallId)) {
    return null;
  }

  const parsedStallId = parsePositiveInteger(stallId);
  if (!parsedStallId) {
    res.status(400).json({ success: false, message: 'stall_id must be a positive integer.' });
    return false;
  }

  const stall = await stallRepository.findStallById(parsedStallId);
  if (!stall) {
    res.status(404).json({ success: false, message: 'Stall not found.' });
    return false;
  }

  return parsedStallId;
}

/**
 * Get all categories.
 */
export async function getCategories(req, res, next) {
  try {
    const whereClause = {};
    if (req.user?.role === 'cashier') {
      const stall = await userRepository.findAssignedStallByUserId(req.user.id);
      if (!stall) {
        return res.json({ success: true, data: [] });
      }
      whereClause[Op.or] = [{ stall_id: stall.id }, { stall_id: null }];
    }

    const categories = await categoryRepository.findAllCategories(whereClause);
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
    const { name, tone, stall_id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const parsedStallId = await validateOptionalStall(res, stall_id);
    if (parsedStallId === false) {
      return;
    }
    const category = await categoryRepository.insertCategory({ name, tone, stall_id: parsedStallId });
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
    const { name, tone, stall_id } = req.body;

    const updateData = {};
    if (name !== undefined) {updateData.name = name;}
    if (tone !== undefined) {updateData.tone = tone;}
    if (stall_id !== undefined) {
      const parsedStallId = await validateOptionalStall(res, stall_id);
      if (parsedStallId === false) {
        return;
      }
      updateData.stall_id = parsedStallId;
    }

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
