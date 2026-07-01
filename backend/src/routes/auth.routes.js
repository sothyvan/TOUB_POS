import { Router } from 'express';
import { login, loginPin, getPublicCashiers } from '../controllers/auth.controller.js';
import { loginRateLimiter, pinLoginRateLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginRateLimiter, login);

// POST /api/auth/pin
router.post('/pin', pinLoginRateLimiter, loginPin);

// GET /api/auth/cashiers
router.get('/cashiers', getPublicCashiers);

export default router;
