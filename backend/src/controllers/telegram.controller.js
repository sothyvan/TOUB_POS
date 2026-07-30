import { processTelegramCallback } from '../services/telegram-callback.service.js';

function isValidTelegramRequest(req) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
  }
  return req.headers['x-telegram-bot-api-secret-token'] === webhookSecret;
}

export async function handleCallback(req, res) {
  res.sendStatus(200);

  if (!isValidTelegramRequest(req)) {
    console.warn('[Telegram] Rejected callback: invalid secret token.');
    return;
  }

  await processTelegramCallback(req.body);
}
