import * as categoryService from '../services/category.service.js';

export async function getCategories(req, res, next) {
  try {
    const result = await categoryService.listCategories(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.user, req.body, req.requestId);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    await categoryService.updateCategory(req.user, req.params.id, req.body, req.requestId);
    res.json({ success: true, message: 'Category updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    await categoryService.deleteCategory(req.user, req.params.id, req.requestId);
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
