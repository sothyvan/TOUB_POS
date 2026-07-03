import { Router } from 'express';
import { handleCallback } from '../controllers/telegram.controller.js';

const router = Router();

/**
 * POST /api/telegram/callback
 *
 * Telegram's server hits this endpoint with incoming updates (button presses, messages, etc.)
 * No JWT authentication — Telegram is the caller, not our frontend.
 * Security is handled inside the controller via X-Telegram-Bot-Api-Secret-Token header validation.
 */
router.post('/callback', handleCallback);

export default router;
