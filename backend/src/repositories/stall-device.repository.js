import { Stall, StallDevice, User } from '../models/index.js';
import { hashDeviceToken } from '../utils/device-token.util.js';

const safeDeviceAttributes = [
  'id',
  'stall_id',
  'name',
  'is_active',
  'last_cashier_id',
  'last_seen_at',
  'revoked_at',
  'created_at',
];

const deviceIncludes = [
  {
    model: Stall,
    as: 'Stall',
    attributes: ['id', 'owner_id', 'name', 'location', 'is_active', 'is_deleted'],
  },
  {
    model: User,
    as: 'LastCashier',
    attributes: ['id', 'username'],
    required: false,
  },
];

export function createStallDevice({ stallId, name, token, registeredByUserId = null }, options = {}) {
  return StallDevice.create({
    stall_id: stallId,
    name,
    token_hash: hashDeviceToken(token),
    registered_by_user_id: registeredByUserId,
  }, options);
}

export function findDeviceByToken(token, { activeOnly = true } = {}) {
  if (!token) {
    return null;
  }

  return StallDevice.findOne({
    where: {
      token_hash: hashDeviceToken(token),
      ...(activeOnly ? { is_active: true } : {}),
    },
    include: deviceIncludes,
  });
}

export function findDeviceById(id, { activeOnly = false, transaction, lock } = {}) {
  return StallDevice.findOne({
    where: {
      id,
      ...(activeOnly ? { is_active: true } : {}),
    },
    include: deviceIncludes,
    transaction,
    ...(lock ? { lock } : {}),
  });
}

export function listDevicesByStallId(stallId) {
  return StallDevice.findAll({
    where: { stall_id: stallId },
    attributes: safeDeviceAttributes,
    include: [{
      model: User,
      as: 'LastCashier',
      attributes: ['id', 'username'],
      required: false,
    }],
    order: [['is_active', 'DESC'], ['created_at', 'DESC']],
  });
}

export async function markDeviceSeen(deviceId, cashierId = null) {
  const updateData = { last_seen_at: new Date() };
  if (cashierId) {
    updateData.last_cashier_id = cashierId;
  }
  const [affectedRows] = await StallDevice.update(updateData, { where: { id: deviceId, is_active: true } });
  return affectedRows > 0;
}

export async function revokeDevice(deviceId, revokedByUserId, options = {}) {
  const [affectedRows] = await StallDevice.update({
    is_active: false,
    revoked_at: new Date(),
    revoked_by_user_id: revokedByUserId,
  }, {
    where: { id: deviceId, is_active: true }, ...options,
  });
  return affectedRows > 0;
}

export async function revokeDevicesByStallId(stallId, revokedByUserId = null, options = {}) {
  const [affectedRows] = await StallDevice.update({
    is_active: false,
    revoked_at: new Date(),
    revoked_by_user_id: revokedByUserId,
  }, {
    where: { stall_id: stallId, is_active: true }, ...options,
  });
  return affectedRows;
}

export function findOrCreateMigratedDevice({ stallId, stallName, token }) {
  const tokenHash = hashDeviceToken(token);
  return StallDevice.findOrCreate({
    where: { token_hash: tokenHash },
    defaults: {
      stall_id: stallId,
      name: `${stallName} Terminal`,
      token_hash: tokenHash,
      is_active: true,
    },
  });
}
