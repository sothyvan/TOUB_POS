import * as stallRepository from '../repositories/stall.repository.js';
import * as stallDeviceRepository from '../repositories/stall-device.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { generateDeviceToken } from '../utils/device-token.util.js';
import {
  emitDeviceRevoked,
  emitManagementDeviceRegistryUpdated,
} from '../services/websocket.service.js';

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function sanitizeStallForManagement(stall) {
  const plainStall = stall?.toJSON ? stall.toJSON() : stall;
  const Devices = plainStall.Devices || [];
  const safeStall = { ...plainStall };
  delete safeStall.device_token;
  delete safeStall.Devices;
  const devices = Devices.map((device) => ({
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

  return {
    ...safeStall,
    device_registered: devices.some((device) => device.is_active),
    devices,
  };
}

/**
 * Get all stalls.
 */
export async function getStalls(req, res, next) {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const result = await stallRepository.findAllStallsByOwnerId(ownerId, req.query);
    res.json({
      success: true,
      ...result,
      data: result.data.map(sanitizeStallForManagement),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new stall.
 */
export async function createStall(req, res, next) {
  try {
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Stall name is required.' });
    }
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.insertStall({
      owner_id: ownerId,
      name,
      location,
    });
    res.status(201).json({ success: true, data: sanitizeStallForManagement(stall) });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing stall.
 */
export async function updateStall(req, res, next) {
  try {
    const { id } = req.params;
    const { name, location, telegram_chat_id } = req.body;

    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    const updateData = {};
    if (name !== undefined) { updateData.name = name; }
    if (location !== undefined) { updateData.location = location; }
    if (telegram_chat_id !== undefined) { updateData.telegram_chat_id = telegram_chat_id || null; }

    await stallRepository.updateStallById(id, updateData);
    res.json({ success: true, message: 'Stall updated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a stall by ID.
 */
export async function deleteStall(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    await stallRepository.deleteStallById(id);
    res.json({ success: true, message: 'Stall deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Assign a staff member to a stall.
 */
export async function assignStaff(req, res, next) {
  try {
    const { id } = req.params; // stall id
    const { userId } = req.body;
    const stallId = parsePositiveInteger(id);
    const staffUserId = parsePositiveInteger(userId);
    if (!stallId || !staffUserId) {
      return res.status(400).json({ success: false, message: 'Valid stall id and userId are required.' });
    }

    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(stallId);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    const user = await userRepository.findUserById(staffUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: User belongs to another owner.' });
    }
    if (user.role !== 'cashier') {
      return res.status(400).json({ success: false, message: 'Only cashier users can be assigned to stalls.' });
    }

    await stallRepository.assignStaffToStall(stallId, staffUserId);
    res.json({ success: true, message: 'Staff assigned successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove a staff member from a stall.
 */
export async function unassignStaff(req, res, next) {
  try {
    const { id, userId } = req.params;
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }
    
    const user = await userRepository.findUserById(userId);
    if (!user || user.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: User belongs to another owner.' });
    }

    const success = await stallRepository.removeStaffFromStall(id, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }
    res.json({ success: true, message: 'Staff unassigned successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Register device for a stall.
 */
export async function registerDevice(req, res, next) {
  try {
    const stallId = parsePositiveInteger(req.params.id);
    const deviceName = String(req.body?.device_name || '').trim();
    if (!stallId) {
      return res.status(400).json({ success: false, message: 'Valid stall id is required.' });
    }
    if (deviceName.length < 2 || deviceName.length > 100) {
      return res.status(400).json({ success: false, message: 'Device name must be between 2 and 100 characters.' });
    }

    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(stallId);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    const deviceToken = generateDeviceToken();
    const device = await stallDeviceRepository.createStallDevice({
      stallId,
      name: deviceName,
      token: deviceToken,
      registeredByUserId: req.user.id,
    });

    emitManagementDeviceRegistryUpdated({
      ownerId,
      stallId,
      deviceId: device.id,
      changeType: 'registered',
    });

    res.json({
      success: true,
      data: {
        device_token: deviceToken,
        device: { id: device.id, name: device.name },
        stall: { id: stall.id, name: stall.name, location: stall.location }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Revoke the registered terminal for a stall.
 */
export async function deregisterDevice(req, res, next) {
  try {
    const stallId = parsePositiveInteger(req.params.id);
    const deviceId = parsePositiveInteger(req.params.deviceId);
    if (!stallId || !deviceId) {
      return res.status(400).json({ success: false, message: 'Valid stall id and device id are required.' });
    }

    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(stallId);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    const device = await stallDeviceRepository.findDeviceById(deviceId);
    if (!device || Number(device.stall_id) !== stallId) {
      return res.status(404).json({ success: false, message: 'Device not found for this stall.' });
    }

    if (device.is_active) {
      await stallDeviceRepository.revokeDevice(deviceId, req.user.id);
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

    return res.json({
      success: true,
      message: 'Terminal deregistered successfully.',
      data: {
        stall_id: stallId,
        device_id: deviceId,
        is_active: false,
      },
    });
  } catch (err) {
    next(err);
  }
}
