import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';

const router = Router();

// Require authentication for all product endpoints
router.use(authenticate);

// GET    /api/products        — Any authenticated web-app user can list
router.get('/', getProducts);

// Mutation routes require admin authorization
router.post('/', authorize('admin'), createProduct);
router.put('/:id', authorize('admin'), updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);

export default router;
