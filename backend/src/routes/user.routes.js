import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getUsers, createUser, updateUser, deleteUser, getAssignedStall } from '../controllers/user.controller.js';

const router = Router();

// GET /api/users/me/stall — Get stall assigned to current user (Accessible by cashiers)
router.get('/me/stall', authenticate, authorize(['cashier', 'owner', 'manager']), getAssignedStall);

// Require authentication and restrict user management to platform/management roles.
// Controllers enforce that managers can manage cashier users only.
router.use(authenticate, authorize(['platform_admin', 'owner', 'manager']));

// GET    /api/users      — List all user accounts
router.get('/', getUsers);

// POST   /api/users      — Create a new user account
router.post('/', createUser);

// PUT    /api/users/:id  — Update a user account
router.put('/:id', updateUser);

// DELETE /api/users/:id  — Delete a user account
router.delete('/:id', deleteUser);

export default router;
