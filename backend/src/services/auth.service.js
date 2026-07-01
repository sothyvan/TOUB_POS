import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByUsername, findUserWithPinById, updateUserById } from '../repositories/user.repository.js';
import { hashPin, verifyPin } from '../utils/pin.util.js';

function authError(message, status = 401) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Validate credentials and return a signed JWT + public user info.
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

  if (!user.password_hash) {
    const err = new Error('Invalid credentials.');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw authError('Invalid credentials.');
  }

  if (user.is_active === false) {
    throw authError('User account is inactive.', 403);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role },
  };
}

/**
 * Validate PIN and return a signed JWT + public user info.
 * Throws a 401 error object on failure.
 */
export async function loginWithPin(userId, pin) {
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

  if (needsUpgrade) {
    await updateUserById(user.id, { pin: await hashPin(pin) });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role },
  };
}
