import * as stallRepository from '../repositories/stall.repository.js';
import * as userRepository from '../repositories/user.repository.js';

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * Get all stalls.
 */
export async function getStalls(req, res, next) {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stalls = await stallRepository.findAllStallsByOwnerId(ownerId);
    res.json({ success: true, data: stalls });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new stall.
 */
export async function createStall(req, res, next) {
  try {
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Stall name is required.' });
    }
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.insertStall({
      owner_id: ownerId,
      name,
      location,
    });
    res.status(201).json({ success: true, data: stall });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing stall.
 */
export async function updateStall(req, res, next) {
  try {
    const { id } = req.params;
    const { name, location, telegram_chat_id } = req.body;

    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    const updateData = {};
    if (name !== undefined) { updateData.name = name; }
    if (location !== undefined) { updateData.location = location; }
    if (telegram_chat_id !== undefined) { updateData.telegram_chat_id = telegram_chat_id || null; }

    await stallRepository.updateStallById(id, updateData);
    res.json({ success: true, message: 'Stall updated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a stall by ID.
 */
export async function deleteStall(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    await stallRepository.deleteStallById(id);
    res.json({ success: true, message: 'Stall deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Assign a staff member to a stall.
 */
export async function assignStaff(req, res, next) {
  try {
    const { id } = req.params; // stall id
    const { userId } = req.body;
    const stallId = parsePositiveInteger(id);
    const staffUserId = parsePositiveInteger(userId);
    if (!stallId || !staffUserId) {
      return res.status(400).json({ success: false, message: 'Valid stall id and userId are required.' });
    }

    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(stallId);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }

    const user = await userRepository.findUserById(staffUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: User belongs to another owner.' });
    }
    if (user.role !== 'cashier') {
      return res.status(400).json({ success: false, message: 'Only cashier users can be assigned to stalls.' });
    }

    await stallRepository.assignStaffToStall(stallId, staffUserId);
    res.json({ success: true, message: 'Staff assigned successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove a staff member from a stall.
 */
export async function unassignStaff(req, res, next) {
  try {
    const { id, userId } = req.params;
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    if (stall.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Stall belongs to another owner.' });
    }
    
    const user = await userRepository.findUserById(userId);
    if (!user || user.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: User belongs to another owner.' });
    }

    const success = await stallRepository.removeStaffFromStall(id, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }
    res.json({ success: true, message: 'Staff unassigned successfully.' });
  } catch (err) {
    next(err);
  }
}
