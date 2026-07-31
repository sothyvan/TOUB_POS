import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getProducts, getImageKitAuth, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { validateBody } from '../validation/request-validation.js';
import {
  createProductBody,
  emptyBody,
  updateProductBody,
} from '../validation/mutation-schemas.js';

const router = Router();

// Require authentication for all product endpoints
router.use(authenticate);

// GET    /api/products        — Any authenticated web-app user can list
router.get('/', getProducts);
router.get('/imagekit-auth', authorize(['owner', 'manager']), getImageKitAuth);

// Mutation routes require management authorization
router.post('/', authorize(['owner', 'manager']), validateBody(createProductBody), createProduct);
router.put('/:id', authorize(['owner', 'manager']), validateBody(updateProductBody), updateProduct);
router.delete('/:id', authorize(['owner', 'manager']), validateBody(emptyBody), deleteProduct);

export default router;
