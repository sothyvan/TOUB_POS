import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findAssignedStallByUserId,
  findUserByUsername,
  findUserWithPinById,
  updateUserById,
} from '../repositories/user.repository.js';
import { findDeviceByToken, markDeviceSeen } from '../repositories/stall-device.repository.js';
import { hashPin, verifyPin } from '../utils/pin.util.js';

function authError(message, status = 401, code = null) {
  const err = new Error(message);
  err.status = status;
  if (code) {
    err.code = code;
  }
  return err;
}

/**
 * Validate username/password credentials and return a signed JWT + public user info.
 * Throws a 401 error object on failure.
 */
export async function loginUser(username, password) {
  const user = await findUserByUsername(username);
  if (!user) {
    throw authError('Invalid credentials.');
  }

  if (user.role === 'cashier') {
    throw authError('Cashier accounts must use PIN login.', 403);
  }

  if (!user.password_hash) {
    throw authError('Invalid credentials.');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw authError('Invalid credentials.');
  }

  if (user.is_active === false) {
    throw authError('User account is inactive.', 403);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, owner_id: user.owner_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role, owner_id: user.owner_id },
  };
}

/**
 * Validate PIN and return a signed JWT + public user info.
 * Throws a 401 error object on failure.
 */
export async function loginWithPin(userId, pin, deviceToken) {
  const device = await findDeviceByToken(deviceToken);
  if (!device || !device.Stall || device.Stall.is_deleted || !device.Stall.is_active) {
    throw authError('This terminal is not registered or has been deregistered.', 401, 'DEVICE_REVOKED');
  }

  const user = await findUserWithPinById(userId);
  if (!user) {
    throw authError('User not found.', 404);
  }

  if (user.role !== 'cashier') {
    throw authError('PIN login is only for cashier accounts.', 403);
  }

  const { valid, needsUpgrade } = await verifyPin(pin, user.pin);
  if (!valid) {
    throw authError('Invalid PIN.');
  }

  if (user.is_active === false) {
    throw authError('User account is inactive.', 403);
  }

  const assignedStall = await findAssignedStallByUserId(user.id);
  if (!assignedStall || Number(assignedStall.id) !== Number(device.stall_id)) {
    throw authError('This cashier is not assigned to the terminal stall.', 403);
  }

  if (needsUpgrade) {
    await updateUserById(user.id, { pin: await hashPin(pin) });
  }

  await markDeviceSeen(device.id, user.id);

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      owner_id: user.owner_id,
      device_id: device.id,
      stall_id: device.stall_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role, owner_id: user.owner_id },
  };
}
