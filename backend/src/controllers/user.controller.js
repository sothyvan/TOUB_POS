import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/user.repository.js';

/**
 * Get all users.
 */
export async function getUsers(req, res, next) {
  try {
    const users = await userRepository.findAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new user.
 */
export async function createUser(req, res, next) {
  try {
    const { username, password, pin, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'username, password, and role are required.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const userId = await userRepository.insertUser({ username, password_hash, pin, role });
    res.status(201).json({ success: true, data: { id: userId, username, pin, role } });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing user.
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { username, password, pin, role, is_active } = req.body;
    
    const updateData = {};
    if (username !== undefined) {updateData.username = username;}
    if (pin !== undefined) {updateData.pin = pin;}
    if (role !== undefined) {updateData.role = role;}
    if (is_active !== undefined) {updateData.is_active = is_active;}
    
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const success = await userRepository.updateUserById(id, updateData);
    if (!success) {
      return res.status(404).json({ success: false, message: 'User not found or no changes made.' });
    }
    
    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a user by ID.
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const success = await userRepository.deleteUserById(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
