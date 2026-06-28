import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getStalls, createStall, updateStall, deleteStall, assignStaff, unassignStaff } from '../controllers/stall.controller.js';

const router = Router();

// Require authentication and restrict to management roles
router.use(authenticate, authorize(['owner', 'manager']));

// GET    /api/stalls      — List all stalls
router.get('/', getStalls);

// POST   /api/stalls      — Create a new stall
router.post('/', createStall);

// PUT    /api/stalls/:id  — Update a stall
router.put('/:id', updateStall);

// DELETE /api/stalls/:id  — Delete a stall
router.delete('/:id', deleteStall);

// POST   /api/stalls/:id/staff — Assign a user to this stall
router.post('/:id/staff', assignStaff);

// DELETE /api/stalls/:id/staff/:userId — Remove a user from this stall
router.delete('/:id/staff/:userId', unassignStaff);

export default router;
