const DEFAULT_READINESS_DATABASE_TIMEOUT_MS = 2000;
const DEFAULT_SHUTDOWN_GRACE_PERIOD_MS = 15000;

function parseBoundedInteger(name, value, { fallback, min, max }) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }

  return parsed;
}

export function getLifecycleConfiguration(env = process.env) {
  return {
    readinessDatabaseTimeoutMs: parseBoundedInteger(
      'READINESS_DATABASE_TIMEOUT_MS',
      env.READINESS_DATABASE_TIMEOUT_MS,
      {
        fallback: DEFAULT_READINESS_DATABASE_TIMEOUT_MS,
        min: 100,
        max: 10000,
      },
    ),
    shutdownGracePeriodMs: parseBoundedInteger(
      'SHUTDOWN_GRACE_PERIOD_MS',
      env.SHUTDOWN_GRACE_PERIOD_MS,
      {
        fallback: DEFAULT_SHUTDOWN_GRACE_PERIOD_MS,
        min: 1000,
        max: 120000,
      },
    ),
  };
}
