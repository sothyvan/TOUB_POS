import { sequelize, Stall } from '../models/index.js';
import * as telegramCookRepository from '../repositories/telegram-cook.repository.js';
import { httpError } from '../utils/http-error.util.js';
import { maskTelegramUserId } from '../utils/telegram-identifier.util.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';

function resolveOwnerId(actor) {
  return actor.role === 'owner' ? actor.id : actor.owner_id;
}

function parsePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw httpError(`${label} must be a positive integer.`);
  }
  return number;
}

function normalizeTelegramUserId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d{0,18}$/.test(normalized)) {
    throw httpError('telegram_user_id must be a positive numeric Telegram user ID.');
  }
  if (BigInt(normalized) > 9223372036854775807n) {
    throw httpError('telegram_user_id is outside the supported numeric range.');
  }
  return normalized;
}

function normalizeDisplayName(value) {
  const normalized = String(value ?? '').trim();
  if (normalized.length < 2 || normalized.length > 100) {
    throw httpError('display_name must be between 2 and 100 characters.');
  }
  return normalized;
}

function mapCook(cook) {
  return {
    id: cook.id,
    stall_id: cook.stall_id,
    telegram_user_id_masked: maskTelegramUserId(cook.telegram_user_id),
    display_name: cook.display_name,
    is_active: Boolean(cook.is_active),
    created_at: cook.created_at,
    updated_at: cook.updated_at,
  };
}

async function requireOwnedStall(rawStallId, actor) {
  const stallId = parsePositiveInteger(rawStallId, 'stall ID');
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

export async function listTelegramCooks(actor, rawStallId) {
  const stall = await requireOwnedStall(rawStallId, actor);
  const cooks = await telegramCookRepository.findCooksByStallId(stall.id);
  return cooks.map(mapCook);
}

export async function authorizeTelegramCook(actor, rawStallId, payload, requestId) {
  const stall = await requireOwnedStall(rawStallId, actor);
  const cook = await sequelize.transaction(async (transaction) => {
  const saved = await telegramCookRepository.upsertCook({
    stallId: stall.id,
    telegramUserId: normalizeTelegramUserId(payload?.telegram_user_id),
    displayName: normalizeDisplayName(payload?.display_name),
  }, { transaction });
  await writeAdministrativeAudit({
    actor, ownerId: stall.owner_id, action: AUDIT_ACTIONS.TELEGRAM_COOK_AUTHORIZED,
    targetType: 'telegram_cook', targetId: saved.id, requestId,
    after: { stall_id: stall.id, display_name: saved.display_name, is_active: true }, transaction,
  });
  return saved;
  });
  return mapCook(cook);
}

export async function revokeTelegramCook(actor, rawStallId, rawCookId, requestId) {
  const stall = await requireOwnedStall(rawStallId, actor);
  const cookId = parsePositiveInteger(rawCookId, 'cook ID');
  const cook = await telegramCookRepository.findCookById(cookId);
  if (!cook || Number(cook.stall_id) !== Number(stall.id)) {
    throw httpError('Telegram cook identity not found for this stall.', 404);
  }
  const before = {
    stall_id: stall.id,
    display_name: cook.display_name,
    is_active: Boolean(cook.is_active),
  };
  const updated = await sequelize.transaction(async (transaction) => {
    const saved = await telegramCookRepository.deactivateCook(cook, { transaction });
    await writeAdministrativeAudit({
      actor, ownerId: stall.owner_id, action: AUDIT_ACTIONS.TELEGRAM_COOK_REVOKED,
      targetType: 'telegram_cook', targetId: saved.id, requestId,
      before,
      after: { stall_id: stall.id, display_name: cook.display_name, is_active: false }, transaction,
    });
    return saved;
  });
  return mapCook(updated);
}
