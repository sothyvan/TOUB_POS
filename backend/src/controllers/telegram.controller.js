import { processTelegramCallback } from '../services/telegram-callback.service.js';
import { timingSafeEqual } from 'node:crypto';

function isValidTelegramRequest(req) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return false;
  }

  const receivedSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '');
  const expectedBuffer = Buffer.from(webhookSecret);
  const receivedBuffer = Buffer.from(receivedSecret);
  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function handleCallback(req, res) {
  res.sendStatus(200);

  if (!isValidTelegramRequest(req)) {
    console.warn('[Telegram] Rejected callback: invalid secret token.');
    return;
  }

  await processTelegramCallback(req.body);
}
