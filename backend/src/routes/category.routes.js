import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';

const router = Router();

// GET    /api/categories      — List all categories (Accessible by cashiers too)
router.get('/', authenticate, getCategories);

// Require authentication and restrict to management roles for mutations
router.use(authenticate, authorize(['owner', 'manager']));

// POST   /api/categories      — Create a new category
router.post('/', createCategory);

// PUT    /api/categories/:id  — Update a category
router.put('/:id', updateCategory);

// DELETE /api/categories/:id  — Delete a category
router.delete('/:id', deleteCategory);

export default router;
