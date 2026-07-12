import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/user.repository.js';
import { hashPin } from '../utils/pin.util.js';

const CUSTOMER_ROLES = ['owner', 'manager', 'cashier'];
const PASSWORD_ROLES = ['platform_admin', 'owner', 'manager'];
const ROLE_MANAGEMENT_RULES = {
  platform_admin: ['owner'],
  owner: ['manager', 'cashier'],
  manager: ['cashier'],
  cashier: [],
};

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isValidWebAppRole(role) {
  return CUSTOMER_ROLES.includes(role);
}

function canManageRole(actorRole, targetRole) {
  return ROLE_MANAGEMENT_RULES[normalizeRole(actorRole)]?.includes(normalizeRole(targetRole)) ?? false;
}

function isPasswordRole(role) {
  return PASSWORD_ROLES.includes(normalizeRole(role));
}

function hasCredentialValue(value) {
  return String(value ?? '').trim().length > 0;
}

function credentialError(message) {
  return { success: false, message };
}

function roleValidationMessage() {
  return 'role must be owner, manager, or cashier.';
}

function rolePermissionMessage(actorRole) {
  const normalized = normalizeRole(actorRole);
  if (normalized === 'platform_admin') {
    return 'Platform admins can create owner accounts only.';
  }
  if (normalized === 'owner') {
    return 'Owners can create and manage manager and cashier users only.';
  }
  if (normalized === 'manager') {
    return 'Managers can create and manage cashier users only.';
  }
  return 'Insufficient permissions to manage this user role.';
}

function ownerScopeForActor(user) {
  const role = normalizeRole(user?.role);
  if (role === 'platform_admin') {
    return null;
  }
  if (role === 'owner') {
    return user.id;
  }
  return user?.owner_id;
}

function isCashierRole(role) {
  return normalizeRole(role) === 'cashier';
}

async function buildCreateCredentials(role, password, pin) {
  if (isPasswordRole(role)) {
    if (!hasCredentialValue(password)) {
      return { error: 'Owner and manager users require a password.' };
    }
    if (hasCredentialValue(pin)) {
      return { error: 'Owner and manager users cannot have a PIN.' };
    }
    return {
      password_hash: await bcrypt.hash(String(password).trim(), 10),
      pin: null,
    };
  }

  if (!hasCredentialValue(pin)) {
    return { error: 'Cashier users require a PIN.' };
  }
  if (hasCredentialValue(password)) {
    return { error: 'Cashier users cannot have a password.' };
  }
  return {
    password_hash: null,
    pin: await hashPin(pin),
  };
}

async function applyUpdateCredentialRules(updateData, existingRole, targetRole, password, pin) {
  if (isPasswordRole(targetRole)) {
    if (hasCredentialValue(pin)) {
      return 'Owner and manager users cannot have a PIN.';
    }
    if (hasCredentialValue(password)) {
      updateData.password_hash = await bcrypt.hash(String(password).trim(), 10);
    } else if (!isPasswordRole(existingRole)) {
      return 'Changing a cashier to owner or manager requires a password.';
    }
    updateData.pin = null;
    return null;
  }

  if (hasCredentialValue(password)) {
    return 'Cashier users cannot have a password.';
  }
  if (hasCredentialValue(pin)) {
    updateData.pin = await hashPin(pin);
  } else if (normalizeRole(existingRole) !== 'cashier') {
    return 'Changing an owner or manager to cashier requires a PIN.';
  }
  updateData.password_hash = null;
  return null;
}

/**
 * Get all users.
 */
export async function getUsers(req, res, next) {
  try {
    if (normalizeRole(req.user?.role) === 'platform_admin') {
      const result = await userRepository.findOwnerUsers(req.query);
      return res.json({ success: true, ...result });
    }

    const ownerId = ownerScopeForActor(req.user);
    const result = await userRepository.findAllUsersByOwnerId(ownerId, req.query);
    const visibleData = normalizeRole(req.user?.role) === 'manager'
      ? result.data.filter((user) => normalizeRole(user.role) === 'cashier')
      : result.data;
    return res.json({ success: true, data: visibleData, pagination: result.pagination });
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
    const normalizedUsername = String(username || '').trim();
    const normalizedRole = normalizeRole(role);
    if (!normalizedUsername || !role) {
      return res.status(400).json({ success: false, message: 'username and role are required.' });
    }
    if (!isValidWebAppRole(normalizedRole)) {
      return res.status(400).json({ success: false, message: roleValidationMessage() });
    }
    if (!canManageRole(req.user?.role, normalizedRole)) {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }
    if (isCashierRole(normalizedRole) && !pin) {
      return res.status(400).json({ success: false, message: 'pin is required for cashier users.' });
    }
    if (!isCashierRole(normalizedRole) && !password) {
      return res.status(400).json({ success: false, message: 'password is required for owner and manager users.' });
    }

    const credentialData = await buildCreateCredentials(normalizedRole, password, pin);
    if (credentialData.error) {
      return res.status(400).json(credentialError(credentialData.error));
    }

    const ownerId = ownerScopeForActor(req.user);
    const userId = await userRepository.insertUser({
      username: normalizedUsername,
      password_hash: credentialData.password_hash,
      pin_hash: credentialData.pin,
      role: normalizedRole,
      owner_id: ownerId,
    });
    res.status(201).json({ success: true, data: { id: userId, username: normalizedUsername, role: normalizedRole } });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing user.
 */
export async function updateUser(req, res, next) {
  try {
    if (normalizeRole(req.user?.role) === 'platform_admin') {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }

    const { id } = req.params;
    const { username, password, pin, role, is_active } = req.body;

    const ownerId = ownerScopeForActor(req.user);
    const existingUser = await userRepository.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (existingUser.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: User belongs to another owner.' });
    }
    if (!canManageRole(req.user?.role, existingUser.role)) {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }
    
    const updateData = {};
    if (username !== undefined) {
      const normalizedUsername = String(username || '').trim();
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, message: 'username is required.' });
      }
      updateData.username = normalizedUsername;
    }

    const existingRole = normalizeRole(existingUser.role);
    let targetRole = existingRole;
    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!isValidWebAppRole(normalizedRole)) {
        return res.status(400).json({ success: false, message: roleValidationMessage() });
      }
      if (!canManageRole(req.user?.role, normalizedRole)) {
        return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
      }
      updateData.role = normalizedRole;
      targetRole = normalizedRole;
    }
    if (is_active !== undefined) {updateData.is_active = is_active;}

    const credentialValidationError = await applyUpdateCredentialRules(
      updateData,
      existingRole,
      targetRole,
      password,
      pin,
    );
    if (credentialValidationError) {
      return res.status(400).json(credentialError(credentialValidationError));
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
    if (normalizeRole(req.user?.role) === 'platform_admin') {
      return res.status(403).json({ success: false, message: rolePermissionMessage(req.user?.role) });
    }

    const { id } = req.params;
    const ownerId = ownerScopeForActor(req.user);
    const existingUser = await userRepository.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (existingUser.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: User belongs to another owner.' });
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
