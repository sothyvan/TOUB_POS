import { Router } from 'express';
import {
  getDeviceStatus,
  getPublicCashiers,
  login,
  loginPin,
  logout,
  refresh,
} from '../controllers/auth.controller.js';
import {
  authIpRateLimiter,
  loginRateLimiter,
  pinLoginRateLimiter,
  refreshRateLimiter,
} from '../middleware/rate-limit.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authIpRateLimiter, loginRateLimiter, login);

// POST /api/auth/pin
router.post('/pin', authIpRateLimiter, pinLoginRateLimiter, loginPin);

// POST /api/auth/refresh
router.post('/refresh', refreshRateLimiter, refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/cashiers
router.get('/cashiers', getPublicCashiers);

// GET /api/auth/device-status — Validate the active cashier terminal/session
router.get('/device-status', authenticate, authorize('cashier'), getDeviceStatus);

export default router;
