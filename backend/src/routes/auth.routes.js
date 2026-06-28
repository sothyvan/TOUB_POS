import { Router } from 'express';
import { login, loginPin, getPublicCashiers } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/pin
router.post('/pin', loginPin);

// GET /api/auth/cashiers
router.get('/cashiers', getPublicCashiers);

export default router;
