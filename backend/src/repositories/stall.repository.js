import { Stall, User, StallStaff } from '../models/index.js';

/**
 * Fetch all stalls.
 */
export async function findAllStalls() {
  return Stall.findAll({
    include: [
      { 
        model: User, 
        attributes: ['id', 'username', 'role'],
        through: { attributes: [] } // omit the join table attributes
      }
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Fetch all stalls owned by a specific owner.
 */
export async function findAllStallsByOwnerId(ownerId) {
  return Stall.findAll({
    where: { owner_id: ownerId },
    include: [
      { 
        model: User, 
        attributes: ['id', 'username', 'role'],
        through: { attributes: [] }
      }
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Find a stall by ID.
 */
export async function findStallById(id) {
  return Stall.findByPk(id);
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
  const affectedRows = await Stall.destroy({ where: { id } });
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

/**
 * Update a stall's device token.
 */
export async function updateStallDeviceToken(id, deviceToken) {
  const [affectedRows] = await Stall.update({ device_token: deviceToken }, { where: { id } });
  return affectedRows > 0;
}

/**
 * Find a stall by its device token.
 */
export async function findStallByDeviceToken(deviceToken) {
  return Stall.findOne({ where: { device_token: deviceToken } });
}

