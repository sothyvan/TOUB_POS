import { sequelize, User, Stall } from '../models/index.js';

const PUBLIC_USER_EXCLUDES = ['password', 'pin', 'session_version'];
import { parsePagination, buildOrderClause, paginatedResponse } from '../utils/pagination.js';

/**
 * Find a user by username. Returns user object with password mapped to password_hash.
 */
export async function findUserByUsername(username) {
  const user = await User.findOne({ where: { username, is_deleted: false } });
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    password_hash: user.password,
    role: user.role,
    owner_id: user.owner_id,
    is_active: user.is_active,
    session_version: user.session_version,
  };
}

/**
 * Find a user by ID.
 */
export async function findUserById(id) {
  return User.findOne({
    where: { id, is_deleted: false },
    attributes: { exclude: PUBLIC_USER_EXCLUDES },
  });
}

export function findUserSessionById(id, { transaction } = {}) {
  return User.findByPk(id, {
    attributes: [
      'id',
      'username',
      'role',
      'owner_id',
      'is_active',
      'is_deleted',
      'session_version',
    ],
    transaction,
  });
}

/**
 * Find a user by ID including their PIN (for auth).
 */
export async function findUserWithPinById(id) {
  return User.findOne({
    where: { id, is_deleted: false },
    attributes: ['id', 'username', 'role', 'pin', 'owner_id', 'is_active', 'session_version'],
  });
}

/**
 * Insert a new user. Role-specific credentials must already be hashed or null.
 */
export async function insertUser({
  username,
  password_hash,
  pin_hash,
  role,
  owner_id = null,
  is_active = true,
}) {
  const user = await User.create({
    username,
    password: password_hash,
    pin: pin_hash,
    role,
    owner_id,
    is_active,
  });
  return user.id;
}

/**
 * Fetch all users (excluding sensitive credentials).
 */
export async function findAllUsers(queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'username', 'role'], [['created_at', 'DESC']]);

  const { rows, count } = await User.findAndCountAll({
    where: { is_deleted: false },
    attributes: { exclude: PUBLIC_USER_EXCLUDES },
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Fetch all users belonging to a specific owner.
 */
export async function findAllUsersByOwnerId(ownerId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'username', 'role'], [['created_at', 'DESC']]);

  const { rows, count } = await User.findAndCountAll({
    where: { owner_id: ownerId, is_deleted: false },
    attributes: { exclude: PUBLIC_USER_EXCLUDES },
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Fetch business owner accounts visible to the temporary platform admin.
 */
export async function findOwnerUsers(queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'username'], [['created_at', 'DESC']]);

  const { rows, count } = await User.findAndCountAll({
    where: { role: 'owner', is_deleted: false },
    attributes: { exclude: PUBLIC_USER_EXCLUDES },
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Update user by ID.
 */
export async function updateUserById(id, data, { invalidateSession = false } = {}) {
  const updateData = { ...data };
  if (Object.prototype.hasOwnProperty.call(data, 'password_hash')) {
    updateData.password = data.password_hash;
    delete updateData.password_hash;
  }
  if (invalidateSession) {
    updateData.session_version = sequelize.literal('session_version + 1');
  }
  const [affectedRows] = await User.update(updateData, { where: { id } });
  return affectedRows > 0;
}

/**
 * Delete user by ID.
 */
export async function deleteUserById(id) {
  const user = await User.findByPk(id);
  if (!user) {
    return false;
  }

  const deletedSuffix = `_deleted_${Date.now()}`;
  const deletedUsername = `${user.username.slice(0, 50 - deletedSuffix.length)}${deletedSuffix}`;
  const [affectedRows] = await User.update(
    { 
      is_deleted: true, 
      is_active: false,
      username: deletedUsername,
      session_version: sequelize.literal('session_version + 1'),
    },
    { where: { id } }
  );
  return affectedRows > 0;
}

/**
 * Find the stall assigned to a user.
 */
export async function findAssignedStallByUserId(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: Stall }],
  });
  if (user && user.Stalls && user.Stalls.length > 0) {
    return user.Stalls[0];
  }
  return null;
}

/**
 * Find all active cashiers assigned to a specific stall.
 */
export async function findCashiersByStallId(stallId) {
  return User.findAll({
    attributes: ['id', 'username', 'role'],
    include: [{
      model: Stall,
      where: { id: stallId },
      attributes: [],
      through: { attributes: [] }
    }],
    where: { role: 'cashier', is_active: true, is_deleted: false }
  });
}

