import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';

const router = Router();

// Require authentication for all product endpoints
router.use(authenticate);

// GET    /api/products        — Anyone authenticated (cashier, manager, admin) can list
router.get('/', getProducts);

// Mutation routes require admin or manager authorization
router.post('/', authorize('admin', 'manager'), createProduct);
router.put('/:id', authorize('admin', 'manager'), updateProduct);
router.delete('/:id', authorize('admin', 'manager'), deleteProduct);

export default router;
