import * as categoryRepository from '../repositories/category.repository.js';

function resolveOwnerId(req) {
  return req.user.role === 'owner' ? req.user.id : req.user.owner_id;
}

export async function getCategories(req, res, next) {
  try {
    const ownerId = resolveOwnerId(req);
    const result = await categoryRepository.findAllCategories({ owner_id: ownerId }, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, tone } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const ownerId = resolveOwnerId(req);
    const category = await categoryRepository.insertCategory({ name, tone, owner_id: ownerId });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = resolveOwnerId(req);

    const existing = await categoryRepository.findCategoryById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    if (existing.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Category does not belong to your business.' });
    }

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

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = resolveOwnerId(req);

    const existing = await categoryRepository.findCategoryById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    if (existing.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Category does not belong to your business.' });
    }

    const success = await categoryRepository.deleteCategoryById(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
