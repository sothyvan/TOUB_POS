import * as stallRepository from '../repositories/stall.repository.js';
import * as stallDeviceRepository from '../repositories/stall-device.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { generateDeviceToken } from '../utils/device-token.util.js';
import { httpError } from '../utils/http-error.util.js';
import {
  emitDeviceRevoked,
  emitManagementDeviceRegistryUpdated,
} from './websocket.service.js';

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
  delete safeStall.device_token;
  delete safeStall.Devices;

  return {
    ...safeStall,
    device_registered: devices.some((device) => device.is_active),
    devices,
  };
}

async function requireOwnedStall(stallId, ownerId) {
  const stall = await stallRepository.findStallById(stallId);
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

export async function createStall(actor, payload) {
  if (!payload.name) {
    throw httpError('Stall name is required.');
  }
  const stall = await stallRepository.insertStall({
    owner_id: resolveOwnerId(actor),
    name: payload.name,
    location: payload.location,
  });
  return sanitizeStallForManagement(stall);
}

export async function updateStall(actor, stallId, payload) {
  await requireOwnedStall(stallId, resolveOwnerId(actor));
  const updateData = {};
  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }
  if (payload.location !== undefined) {
    updateData.location = payload.location;
  }
  await stallRepository.updateStallById(stallId, updateData);
}

export async function deleteStall(actor, stallId) {
  await requireOwnedStall(stallId, resolveOwnerId(actor));
  await stallRepository.deleteStallById(stallId);
}

export async function assignStaff(actor, rawStallId, rawUserId) {
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
  await stallRepository.assignStaffToStall(stallId, userId);
}

export async function unassignStaff(actor, stallId, userId) {
  const ownerId = resolveOwnerId(actor);
  await requireOwnedStall(stallId, ownerId);
  const user = await userRepository.findUserById(userId);
  if (!user || user.owner_id !== ownerId) {
    throw httpError('Forbidden: User belongs to another owner.', 403);
  }
  const success = await stallRepository.removeStaffFromStall(stallId, userId);
  if (!success) {
    throw httpError('Assignment not found.', 404);
  }
}

export async function registerDevice(actor, rawStallId, payload) {
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
  const device = await stallDeviceRepository.createStallDevice({
    stallId,
    name: deviceName,
    token: deviceToken,
    registeredByUserId: actor.id,
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

export async function deregisterDevice(actor, rawStallId, rawDeviceId) {
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
    await stallDeviceRepository.revokeDevice(deviceId, actor.id);
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
