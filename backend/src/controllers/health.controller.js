import {
  getLivenessStatus,
  getReadinessStatus,
} from '../services/health.service.js';

export function getLiveness(_req, res) {
  res.set('Cache-Control', 'no-store');
  return res.json(getLivenessStatus());
}

export async function getReadiness(_req, res, next) {
  try {
    const readiness = await getReadinessStatus();
    res.set('Cache-Control', 'no-store');
    return res.status(readiness.success ? 200 : 503).json(readiness);
  } catch (error) {
    return next(error);
  }
}
