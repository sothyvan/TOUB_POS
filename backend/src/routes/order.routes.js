import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  checkKhqrPaymentStatus,
  confirmCashPayment,
  createOrder,
  getOrder,
  getMyOrders,
  getAllOrders,
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// POST   /api/orders       — cashier creates a new order / QR session
router.post('/', authorize('cashier'), createOrder);

// GET    /api/orders/mine  — cashier fetches their own orders
router.get('/mine', authorize('cashier'), getMyOrders);

// GET    /api/orders/:id   — fetch one order with cashier ownership checks
router.get('/:id', authorize(['owner', 'manager', 'cashier']), getOrder);

// POST   /api/orders/:id/check-khqr-status — check KHQR payment status through backend provider mode
router.post('/:id/check-khqr-status', authorize(['owner', 'manager', 'cashier']), checkKhqrPaymentStatus);

// POST   /api/orders/:id/confirm-cash — confirm physical cash received
router.post('/:id/confirm-cash', authorize(['owner', 'manager', 'cashier']), confirmCashPayment);

// GET    /api/orders       — owner/manager fetches all orders
router.get('/', authorize(['owner', 'manager']), getAllOrders);

export default router;
