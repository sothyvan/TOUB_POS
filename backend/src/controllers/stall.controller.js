import * as stallService from '../services/stall.service.js';
import * as telegramCookService from '../services/telegram-cook.service.js';
import * as telegramGroupConnectionService from '../services/telegram-group-connection.service.js';

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
    const stall = await stallService.createStall(req.user, req.body, req.requestId);
    res.status(201).json({ success: true, data: stall });
  } catch (error) {
    next(error);
  }
}

export async function updateStall(req, res, next) {
  try {
    await stallService.updateStall(req.user, req.params.id, req.body, req.requestId);
    res.json({ success: true, message: 'Stall updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteStall(req, res, next) {
  try {
    await stallService.deleteStall(req.user, req.params.id, req.requestId);
    res.json({ success: true, message: 'Stall deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function assignStaff(req, res, next) {
  try {
    await stallService.assignStaff(req.user, req.params.id, req.body.userId, req.requestId);
    res.json({ success: true, message: 'Staff assigned successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function unassignStaff(req, res, next) {
  try {
    await stallService.unassignStaff(req.user, req.params.id, req.params.userId, req.requestId);
    res.json({ success: true, message: 'Staff unassigned successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function registerDevice(req, res, next) {
  try {
    const data = await stallService.registerDevice(req.user, req.params.id, req.body, req.requestId);
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
      req.requestId,
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

export async function getTelegramCooks(req, res, next) {
  try {
    const data = await telegramCookService.listTelegramCooks(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function authorizeTelegramCook(req, res, next) {
  try {
    const data = await telegramCookService.authorizeTelegramCook(
      req.user,
      req.params.id,
      req.body,
      req.requestId,
    );
    res.status(201).json({
      success: true,
      message: 'Telegram cook authorized successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeTelegramCook(req, res, next) {
  try {
    const data = await telegramCookService.revokeTelegramCook(
      req.user,
      req.params.id,
      req.params.cookId,
      req.requestId,
    );
    res.json({
      success: true,
      message: 'Telegram cook access revoked.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function createTelegramGroupConnection(req, res, next) {
  try {
    const data = await telegramGroupConnectionService.createTelegramGroupConnectionLink(
      req.user,
      req.params.id,
      req.requestId,
    );
    res.status(201).json({
      success: true,
      message: 'Telegram group connection link created.',
      data,
    });
  } catch (error) {
    next(error);
  }
}
