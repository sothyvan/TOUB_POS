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
router.post('/', authorize('cashier'), createOrder);

// GET    /api/orders/mine  — cashier fetches their own orders
router.get('/mine', authorize('cashier'), getMyOrders);

// GET    /api/orders       — owner/manager fetches all orders
router.get('/', authorize(['owner', 'manager']), getAllOrders);

export default router;
