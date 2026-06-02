import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';

const router = Router();

router.use(authenticate);

// GET    /api/products
router.get('/', getProducts);

// POST   /api/products        — manager only (enforced in controller)
router.post('/', createProduct);

// PUT    /api/products/:id    — manager only
router.put('/:id', updateProduct);

// DELETE /api/products/:id    — manager only
router.delete('/:id', deleteProduct);

export default router;
