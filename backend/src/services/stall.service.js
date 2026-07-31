import * as stallRepository from '../repositories/stall.repository.js';
import * as stallDeviceRepository from '../repositories/stall-device.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import {
  revokeDeviceRefreshSessions,
  revokeUserRefreshSessions,
} from '../repositories/refresh-session.repository.js';
import { generateDeviceToken } from '../utils/device-token.util.js';
import { httpError } from '../utils/http-error.util.js';
import { maskTelegramChatId } from '../utils/telegram-identifier.util.js';
import {
  emitCashierSessionInvalidated,
  emitDeviceRevoked,
  emitManagementDeviceRegistryUpdated,
} from './websocket.service.js';
import { sequelize } from '../models/index.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';

function resolveOwnerId(actor) {
  return actor.role === 'owner' ? actor.id : actor.owner_id;
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function sanitizeStallForManagement(stall) {
  const plainStall = stall?.toJSON ? stall.toJSON() : stall;
  const devices = (plainStall.Devices || []).map((device) => ({
    id: device.id,
    name: device.name,
    is_active: device.is_active,
    last_seen_at: device.last_seen_at,
    revoked_at: device.revoked_at,
    created_at: device.created_at,
    last_cashier: device.LastCashier
      ? { id: device.LastCashier.id, username: device.LastCashier.username }
      : null,
  }));
  const safeStall = { ...plainStall };
  const telegramChatId = safeStall.telegram_chat_id;
  delete safeStall.device_token;
  delete safeStall.telegram_chat_id;
  delete safeStall.Devices;

  return {
    ...safeStall,
    telegram_connected: Boolean(telegramChatId),
    telegram_chat_id_masked: maskTelegramChatId(telegramChatId),
    device_registered: devices.some((device) => device.is_active),
    devices,
  };
}

async function requireOwnedStall(stallId, ownerId, options = {}) {
  const stall = await stallRepository.findStallById(stallId, options);
  if (!stall) {
    throw httpError('Stall not found.', 404);
  }
  if (stall.owner_id !== ownerId) {
    throw httpError('Forbidden: Stall belongs to another owner.', 403);
  }
  return stall;
}

export async function listStalls(actor, query = {}) {
  const result = await stallRepository.findAllStallsByOwnerId(resolveOwnerId(actor), query);
  return {
    ...result,
    data: result.data.map(sanitizeStallForManagement),
  };
}

export async function createStall(actor, payload, requestId) {
  if (!payload.name) {
    throw httpError('Stall name is required.');
  }
  const stall = await sequelize.transaction(async (transaction) => {
    const created = await stallRepository.insertStall({
    owner_id: resolveOwnerId(actor),
    name: payload.name,
    location: payload.location,
    }, { transaction });
    await writeAdministrativeAudit({
      actor, action: AUDIT_ACTIONS.STALL_CREATED, targetType: 'stall', targetId: created.id,
      requestId, after: { name: created.name, location: created.location }, transaction,
    });
    return created;
  });
  return sanitizeStallForManagement(stall);
}

export async function updateStall(actor, stallId, payload, requestId) {
  const ownerId = resolveOwnerId(actor);
  return sequelize.transaction(async (transaction) => {
  const stall = await requireOwnedStall(stallId, ownerId, { transaction, lock: transaction.LOCK.UPDATE });
  const updateData = {};
  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }
  if (payload.location !== undefined) {
    updateData.location = payload.location;
  }
  await stallRepository.updateStallById(stallId, updateData, { transaction });
  await writeAdministrativeAudit({
    actor, ownerId, action: AUDIT_ACTIONS.STALL_UPDATED, targetType: 'stall', targetId: stallId,
    requestId, before: { name: stall.name, location: stall.location },
    after: { name: updateData.name ?? stall.name, location: updateData.location ?? stall.location }, transaction,
  });
  });
}

export async function deleteStall(actor, stallId, requestId) {
  const ownerId = resolveOwnerId(actor);
  return sequelize.transaction(async (transaction) => {
    const stall = await requireOwnedStall(stallId, ownerId, { transaction, lock: transaction.LOCK.UPDATE });
    await stallRepository.deleteStallById(stallId, { transaction, revokedByUserId: actor.id });
    await writeAdministrativeAudit({
      actor, ownerId, action: AUDIT_ACTIONS.STALL_DELETED, targetType: 'stall', targetId: stallId,
      requestId, before: { name: stall.name, location: stall.location, is_active: Boolean(stall.is_active) }, transaction,
    });
  });
}

