import { getLifecycleConfiguration } from '../config/lifecycle.config.js';
import { getApplicationPhase } from './application-lifecycle.service.js';

function checkWithTimeout(operation, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Readiness check timed out.')), timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise])
    .finally(() => clearTimeout(timeoutId));
}

export function getLivenessStatus() {
  return {
    success: true,
    status: 'alive',
  };
}

export async function getReadinessStatus({
  database,
  timeoutMs = getLifecycleConfiguration().readinessDatabaseTimeoutMs,
} = {}) {
  const phase = getApplicationPhase();
  if (phase !== 'ready') {
    return {
      success: false,
      status: 'not_ready',
      phase,
      checks: { database: 'not_checked' },
    };
  }

  try {
    const activeDatabase = database || (await import('../config/db.js')).default;
    await checkWithTimeout(() => activeDatabase.authenticate(), timeoutMs);
    return {
      success: true,
      status: 'ready',
      phase,
      checks: { database: 'available' },
    };
  } catch {
    return {
      success: false,
      status: 'not_ready',
      phase,
      checks: { database: 'unavailable' },
    };
  }
}
