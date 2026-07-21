import { loginUser, loginWithPin } from '../services/auth.service.js';
import { findCashiersByStallId } from '../repositories/user.repository.js';
import { findDeviceByToken, markDeviceSeen } from '../repositories/stall-device.repository.js';

function getDeviceToken(req) {
  return req.headers['x-device-token'];
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required.' });
    }
    const data = await loginUser(username, password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function loginPin(req, res, next) {
  try {
    const { userId, pin } = req.body;
    const deviceToken = getDeviceToken(req);
    if (!userId || !pin) {
      return res.status(400).json({ success: false, message: 'userId and pin are required.' });
    }
    if (!deviceToken) {
      return res.status(401).json({ success: false, code: 'DEVICE_REQUIRED', message: 'A registered terminal is required for PIN login.' });
    }
    const data = await loginWithPin(userId, pin, deviceToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPublicCashiers(req, res, next) {
  try {
    const deviceToken = getDeviceToken(req);

    if (!deviceToken) {
      return res.status(400).json({ success: false, message: 'Device token is required.' });
    }

    const device = await findDeviceByToken(deviceToken);
    if (!device || !device.Stall || device.Stall.is_deleted || !device.Stall.is_active) {
      return res.status(401).json({ success: false, code: 'DEVICE_REVOKED', message: 'Invalid or unregistered device token.' });
    }

    await markDeviceSeen(device.id);
    const cashiers = await findCashiersByStallId(device.stall_id);
    res.json({ success: true, data: cashiers });
  } catch (err) {
    next(err);
  }
}

export function getDeviceStatus(req, res) {
  res.json({
    success: true,
    data: {
      id: req.device.id,
      name: req.device.name,
      stall_id: req.device.stall_id,
      is_active: true,
    },
  });
}
