import * as migrationRepository from '../repositories/telegram-chat-migration.repository.js';
import { maskTelegramChatId } from '../utils/telegram-identifier.util.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';

function normalizeChatId(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!/^-?\d+$/.test(normalized) || normalized === '0') {
    const error = new Error(`${fieldName} must be a valid Telegram chat ID.`);
    error.code = 'TELEGRAM_CHAT_MIGRATION_INVALID_ID';
    throw error;
  }
  return BigInt(normalized).toString();
}

export function migrateTelegramChatRouting(input, dependencyOverrides = {}) {
  const stallId = Number(input?.stallId);
  if (!Number.isInteger(stallId) || stallId <= 0) {
    const error = new Error('Telegram chat migration requires a valid stall ID.');
    error.code = 'TELEGRAM_CHAT_MIGRATION_INVALID_STALL';
    throw error;
  }

  const oldChatId = normalizeChatId(input.oldChatId, 'Old chat ID');
  const newChatId = normalizeChatId(input.newChatId, 'New chat ID');
  const dependencies = {
    migrateRouting: migrationRepository.migrateTelegramChatRouting,
    writeAudit: writeAdministrativeAudit,
    ...dependencyOverrides,
  };

  return dependencies.migrateRouting({
    stallId,
    oldChatId,
    newChatId,
    audit: ({ transaction, stall, updatedTicketCount }) => dependencies.writeAudit({
      actor: null,
      ownerId: stall.owner_id,
      action: AUDIT_ACTIONS.TELEGRAM_GROUP_CHAT_MIGRATED,
      targetType: 'stall',
      targetId: stall.id,
      before: { chat_id_masked: maskTelegramChatId(oldChatId) },
      after: {
        chat_id_masked: maskTelegramChatId(newChatId),
        active_ticket_count: updatedTicketCount,
      },
      metadata: { source: 'telegram_supergroup_upgrade' },
      transaction,
    }),
  });
}
