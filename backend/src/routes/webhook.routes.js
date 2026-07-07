import { Router } from 'express';
import { handlePaymentWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// POST /api/webhook/payment — legacy placeholder path
router.post('/payment', handlePaymentWebhook);

export default router;
