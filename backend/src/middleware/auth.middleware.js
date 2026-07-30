import jwt from 'jsonwebtoken';
import { findDeviceByToken } from '../repositories/stall-device.repository.js';
import { findStaffAssignmentByUserId } from '../repositories/stall.repository.js';
import { resolveActiveTokenSession } from '../services/session.service.js';

function deviceAuthError(res, code, message) {
  return res.status(401).json({ success: false, code, message });
}

/**
 * Middleware: verify JWT and attach decoded payload to req.user.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
  }

  const token = header.slice(7);
  let decodedUser;
  try {
    decodedUser = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token expired or invalid.' });
  }

  try {
    req.user = await resolveActiveTokenSession(decodedUser);
  } catch (error) {
    return next(error);
  }
  if (!req.user) {
    return deviceAuthError(
      res,
      'SESSION_INVALIDATED',
      'Your account or permissions changed. Please sign in again.',
    );
  }

  if (req.user.role !== 'cashier') {
    return next();
  }

  const deviceId = Number(req.user.device_id);
  const deviceToken = req.headers['x-device-token'];
  if (!Number.isInteger(deviceId) || deviceId <= 0 || !deviceToken) {
    return deviceAuthError(res, 'DEVICE_SESSION_INVALID', 'Cashier session is not bound to a registered terminal.');
  }

  try {
    const device = await findDeviceByToken(deviceToken);
    if (
      !device
      || !device.Stall
      || device.Stall.is_deleted
      || !device.Stall.is_active
      || Number(device.id) !== deviceId
      || Number(device.stall_id) !== Number(req.user.stall_id)
    ) {
      return deviceAuthError(res, 'DEVICE_REVOKED', 'This terminal has been deregistered.');
    }

    const assignment = await findStaffAssignmentByUserId(req.user.id);
    if (
      !assignment
      || Number(assignment.stall_id) !== Number(req.user.stall_id)
      || Number(assignment.stall_id) !== Number(device.stall_id)
    ) {
      return deviceAuthError(
        res,
        'STALL_ASSIGNMENT_CHANGED',
        'Your stall assignment changed. Please sign in again on the correct terminal.',
      );
    }

    req.user.stall_id = Number(assignment.stall_id);
    req.device = device;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware factory: restrict access to one or more roles.
 * Usage: authorize('owner') or authorize(['owner', 'manager'])
 */
export function authorize(...roles) {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}
