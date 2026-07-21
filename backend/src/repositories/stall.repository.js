import { Stall, StallDevice, User, StallStaff } from '../models/index.js';
import { revokeDevicesByStallId } from './stall-device.repository.js';
import { parsePagination, buildOrderClause, paginatedResponse } from '../utils/pagination.js';

/**
 * Fetch all stalls.
 */
export async function findAllStalls(queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'name'], [['created_at', 'DESC']]);

  const { rows, count } = await Stall.findAndCountAll({
    where: { is_deleted: false },
    include: [
      {
        model: User,
        attributes: ['id', 'username', 'role'],
        through: { attributes: [] }
      },
      {
        model: StallDevice,
        as: 'Devices',
        attributes: ['id', 'name', 'is_active', 'last_cashier_id', 'last_seen_at', 'revoked_at', 'created_at'],
        include: [{
          model: User,
          as: 'LastCashier',
          attributes: ['id', 'username'],
          required: false,
        }],
      }
    ],
    distinct: true,
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Fetch all stalls owned by a specific owner.
 */
export async function findAllStallsByOwnerId(ownerId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'name'], [['created_at', 'DESC']]);

  const { rows, count } = await Stall.findAndCountAll({
    where: { owner_id: ownerId, is_deleted: false },
    include: [
      {
        model: User,
        attributes: ['id', 'username', 'role'],
        through: { attributes: [] }
      },
      {
        model: StallDevice,
        as: 'Devices',
        attributes: ['id', 'name', 'is_active', 'last_cashier_id', 'last_seen_at', 'revoked_at', 'created_at'],
        include: [{
          model: User,
          as: 'LastCashier',
          attributes: ['id', 'username'],
          required: false,
        }],
      }
    ],
    distinct: true,
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Find a stall by ID.
 */
export async function findStallById(id) {
  return Stall.findOne({ where: { id, is_deleted: false } });
}

/**
 * Create a new stall.
 */
export async function insertStall(data) {
  return Stall.create(data);
}

/**
 * Update a stall by ID.
 */
export async function updateStallById(id, data) {
  const [affectedRows] = await Stall.update(data, { where: { id } });
  return affectedRows > 0;
}

/**
 * Delete a stall by ID.
 */
export async function deleteStallById(id) {
  const stall = await Stall.findByPk(id);
  if (!stall) {
    return false;
  }

  await revokeDevicesByStallId(id);
  const [affectedRows] = await Stall.update(
    { 
      is_deleted: true, 
      is_active: false,
      device_token: null,
      name: `${stall.name}_deleted_${Date.now()}`
    },
    { where: { id } }
  );
  return affectedRows > 0;
}

/**
 * Assign a staff member to a stall.
 * Ensures the staff member is only assigned to one stall.
 */
export async function assignStaffToStall(stallId, userId) {
  // First, remove the user from any other stall assignments
  await StallStaff.destroy({ where: { user_id: userId } });
  return StallStaff.create({ stall_id: stallId, user_id: userId });
}

/**
 * Remove a staff member from a stall.
 */
export async function removeStaffFromStall(stallId, userId) {
  const affectedRows = await StallStaff.destroy({ where: { stall_id: stallId, user_id: userId } });
  return affectedRows > 0;
}

