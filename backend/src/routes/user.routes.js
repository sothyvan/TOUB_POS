import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getUsers, createUser } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate, authorize('manager'));

// GET  /api/users    — list all cashier/manager accounts
router.get('/', getUsers);

// POST /api/users    — create a new user account
router.post('/', createUser);

export default router;
