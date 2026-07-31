import { TelegramCook } from '../models/index.js';

export function findCooksByStallId(stallId) {
  return TelegramCook.findAll({
    where: { stall_id: stallId },
    order: [
      ['is_active', 'DESC'],
      ['display_name', 'ASC'],
    ],
  });
}

export function findCookById(cookId, options = {}) {
  return TelegramCook.findByPk(cookId, options);
}

export function findActiveCook(stallId, telegramUserId) {
  return TelegramCook.findOne({
    where: {
      stall_id: stallId,
      telegram_user_id: String(telegramUserId),
      is_active: true,
    },
  });
}

export async function upsertCook({ stallId, telegramUserId, displayName }, options = {}) {
  const [cook, created] = await TelegramCook.findOrCreate({
    where: {
      stall_id: stallId,
      telegram_user_id: String(telegramUserId),
    }, ...options,
    defaults: {
      display_name: displayName,
      is_active: true,
    },
  });

  if (!created) {
    cook.display_name = displayName;
    cook.is_active = true;
    cook.updated_at = new Date();
    await cook.save(options);
  }

  return cook;
}

export async function deactivateCook(cook, options = {}) {
  cook.is_active = false;
  cook.updated_at = new Date();
  await cook.save(options);
  return cook;
}
