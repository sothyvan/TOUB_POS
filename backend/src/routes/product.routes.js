import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getProducts, getImageKitAuth, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';

const router = Router();

// Require authentication for all product endpoints
router.use(authenticate);

// GET    /api/products        — Any authenticated web-app user can list
router.get('/', getProducts);
router.get('/imagekit-auth', authorize(['owner', 'manager']), getImageKitAuth);

// Mutation routes require management authorization
router.post('/', authorize(['owner', 'manager']), createProduct);
router.put('/:id', authorize(['owner', 'manager']), updateProduct);
router.delete('/:id', authorize(['owner', 'manager']), deleteProduct);

export default router;
