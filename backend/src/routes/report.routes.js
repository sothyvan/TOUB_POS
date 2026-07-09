import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getDailySummary, getSalesSummary } from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate, authorize(['owner', 'manager']));

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', getDailySummary);

// GET /api/reports/sales?range=today|week|month|custom&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&stall_id=1&cashier_id=2
router.get('/sales', getSalesSummary);

export default router;
