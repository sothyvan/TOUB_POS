import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';

const router = Router();

// Require authentication for all product endpoints
router.use(authenticate);

// GET    /api/products        — Any authenticated web-app user can list
router.get('/', getProducts);

// Mutation routes require management authorization
router.post('/', authorize(['owner', 'manager']), createProduct);
router.put('/:id', authorize(['owner', 'manager']), updateProduct);
router.delete('/:id', authorize(['owner', 'manager']), deleteProduct);

export default router;
