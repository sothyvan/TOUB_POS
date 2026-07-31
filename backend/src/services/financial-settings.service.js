import { BusinessFinancialSetting, sequelize } from '../models/index.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';
import { httpError } from '../utils/http-error.util.js';

export const DEFAULT_EXCHANGE_RATE_KHR_PER_USD = 4100;
export const MIN_EXCHANGE_RATE_KHR_PER_USD = 1000;
export const MAX_EXCHANGE_RATE_KHR_PER_USD = 10000;

function ownerIdForActor(actor) {
  const role = String(actor?.role || '').toLowerCase();
  const ownerId = role === 'owner' ? Number(actor?.id) : Number(actor?.owner_id);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw httpError('Financial settings require a business owner scope.', 403);
  }
  return ownerId;
}

export function validateExchangeRate(value) {
  const rate = Number(value);
  if (
    !Number.isSafeInteger(rate)
    || rate < MIN_EXCHANGE_RATE_KHR_PER_USD
    || rate > MAX_EXCHANGE_RATE_KHR_PER_USD
    || rate % 100 !== 0
  ) {
    throw httpError(
      `Exchange rate must be a whole number from ${MIN_EXCHANGE_RATE_KHR_PER_USD} to ${MAX_EXCHANGE_RATE_KHR_PER_USD}, in increments of 100 KHR.`,
      400,
      'VALIDATION_ERROR',
    );
  }
  return rate;
}

function publicSetting(ownerId, row) {
  return {
    owner_id: ownerId,
    exchange_rate_khr_per_usd: Number(
      row?.exchange_rate_khr_per_usd ?? DEFAULT_EXCHANGE_RATE_KHR_PER_USD,
    ),
    updated_at: row?.updated_at ?? null,
  };
}

export async function getFinancialSettings(actor) {
  const ownerId = ownerIdForActor(actor);
  const row = await BusinessFinancialSetting.findByPk(ownerId);
  return publicSetting(ownerId, row);
}

export async function getExchangeRateForOwner(ownerId, options = {}) {
  const row = await BusinessFinancialSetting.findByPk(ownerId, {
    attributes: ['exchange_rate_khr_per_usd'],
    transaction: options.transaction,
  });
  return Number(row?.exchange_rate_khr_per_usd ?? DEFAULT_EXCHANGE_RATE_KHR_PER_USD);
}

export function updateFinancialSettings(actor, exchangeRate, requestId) {
  if (String(actor?.role || '').toLowerCase() !== 'owner') {
    throw httpError('Only the Owner can change financial settings.', 403);
  }
  const ownerId = ownerIdForActor(actor);
  const rate = validateExchangeRate(exchangeRate);

  return sequelize.transaction(async (transaction) => {
    const existing = await BusinessFinancialSetting.findByPk(ownerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const before = publicSetting(ownerId, existing);
    await BusinessFinancialSetting.upsert({
      owner_id: ownerId,
      exchange_rate_khr_per_usd: rate,
      updated_by_user_id: actor.id,
    }, { transaction });
    const updated = await BusinessFinancialSetting.findByPk(ownerId, { transaction });

    await writeAdministrativeAudit({
      actor,
      ownerId,
      action: AUDIT_ACTIONS.FINANCIAL_SETTINGS_UPDATED,
      targetType: 'financial_settings',
      targetId: ownerId,
      requestId,
      before,
      after: publicSetting(ownerId, updated),
      transaction,
    });
    return publicSetting(ownerId, updated);
  });
}
