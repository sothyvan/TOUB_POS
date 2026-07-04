import { loginUser, loginWithPin } from '../services/auth.service.js';
import { findCashiersByStallId } from '../repositories/user.repository.js';
import { findStallByDeviceToken } from '../repositories/stall.repository.js';

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
    if (!userId || !pin) {
      return res.status(400).json({ success: false, message: 'userId and pin are required.' });
    }
    const data = await loginWithPin(userId, pin);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPublicCashiers(req, res, next) {
  try {
    const deviceToken = req.headers['x-device-token'] || req.query.deviceToken;

    if (!deviceToken) {
      return res.status(400).json({ success: false, message: 'Device token is required.' });
    }

    // 1. Find the stall associated with this device token
    const stall = await findStallByDeviceToken(deviceToken);
    if (!stall) {
      return res.status(401).json({ success: false, message: 'Invalid or unregistered device token.' });
    }

    // 2. Fetch only cashiers assigned to this stall
    const cashiers = await findCashiersByStallId(stall.id);
    res.json({ success: true, data: cashiers });
  } catch (err) {
    next(err);
  }
}
