import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getDailySummary } from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', getDailySummary);

export default router;
