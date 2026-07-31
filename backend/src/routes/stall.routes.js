import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getStalls,
  createStall,
  updateStall,
  deleteStall,
  assignStaff,
  unassignStaff,
  registerDevice,
  deregisterDevice,
  getTelegramCooks,
  authorizeTelegramCook,
  revokeTelegramCook,
  createTelegramGroupConnection,
} from '../controllers/stall.controller.js';
import { validateBody } from '../validation/request-validation.js';
import {
  assignStaffBody,
  createStallBody,
  emptyBody,
  registerDeviceBody,
  telegramCookBody,
  updateStallBody,
} from '../validation/mutation-schemas.js';

const router = Router();

// Require authentication and restrict to management roles
router.use(authenticate, authorize(['owner', 'manager']));

// GET    /api/stalls      — List all stalls
router.get('/', getStalls);

// POST   /api/stalls      — Create a new stall
router.post('/', validateBody(createStallBody), createStall);

// PUT    /api/stalls/:id  — Update a stall
router.put('/:id', validateBody(updateStallBody), updateStall);

// DELETE /api/stalls/:id  — Delete a stall
router.delete('/:id', validateBody(emptyBody), deleteStall);

// POST   /api/stalls/:id/staff — Assign a user to this stall
router.post('/:id/staff', validateBody(assignStaffBody), assignStaff);

// DELETE /api/stalls/:id/staff/:userId — Remove a user from this stall
router.delete('/:id/staff/:userId', validateBody(emptyBody), unassignStaff);

// POST   /api/stalls/:id/register-device — Register terminal to a stall
router.post('/:id/register-device', validateBody(registerDeviceBody), registerDevice);

// DELETE /api/stalls/:id/devices/:deviceId — Revoke one registered terminal
router.delete('/:id/devices/:deviceId', validateBody(emptyBody), deregisterDevice);

// Telegram-only cook identities authorized to complete this stall's kitchen tickets
router.get('/:id/telegram-cooks', getTelegramCooks);
router.post('/:id/telegram-cooks', validateBody(telegramCookBody), authorizeTelegramCook);
router.delete('/:id/telegram-cooks/:cookId', validateBody(emptyBody), revokeTelegramCook);

// Short-lived Owner-only link for selecting this stall's Telegram group
router.post(
  '/:id/telegram-connection',
  authorize('owner'),
  validateBody(emptyBody),
  createTelegramGroupConnection,
);

export default router;
