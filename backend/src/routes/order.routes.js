import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createOrder,
  getMyOrders,
  getAllOrders,
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// POST   /api/orders       — cashier creates a new order / QR session
router.post('/', createOrder);

// GET    /api/orders/mine  — cashier fetches their own orders
router.get('/mine', getMyOrders);

// GET    /api/orders       — admin fetches all orders
router.get('/', authorize('admin'), getAllOrders);

export default router;
