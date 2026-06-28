import * as stallRepository from '../repositories/stall.repository.js';

/**
 * Get all stalls.
 */
export async function getStalls(req, res, next) {
  try {
    const stalls = await stallRepository.findAllStalls();
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
    const { owner_id, name, location, device_token, telegram_chat_id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Stall name is required.' });
    }
    const stall = await stallRepository.insertStall({
      owner_id: owner_id ?? (req.user?.role === 'owner' ? req.user.id : null),
      name,
      location,
      device_token,
      telegram_chat_id,
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
    const { owner_id, name, location, device_token, telegram_chat_id } = req.body;
    
    const updateData = {};
    if (owner_id !== undefined) {updateData.owner_id = owner_id;}
    if (name !== undefined) {updateData.name = name;}
    if (location !== undefined) {updateData.location = location;}
    if (device_token !== undefined) {updateData.device_token = device_token;}
    if (telegram_chat_id !== undefined) {updateData.telegram_chat_id = telegram_chat_id;}

    const success = await stallRepository.updateStallById(id, updateData);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Stall not found or no changes made.' });
    }
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
    const success = await stallRepository.deleteStallById(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Stall not found.' });
    }
    res.json({ success: true, message: 'Stall deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
