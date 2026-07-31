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
import { validateBody } from '../validation/request-validation.js';
import {
  emptyBody,
  loginBody,
  pinLoginBody,
} from '../validation/mutation-schemas.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authIpRateLimiter, loginRateLimiter, validateBody(loginBody), login);

// POST /api/auth/pin
router.post('/pin', authIpRateLimiter, pinLoginRateLimiter, validateBody(pinLoginBody), loginPin);

// POST /api/auth/refresh
router.post('/refresh', refreshRateLimiter, validateBody(emptyBody), refresh);

// POST /api/auth/logout
router.post('/logout', validateBody(emptyBody), logout);

// GET /api/auth/cashiers
router.get('/cashiers', getPublicCashiers);

// GET /api/auth/device-status — Validate the active cashier terminal/session
router.get('/device-status', authenticate, authorize('cashier'), getDeviceStatus);

export default router;
