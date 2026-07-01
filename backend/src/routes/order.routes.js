import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  confirmCashPayment,
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

// POST   /api/orders/:id/confirm-cash — confirm physical cash received
router.post('/:id/confirm-cash', authorize(['owner', 'manager', 'cashier']), confirmCashPayment);

// GET    /api/orders       — owner/manager fetches all orders
router.get('/', authorize(['owner', 'manager']), getAllOrders);

export default router;
