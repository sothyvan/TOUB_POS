import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createOrder,
  getMyOrders,
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// POST   /api/orders       — cashier creates a new order / QR session
router.post('/', createOrder);

// GET    /api/orders/mine  — cashier fetches their own orders
router.get('/mine', getMyOrders);

export default router;
