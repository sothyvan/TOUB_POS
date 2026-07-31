import {
  sequelize,
  Stall,
  StallDevice,
  User,
  StallStaff,
} from '../models/index.js';
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
export async function findStallById(id, options = {}) {
  return Stall.findOne({ where: { id, is_deleted: false }, ...options });
}

/**
 * Create a new stall.
 */
export async function insertStall(data, options = {}) {
  return Stall.create(data, options);
}

/**
 * Update a stall by ID.
 */
export async function updateStallById(id, data, options = {}) {
  const [affectedRows] = await Stall.update(data, { where: { id }, ...options });
  return affectedRows > 0;
}

/**
 * Delete a stall by ID.
 */
export async function deleteStallById(id, { transaction, revokedByUserId = null } = {}) {
  const stall = await Stall.findByPk(id, { transaction });
  if (!stall) {
    return false;
  }

  await revokeDevicesByStallId(id, revokedByUserId, { transaction });
  const [affectedRows] = await Stall.update(
    { 
      is_deleted: true, 
      is_active: false,
      device_token: null,
      name: `${stall.name}_deleted_${Date.now()}`
    },
    { where: { id }, transaction }
  );
  return affectedRows > 0;
}

/**
 * Assign a staff member to a stall.
 * Ensures the staff member is only assigned to one stall.
 */
export async function assignStaffToStall(stallId, userId, { audit } = {}) {
  const transaction = await sequelize.transaction();
  try {
    const existing = await StallStaff.findOne({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing && Number(existing.stall_id) === Number(stallId)) {
      await transaction.commit();
      return {
        assignment: existing,
        changed: false,
        previousStallId: Number(existing.stall_id),
      };
    }

    const previousStallId = existing ? Number(existing.stall_id) : null;
    if (existing) {
      await existing.destroy({ transaction });
    }
    const assignment = await StallStaff.create(
      { stall_id: stallId, user_id: userId },
      { transaction },
    );
    if (audit) {
      await audit({ transaction, previousStallId, assignment });
    }
    await transaction.commit();
    return { assignment, changed: true, previousStallId };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Remove a staff member from a stall.
 */
export async function removeStaffFromStall(stallId, userId, { audit } = {}) {
  const transaction = await sequelize.transaction();
  try {
    const assignment = await StallStaff.findOne({
      where: { stall_id: stallId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!assignment) {
      await transaction.commit();
      return false;
    }
    await assignment.destroy({ transaction });
    if (audit) {
      await audit({ transaction, assignment });
    }
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export function findStaffAssignmentByUserId(userId, options = {}) {
  return StallStaff.findOne({
    where: { user_id: userId },
    attributes: ['id', 'stall_id', 'user_id'],
    ...options,
  });
}
