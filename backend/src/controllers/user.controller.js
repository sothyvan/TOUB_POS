import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/user.repository.js';

const WEB_APP_ROLES = ['owner', 'manager', 'cashier'];
const ROLE_MANAGEMENT_RULES = {
  owner: WEB_APP_ROLES,
  manager: ['cashier'],
  cashier: [],
};

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isValidWebAppRole(role) {
  return WEB_APP_ROLES.includes(role);
}

function canManageRole(actorRole, targetRole) {
  return ROLE_MANAGEMENT_RULES[normalizeRole(actorRole)]?.includes(normalizeRole(targetRole)) ?? false;
}

function roleValidationMessage() {
  return 'role must be owner, manager, or cashier.';
}

function rolePermissionMessage(actorRole) {
  return normalizeRole(actorRole) === 'manager'
    ? 'Managers can create and manage cashier users only.'
    : 'Insufficient permissions to manage this user role.';
}

/**
 * Get all users.
 */
export async function getUsers(req, res, next) {
  try {
    const users = await userRepository.findAllUsers();
    const visibleUsers = normalizeRole(req.user?.role) === 'manager'
      ? users.filter((user) => normalizeRole(user.role) === 'cashier')
      : users;
    res.json({ success: true, data: visibleUsers });
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
    const normalizedRole = normalizeRole(role);
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'username, password, and role are required.' });
    }
    if (!isValidWebAppRole(normalizedRole)) {
      return res.status(400).json({ success: false, message: roleValidationMessage() });
    }
    if (!canManageRole(req.user?.role, normalizedRole)) {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const userId = await userRepository.insertUser({ username, password_hash, pin, role: normalizedRole });
    res.status(201).json({ success: true, data: { id: userId, username, role: normalizedRole } });
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
    const existingUser = await userRepository.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (!canManageRole(req.user?.role, existingUser.role)) {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }
    
    const updateData = {};
    if (username !== undefined) {updateData.username = username;}
    if (pin !== undefined) {updateData.pin = pin;}
    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!isValidWebAppRole(normalizedRole)) {
        return res.status(400).json({ success: false, message: roleValidationMessage() });
      }
      if (!canManageRole(req.user?.role, normalizedRole)) {
        return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
      }
      updateData.role = normalizedRole;
    }
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
    const existingUser = await userRepository.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (!canManageRole(req.user?.role, existingUser.role)) {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }
    const success = await userRepository.deleteUserById(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Get assigned stall for the current user.
 */
export async function getAssignedStall(req, res, next) {
  try {
    const userId = req.user.id;
    const stall = await userRepository.findAssignedStallByUserId(userId);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'No stall assigned to this user.' });
    }
    res.json({ success: true, data: stall });
  } catch (err) {
    next(err);
  }
}
