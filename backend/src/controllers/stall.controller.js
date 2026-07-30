import * as stallService from '../services/stall.service.js';

export async function getStalls(req, res, next) {
  try {
    const result = await stallService.listStalls(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createStall(req, res, next) {
  try {
    const stall = await stallService.createStall(req.user, req.body);
    res.status(201).json({ success: true, data: stall });
  } catch (error) {
    next(error);
  }
}

export async function updateStall(req, res, next) {
  try {
    await stallService.updateStall(req.user, req.params.id, req.body);
    res.json({ success: true, message: 'Stall updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteStall(req, res, next) {
  try {
    await stallService.deleteStall(req.user, req.params.id);
    res.json({ success: true, message: 'Stall deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function assignStaff(req, res, next) {
  try {
    await stallService.assignStaff(req.user, req.params.id, req.body.userId);
    res.json({ success: true, message: 'Staff assigned successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function unassignStaff(req, res, next) {
  try {
    await stallService.unassignStaff(req.user, req.params.id, req.params.userId);
    res.json({ success: true, message: 'Staff unassigned successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function registerDevice(req, res, next) {
  try {
    const data = await stallService.registerDevice(req.user, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deregisterDevice(req, res, next) {
  try {
    const data = await stallService.deregisterDevice(
      req.user,
      req.params.id,
      req.params.deviceId,
    );
    res.json({
      success: true,
      message: 'Terminal deregistered successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}
