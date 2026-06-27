const DEFAULT_DEVELOPMENT_FRONTEND_ORIGIN = 'http://localhost:5173';
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function currentNodeEnv() {
  return process.env.NODE_ENV || 'development';
}

export function getFrontendOrigin() {
  if (!isBlank(process.env.FRONTEND_ORIGIN)) {
    return process.env.FRONTEND_ORIGIN;
  }

  if (currentNodeEnv() === 'development') {
    return DEFAULT_DEVELOPMENT_FRONTEND_ORIGIN;
  }

  return null;
}

export function getCorsOptions() {
  const allowedOrigin = getFrontendOrigin();

  return {
    origin(origin, callback) {
      if (!allowedOrigin) {
        callback(new Error('FRONTEND_ORIGIN is required when NODE_ENV is production.'));
        return;
      }

      if (!origin || origin === allowedOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
  };
}

export function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((key) => isBlank(process.env[key]));

  if (process.env.DB_PASSWORD_REQUIRED === 'true' && isBlank(process.env.DB_PASSWORD)) {
    missing.push('DB_PASSWORD');
  }

  if (currentNodeEnv() !== 'development' && isBlank(process.env.FRONTEND_ORIGIN)) {
    missing.push('FRONTEND_ORIGIN');
  }

  if (missing.length > 0) {
    throw new Error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  }

  const dbPort = Number(process.env.DB_PORT);
  if (!Number.isInteger(dbPort) || dbPort <= 0) {
    throw new Error('[env] DB_PORT must be a positive integer.');
  }
}
