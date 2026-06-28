import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getStalls, createStall, updateStall, deleteStall } from '../controllers/stall.controller.js';

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

export default router;