export async function assignStaff(actor, rawStallId, rawUserId, requestId) {
  const stallId = parsePositiveInteger(rawStallId);
  const userId = parsePositiveInteger(rawUserId);
  if (!stallId || !userId) {
    throw httpError('Valid stall id and userId are required.');
  }

  const ownerId = resolveOwnerId(actor);
  await requireOwnedStall(stallId, ownerId);
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw httpError('User not found.', 404);
  }
  if (user.owner_id !== ownerId) {
    throw httpError('Forbidden: User belongs to another owner.', 403);
  }
  if (user.role !== 'cashier') {
    throw httpError('Only cashier users can be assigned to stalls.');
  }
  const result = await stallRepository.assignStaffToStall(stallId, userId, {
    audit: async ({ transaction, previousStallId }) => {
      await revokeUserRefreshSessions(userId, { transaction });
      await writeAdministrativeAudit({
        actor, ownerId, action: AUDIT_ACTIONS.STAFF_ASSIGNED, targetType: 'user', targetId: userId,
        requestId, before: { stall_id: previousStallId }, after: { stall_id: stallId }, transaction,
      });
    },
  });
  if (result.changed) {
    emitCashierSessionInvalidated(userId, {
      message: 'Your stall assignment changed. Please sign in again on the correct terminal.',
    });
  }
}

export async function unassignStaff(actor, stallId, userId, requestId) {
  const ownerId = resolveOwnerId(actor);
  await requireOwnedStall(stallId, ownerId);
  const user = await userRepository.findUserById(userId);
  if (!user || user.owner_id !== ownerId) {
    throw httpError('Forbidden: User belongs to another owner.', 403);
  }
  const success = await stallRepository.removeStaffFromStall(stallId, userId, {
    audit: async ({ transaction }) => {
      await revokeUserRefreshSessions(userId, { transaction });
      await writeAdministrativeAudit({
        actor, ownerId, action: AUDIT_ACTIONS.STAFF_UNASSIGNED, targetType: 'user', targetId: userId,
        requestId, before: { stall_id: Number(stallId) }, after: { stall_id: null }, transaction,
      });
    },
  });
  if (!success) {
    throw httpError('Assignment not found.', 404);
  }
  emitCashierSessionInvalidated(userId, {
    message: 'You were unassigned from this stall. Please contact a manager before signing in again.',
  });
}

export async function registerDevice(actor, rawStallId, payload, requestId) {
  const stallId = parsePositiveInteger(rawStallId);
  const deviceName = String(payload?.device_name || '').trim();
  if (!stallId) {
    throw httpError('Valid stall id is required.');
  }
  if (deviceName.length < 2 || deviceName.length > 100) {
    throw httpError('Device name must be between 2 and 100 characters.');
  }

  const ownerId = resolveOwnerId(actor);
  const stall = await requireOwnedStall(stallId, ownerId);
  const deviceToken = generateDeviceToken();
  const device = await sequelize.transaction(async (transaction) => {
  const created = await stallDeviceRepository.createStallDevice({
    stallId,
    name: deviceName,
    token: deviceToken,
    registeredByUserId: actor.id,
  }, { transaction });
  await writeAdministrativeAudit({
    actor, ownerId, action: AUDIT_ACTIONS.DEVICE_REGISTERED, targetType: 'device', targetId: created.id,
    requestId, after: { stall_id: stallId, name: created.name, is_active: true }, transaction,
  });
  return created;
  });

  emitManagementDeviceRegistryUpdated({
    ownerId,
    stallId,
    deviceId: device.id,
    changeType: 'registered',
  });

  return {
    device_token: deviceToken,
    device: { id: device.id, name: device.name },
    stall: { id: stall.id, name: stall.name, location: stall.location },
  };
}

export async function deregisterDevice(actor, rawStallId, rawDeviceId, requestId) {
  const stallId = parsePositiveInteger(rawStallId);
  const deviceId = parsePositiveInteger(rawDeviceId);
  if (!stallId || !deviceId) {
    throw httpError('Valid stall id and device id are required.');
  }

  const ownerId = resolveOwnerId(actor);
  await requireOwnedStall(stallId, ownerId);
  const device = await stallDeviceRepository.findDeviceById(deviceId);
  if (!device || Number(device.stall_id) !== stallId) {
    throw httpError('Device not found for this stall.', 404);
  }

  if (device.is_active) {
    await sequelize.transaction(async (transaction) => {
    const revoked = await stallDeviceRepository.revokeDevice(deviceId, actor.id, { transaction });
    if (!revoked) {
      throw httpError('Device is already inactive.', 409);
    }
    await revokeDeviceRefreshSessions(deviceId, { transaction });
    await writeAdministrativeAudit({
      actor, ownerId, action: AUDIT_ACTIONS.DEVICE_REVOKED, targetType: 'device', targetId: deviceId,
      requestId, before: { stall_id: stallId, name: device.name, is_active: true },
      after: { stall_id: stallId, name: device.name, is_active: false }, transaction,
    });
    });
    emitDeviceRevoked(deviceId, {
      message: 'This terminal was deregistered by management.',
    });
    emitManagementDeviceRegistryUpdated({
      ownerId,
      stallId,
      deviceId,
      changeType: 'deregistered',
    });
  }

  return {
    stall_id: stallId,
    device_id: deviceId,
    is_active: false,
  };
}
