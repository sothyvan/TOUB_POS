import { Op } from 'sequelize';
import {
  sequelize,
  Order,
  Stall,
  TelegramTicket,
} from '../models/index.js';

function migrationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function findStallForUpdate(stallId, transaction) {
  return Stall.findOne({
    where: { id: stallId, is_deleted: false },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

function findConflictingStall(stallId, newChatId, transaction) {
  return Stall.findOne({
    where: {
      id: { [Op.ne]: stallId },
      telegram_chat_id: newChatId,
      is_deleted: false,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

function findActiveTicketsForUpdate(stallId, oldChatId, transaction) {
  return TelegramTicket.findAll({
    where: {
      telegram_chat_id: oldChatId,
      status: { [Op.in]: ['pending', 'sent'] },
    },
    include: [{
      model: Order,
      attributes: [],
      where: { stall_id: stallId },
      required: true,
    }],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export function migrateTelegramChatRouting(
  {
    stallId,
    oldChatId,
    newChatId,
    audit,
  },
  dependencyOverrides = {},
) {
  const dependencies = {
    runInTransaction: (work) => sequelize.transaction(work),
    findStallForUpdate,
    findConflictingStall,
    findActiveTicketsForUpdate,
    ...dependencyOverrides,
  };

  return dependencies.runInTransaction(async (transaction) => {
    const stall = await dependencies.findStallForUpdate(stallId, transaction);
    if (!stall) {
      throw migrationError(
        'TELEGRAM_CHAT_MIGRATION_STALL_NOT_FOUND',
        'Telegram chat migration stall was not found.',
      );
    }

    const currentChatId = String(stall.telegram_chat_id ?? '');
    if (currentChatId === newChatId) {
      return { outcome: 'already_migrated', stall, updatedTicketCount: 0 };
    }
    if (currentChatId !== oldChatId) {
      throw migrationError(
        'TELEGRAM_CHAT_MIGRATION_SOURCE_MISMATCH',
        'Telegram chat migration source no longer matches the stall.',
      );
    }

    const conflict = await dependencies.findConflictingStall(
      stallId,
      newChatId,
      transaction,
    );
    if (conflict) {
      throw migrationError(
        'TELEGRAM_CHAT_MIGRATION_CONFLICT',
        'Telegram chat migration destination is already in use.',
      );
    }

    const tickets = await dependencies.findActiveTicketsForUpdate(
      stallId,
      oldChatId,
      transaction,
    );
    await stall.update({ telegram_chat_id: newChatId }, { transaction });
    await Promise.all(tickets.map((ticket) => (
      ticket.update({ telegram_chat_id: newChatId }, { transaction })
    )));

    if (audit) {
      await audit({
        transaction,
        stall,
        updatedTicketCount: tickets.length,
      });
    }

    return {
      outcome: 'migrated',
      stall,
      updatedTicketCount: tickets.length,
    };
  });
}
