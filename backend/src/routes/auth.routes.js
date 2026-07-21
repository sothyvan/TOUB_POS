import { Router } from 'express';
import { login, loginPin, getPublicCashiers, getDeviceStatus } from '../controllers/auth.controller.js';
import { loginRateLimiter, pinLoginRateLimiter } from '../middleware/rate-limit.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginRateLimiter, login);

// POST /api/auth/pin
router.post('/pin', pinLoginRateLimiter, loginPin);

// GET /api/auth/cashiers
router.get('/cashiers', getPublicCashiers);

// GET /api/auth/device-status — Validate the active cashier terminal/session
router.get('/device-status', authenticate, authorize('cashier'), getDeviceStatus);

export default router;
