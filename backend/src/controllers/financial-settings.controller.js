import {
  getFinancialSettings,
  updateFinancialSettings,
} from '../services/financial-settings.service.js';

export async function getSettings(req, res, next) {
  try {
    res.json({ success: true, data: await getFinancialSettings(req.user) });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const data = await updateFinancialSettings(
      req.user,
      req.body.exchange_rate_khr_per_usd,
      req.requestId,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
