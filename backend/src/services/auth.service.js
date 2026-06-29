import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByUsername, findUserWithPinById } from '../repositories/user.repository.js';

/**
 * Validate credentials and return a signed JWT + public user info.
 * Throws a 401 error object on failure.
 */
export async function loginUser(username, password) {
  const user = await findUserByUsername(username);
  if (!user) {
    const err = new Error('Invalid credentials.');
    err.status = 401;
    throw err;
  }

  if (!user.password_hash) {
    const err = new Error('Invalid credentials.');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials.');
    err.status = 401;
    throw err;
  }

  if (user.is_active === false) {
    const err = new Error('User account is inactive.');
    err.status = 403;
    throw err;
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
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  // Validate PIN (currently stored as plain text, we check for string equality)
  const valid = await bcrypt.compare(pin, user.pin);

  if (!user.pin || !valid) {
    const err = new Error('Invalid PIN.');
    err.status = 401;
    throw err;
  }

  if (user.is_active === false) {
    const err = new Error('User account is inactive.');
    err.status = 403;
    throw err;
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
