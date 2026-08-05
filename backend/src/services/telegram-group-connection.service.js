import { createHash, randomBytes } from 'node:crypto';
import { Stall } from '../models/index.js';
import * as connectionRepository from '../repositories/telegram-group-connection.repository.js';
import { httpError } from '../utils/http-error.util.js';
import { escapeTelegramHtml } from '../utils/telegram-html.util.js';
import { getBotIdentity, sendNotification } from './telegram.service.js';
import { emitManagementTelegramGroupUpdated } from './websocket.service.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';

const DEFAULT_EXPIRY_MINUTES = 10;
const START_COMMAND_PATTERN = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{16,64})\s*$/;

function resolveOwnerId(actor) {
  return actor.role === 'owner' ? actor.id : actor.owner_id;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function getExpiryMinutes() {
  const configured = Number(process.env.TELEGRAM_GROUP_CONNECTION_EXPIRY_MINUTES);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_EXPIRY_MINUTES;
}

async function requireOwnedStall(rawStallId, actor) {
  const stallId = Number(rawStallId);
  if (!Number.isInteger(stallId) || stallId <= 0) {
    throw httpError('Valid stall ID is required.');
  }

  const stall = await Stall.findOne({
    where: {
      id: stallId,
      owner_id: resolveOwnerId(actor),
      is_deleted: false,
    },
  });
  if (!stall) {
    throw httpError('Stall not found.', 404);
  }
  return stall;
}

export async function createTelegramGroupConnectionLink(actor, rawStallId, requestId) {
  const stall = await requireOwnedStall(rawStallId, actor);
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw httpError('Telegram bot is not configured.', 503);
  }

  let botIdentity;
  try {
    botIdentity = await getBotIdentity();
  } catch {
    throw httpError('Unable to verify the Telegram bot configuration.', 503);
  }
  if (!botIdentity?.username) {
    throw httpError('Telegram bot username is unavailable.', 503);
  }

  const rawToken = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + (getExpiryMinutes() * 60 * 1000));
  await connectionRepository.replacePendingConnection({
    stallId: stall.id,
    createdByUserId: actor.id,
    tokenHash: hashToken(rawToken),
    expiresAt,
    audit: ({ transaction, connection }) => writeAdministrativeAudit({
      actor, ownerId: stall.owner_id, action: AUDIT_ACTIONS.TELEGRAM_GROUP_LINK_CREATED,
      targetType: 'telegram_group_connection', targetId: connection.id, requestId,
      after: { stall_id: stall.id, expires_at: expiresAt }, transaction,
    }),
  });

  const connectUrl = new URL(`https://t.me/${botIdentity.username}`);
  connectUrl.searchParams.set('startgroup', rawToken);

  return {
    stall_id: stall.id,
    stall_name: stall.name,
    bot_username: botIdentity.username,
    connect_url: connectUrl.toString(),
    expires_at: expiresAt,
  };
}

function parseConnectionMessage(update) {
  const message = update?.message;
  const tokenMatch = String(message?.text || '').match(START_COMMAND_PATTERN);
  if (!message || !tokenMatch) {
    return null;
  }

  return {
    token: tokenMatch[1],
    chatId: message.chat?.id,
    chatTitle: String(message.chat?.title || 'Telegram Kitchen Group').trim().slice(0, 255),
    chatType: message.chat?.type,
    telegramUserId: message.from?.id,
  };
}

export async function processTelegramGroupConnection(update, dependencyOverrides = {}, requestId) {
  const connectionMessage = parseConnectionMessage(update);
  if (!connectionMessage) {
    return false;
  }

  const dependencies = {
    consumeConnection: connectionRepository.consumeConnection,
    emitManagementUpdate: emitManagementTelegramGroupUpdated,
    sendMessage: sendNotification,
    ...dependencyOverrides,
  };
  const {
    token,
    chatId,
    chatTitle,
    chatType,
    telegramUserId,
  } = connectionMessage;

  if (!['group', 'supergroup'].includes(chatType) || !chatId || !telegramUserId) {
    if (chatId) {
      await dependencies.sendMessage(
        chatId,
        'This setup link must be used inside a Telegram group.',
      ).catch(() => {});
    }
    return true;
  }

  const result = await dependencies.consumeConnection({
    tokenHash: hashToken(token),
    chatId,
    chatTitle,
    telegramUserId,
    audit: ({ transaction, connection, stall }) => writeAdministrativeAudit({
      actor: { id: connection.created_by_user_id, owner_id: stall.owner_id },
      ownerId: stall.owner_id,
      action: AUDIT_ACTIONS.TELEGRAM_GROUP_CONNECTED,
      targetType: 'stall', targetId: stall.id, requestId,
      after: { telegram_connected: true, telegram_chat_title: chatTitle }, transaction,
    }),
  });

  if (result.outcome === 'connected') {
    dependencies.emitManagementUpdate({
      ownerId: result.stall.owner_id,
      stallId: result.stall.id,
      chatTitle,
      changeType: 'connected',
    });
    await dependencies.sendMessage(
      chatId,
      `✅ <b>${escapeTelegramHtml(chatTitle)}</b> is now connected to <b>${escapeTelegramHtml(result.stall.name)}</b> in TouB POS.`,
      { stallId: result.stall.id },
    ).catch(() => {});
    return true;
  }

  const responseByOutcome = {
    already_connected: 'This Telegram group is already connected to this stall.',
    chat_in_use: `This Telegram group is already connected to ${result.conflictingStall?.name || 'another stall'}.`,
    expired: 'This TouB POS connection link has expired. Generate a new link from Stall Management.',
    used: 'This TouB POS connection link has already been used. Generate a new link from Stall Management.',
    invalid: 'This TouB POS connection link is invalid. Generate a new link from Stall Management.',
  };
  await dependencies.sendMessage(
    chatId,
    escapeTelegramHtml(responseByOutcome[result.outcome] || 'Unable to connect this Telegram group.'),
    { stallId: result.stall?.id },
  ).catch(() => {});
  return true;
}
