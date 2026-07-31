import { Op } from 'sequelize';
import {
  sequelize,
  Stall,
  TelegramGroupConnection,
} from '../models/index.js';

export async function replacePendingConnection({
  stallId,
  createdByUserId,
  tokenHash,
  expiresAt,
  audit,
}) {
  return sequelize.transaction(async (transaction) => {
    await TelegramGroupConnection.destroy({
      where: {
        stall_id: stallId,
        consumed_at: null,
      },
      transaction,
    });

    const connection = await TelegramGroupConnection.create({
      stall_id: stallId,
      created_by_user_id: createdByUserId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    }, { transaction });
    if (audit) {
      await audit({ transaction, connection });
    }
    return connection;
  });
}

export async function consumeConnection({
  tokenHash,
  chatId,
  chatTitle,
  telegramUserId,
  audit,
}) {
  return sequelize.transaction(async (transaction) => {
    const connection = await TelegramGroupConnection.findOne({
      where: { token_hash: tokenHash },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!connection) {
      return { outcome: 'invalid' };
    }

    const stall = await Stall.findOne({
      where: { id: connection.stall_id, is_deleted: false },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!stall) {
      return { outcome: 'invalid' };
    }

    if (connection.consumed_at) {
      const sameConnection = String(connection.connected_chat_id) === String(chatId)
        && String(stall.telegram_chat_id) === String(chatId);
      return {
        outcome: sameConnection ? 'already_connected' : 'used',
        connection,
        stall,
      };
    }

    if (new Date(connection.expires_at).getTime() <= Date.now()) {
      return { outcome: 'expired', connection, stall };
    }

    const conflictingStall = await Stall.findOne({
      where: {
        id: { [Op.ne]: stall.id },
        telegram_chat_id: String(chatId),
        is_deleted: false,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (conflictingStall) {
      return {
        outcome: 'chat_in_use',
        connection,
        stall,
        conflictingStall,
      };
    }

    const connectedAt = new Date();
    await stall.update({
      telegram_chat_id: String(chatId),
      telegram_chat_title: chatTitle,
      telegram_connected_at: connectedAt,
    }, { transaction });

    await connection.update({
      consumed_at: connectedAt,
      connected_chat_id: String(chatId),
      connected_chat_title: chatTitle,
      connected_by_telegram_user_id: String(telegramUserId),
    }, { transaction });

    if (audit) {
      await audit({ transaction, connection, stall });
    }

    return {
      outcome: 'connected',
      connection,
      stall,
    };
  });
}
