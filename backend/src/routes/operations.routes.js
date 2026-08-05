import { Router } from 'express';
import { getTelegramOperationsSnapshot } from '../controllers/telegram-operations.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, authorize(['owner', 'manager']));
router.get('/telegram', getTelegramOperationsSnapshot);

export default router;
