import { Stall } from '../models/index.js';

/**
 * Fetch all stalls.
 */
export async function findAllStalls() {
  return Stall.findAll({
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
