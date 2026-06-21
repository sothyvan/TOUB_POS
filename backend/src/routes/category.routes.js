import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';

const router = Router();

// Require authentication and restrict to admin or manager roles
router.use(authenticate, authorize('admin', 'manager'));

// GET    /api/categories      — List all categories
router.get('/', getCategories);

// POST   /api/categories      — Create a new category
router.post('/', createCategory);

// PUT    /api/categories/:id  — Update a category
router.put('/:id', updateCategory);

// DELETE /api/categories/:id  — Delete a category
router.delete('/:id', deleteCategory);

export default router;
