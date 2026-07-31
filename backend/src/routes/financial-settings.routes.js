import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getSettings, updateSettings } from '../controllers/financial-settings.controller.js';
import { validateBody } from '../validation/request-validation.js';
import { updateFinancialSettingsBody } from '../validation/mutation-schemas.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize(['owner', 'manager', 'cashier']), getSettings);
router.put('/', authorize('owner'), validateBody(updateFinancialSettingsBody), updateSettings);

export default router;
