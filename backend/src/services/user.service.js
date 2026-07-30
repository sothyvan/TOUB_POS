import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/user.repository.js';
import { revokeUserRefreshSessions } from '../repositories/refresh-session.repository.js';
import { hashPin } from '../utils/pin.util.js';
import { httpError } from '../utils/http-error.util.js';
import { emitUserSessionInvalidated } from './websocket.service.js';

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

function canManageRole(actorRole, targetRole) {
  return ROLE_MANAGEMENT_RULES[normalizeRole(actorRole)]?.includes(normalizeRole(targetRole)) ?? false;
}

function isPasswordRole(role) {
  return PASSWORD_ROLES.includes(normalizeRole(role));
}

function hasCredentialValue(value) {
  return String(value ?? '').trim().length > 0;
}

function rolePermissionMessage(actorRole) {
  const normalizedRole = normalizeRole(actorRole);
  if (normalizedRole === 'platform_admin') {
    return 'Platform admins can create owner accounts only.';
  }
  if (normalizedRole === 'owner') {
    return 'Owners can create and manage manager and cashier users only.';
  }
  if (normalizedRole === 'manager') {
    return 'Managers can create and manage cashier users only.';
  }
  return 'Insufficient permissions to manage this user role.';
}

function ownerScopeForActor(actor) {
  const role = normalizeRole(actor?.role);
  if (role === 'platform_admin') {
    return null;
  }
  if (role === 'owner') {
    return actor.id;
  }
  return actor?.owner_id;
}

function requireValidCustomerRole(role) {
  if (!CUSTOMER_ROLES.includes(role)) {
    throw httpError('role must be owner, manager, or cashier.');
  }
}

function requireRolePermission(actorRole, targetRole) {
  if (!canManageRole(actorRole, targetRole)) {
    throw httpError(rolePermissionMessage(actorRole), 403);
  }
}

async function buildCreateCredentials(role, password, pin) {
  if (isPasswordRole(role)) {
    if (!hasCredentialValue(password)) {
      throw httpError('Owner and manager users require a password.');
    }
    if (hasCredentialValue(pin)) {
      throw httpError('Owner and manager users cannot have a PIN.');
    }
    return {
      password_hash: await bcrypt.hash(String(password).trim(), 10),
      pin_hash: null,
    };
  }

  if (!hasCredentialValue(pin)) {
    throw httpError('Cashier users require a PIN.');
  }
  if (hasCredentialValue(password)) {
    throw httpError('Cashier users cannot have a password.');
  }
  return {
    password_hash: null,
    pin_hash: await hashPin(pin),
  };
}

async function applyUpdateCredentialRules(updateData, existingRole, targetRole, password, pin) {
  if (isPasswordRole(targetRole)) {
    if (hasCredentialValue(pin)) {
      throw httpError('Owner and manager users cannot have a PIN.');
    }
    if (hasCredentialValue(password)) {
      updateData.password_hash = await bcrypt.hash(String(password).trim(), 10);
    } else if (!isPasswordRole(existingRole)) {
      throw httpError('Changing a cashier to owner or manager requires a password.');
    }
    updateData.pin = null;
    return;
  }

  if (hasCredentialValue(password)) {
    throw httpError('Cashier users cannot have a password.');
  }
  if (hasCredentialValue(pin)) {
    updateData.pin = await hashPin(pin);
  } else if (normalizeRole(existingRole) !== 'cashier') {
    throw httpError('Changing an owner or manager to cashier requires a PIN.');
  }
  updateData.password_hash = null;
}

async function requireManageableUser(actor, userId) {
  const existingUser = await userRepository.findUserById(userId);
  if (!existingUser) {
    throw httpError('User not found.', 404);
  }
  if (existingUser.owner_id !== ownerScopeForActor(actor)) {
    throw httpError('Forbidden: User belongs to another owner.', 403);
  }
  requireRolePermission(actor?.role, existingUser.role);
  return existingUser;
}

export async function listUsers(actor, query = {}) {
  if (normalizeRole(actor?.role) === 'platform_admin') {
    return userRepository.findOwnerUsers(query);
  }

  const result = await userRepository.findAllUsersByOwnerId(ownerScopeForActor(actor), query);
  if (normalizeRole(actor?.role) !== 'manager') {
    return result;
  }
  return {
    ...result,
    data: result.data.filter((user) => normalizeRole(user.role) === 'cashier'),
  };
}

export async function createUser(actor, payload) {
  const username = String(payload.username || '').trim();
  const role = normalizeRole(payload.role);
  if (!username || !payload.role) {
    throw httpError('username and role are required.');
  }
  requireValidCustomerRole(role);
  requireRolePermission(actor?.role, role);

  if (role === 'cashier' && !payload.pin) {
    throw httpError('pin is required for cashier users.');
  }
  if (role !== 'cashier' && !payload.password) {
    throw httpError('password is required for owner and manager users.');
  }

  const credentials = await buildCreateCredentials(role, payload.password, payload.pin);
  const userId = await userRepository.insertUser({
    username,
    ...credentials,
    role,
    owner_id: ownerScopeForActor(actor),
  });
  return { id: userId, username, role };
}

export async function updateUser(actor, userId, payload) {
  if (normalizeRole(actor?.role) === 'platform_admin') {
    throw httpError(rolePermissionMessage(actor?.role), 403);
  }

  const existingUser = await requireManageableUser(actor, userId);
  const updateData = {};
  if (payload.username !== undefined) {
    const username = String(payload.username || '').trim();
    if (!username) {
      throw httpError('username is required.');
    }
    updateData.username = username;
  }

  const existingRole = normalizeRole(existingUser.role);
  let targetRole = existingRole;
  if (payload.role !== undefined) {
    targetRole = normalizeRole(payload.role);
    requireValidCustomerRole(targetRole);
    requireRolePermission(actor?.role, targetRole);
    updateData.role = targetRole;
  }
  if (payload.is_active !== undefined) {
    updateData.is_active = payload.is_active;
  }

  await applyUpdateCredentialRules(
    updateData,
    existingRole,
    targetRole,
    payload.password,
    payload.pin,
  );

  const success = await userRepository.updateUserById(
    userId,
    updateData,
    { invalidateSession: true },
  );
  if (!success) {
    throw httpError('User not found or no changes made.', 404);
  }
  await revokeUserRefreshSessions(userId);
  emitUserSessionInvalidated(userId, {
    message: 'Your account details, credentials, or permissions changed. Please sign in again.',
  });
}

export async function deleteUser(actor, userId) {
  if (normalizeRole(actor?.role) === 'platform_admin') {
    throw httpError(rolePermissionMessage(actor?.role), 403);
  }
  await requireManageableUser(actor, userId);
  const success = await userRepository.deleteUserById(userId);
  if (!success) {
    throw httpError('User not found.', 404);
  }
  await revokeUserRefreshSessions(userId);
  emitUserSessionInvalidated(userId, {
    message: 'Your account was deleted. Contact the business owner if this was unexpected.',
  });
}

export async function getAssignedStall(actor) {
  const stall = await userRepository.findAssignedStallByUserId(actor.id);
  if (!stall) {
    throw httpError('No stall assigned to this user.', 404);
  }
  return {
    id: stall.id,
    name: stall.name,
    location: stall.location,
    is_active: stall.is_active,
  };
}
