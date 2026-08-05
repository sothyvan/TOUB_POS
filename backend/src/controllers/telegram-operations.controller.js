import { getTelegramOperations } from '../services/telegram-operations.service.js';

export async function getTelegramOperationsSnapshot(req, res, next) {
  try {
    const snapshot = await getTelegramOperations(req.user, req.query);
    res.json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
}
