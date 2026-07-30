const DEFAULT_DEV_PLATFORM_ADMIN = {
  username: 'platform_admin',
  password: 'platform123',
  role: 'platform_admin',
};

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function isConfiguredValue(value) {
  const normalized = String(value || '').trim();
  return Boolean(normalized)
    && !normalized.startsWith('your_')
    && !normalized.startsWith('replace_')
    && !normalized.startsWith('change_');
}

function requireEnv(name, errors) {
  if (isBlank(process.env[name])) {
    errors.push(`${name} is required.`);
  }
}

function validateBooleanEnv(name, errors) {
  if (isBlank(process.env[name])) {
    return;
  }

  const normalized = String(process.env[name]).trim().toLowerCase();
  if (!['true', 'false'].includes(normalized)) {
    errors.push(`${name} must be true or false.`);
  }
}

export function isKhqrEnabled() {
  return String(process.env.KHQR_ENABLED || '').trim().toLowerCase() === 'true';
}

function applyDevelopmentPlatformAdminDefaults() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  process.env.PLATFORM_ADMIN_USERNAME ||= DEFAULT_DEV_PLATFORM_ADMIN.username;
  process.env.PLATFORM_ADMIN_PASSWORD ||= DEFAULT_DEV_PLATFORM_ADMIN.password;
  process.env.PLATFORM_ADMIN_ROLE ||= DEFAULT_DEV_PLATFORM_ADMIN.role;
}

export function getPlatformAdminSeedConfig() {
  return {
    username: process.env.PLATFORM_ADMIN_USERNAME,
    password: process.env.PLATFORM_ADMIN_PASSWORD,
    role: process.env.PLATFORM_ADMIN_ROLE,
  };
}

export function validateEnvironment() {
  const errors = [];
  const isProduction = process.env.NODE_ENV === 'production';

  applyDevelopmentPlatformAdminDefaults();

  requireEnv('JWT_SECRET', errors);
  requireEnv('DB_HOST', errors);
  requireEnv('DB_PORT', errors);
  requireEnv('DB_USER', errors);
  requireEnv('DB_NAME', errors);

  if (process.env.DB_PASSWORD_REQUIRED === 'true') {
    requireEnv('DB_PASSWORD', errors);
  }

  validateBooleanEnv('KHQR_ENABLED', errors);
  validateBooleanEnv('KHQR_BACKGROUND_CHECK_ENABLED', errors);

  if (isConfiguredValue(process.env.TELEGRAM_BOT_TOKEN)) {
    requireEnv('TELEGRAM_WEBHOOK_SECRET', errors);
  }

  const dbPort = Number(process.env.DB_PORT);
  if (!isBlank(process.env.DB_PORT) && (!Number.isInteger(dbPort) || dbPort <= 0)) {
    errors.push('DB_PORT must be a positive integer.');
  }

  if (!isBlank(process.env.REPORT_TIMEZONE_OFFSET)) {
    const timezoneMatch = String(process.env.REPORT_TIMEZONE_OFFSET).match(/^([+-])(\d{2}):(\d{2})$/);
    const timezoneHours = timezoneMatch ? Number(timezoneMatch[2]) : null;
    const timezoneMinutes = timezoneMatch ? Number(timezoneMatch[3]) : null;
    if (
      !timezoneMatch
      || timezoneHours > 14
      || timezoneMinutes > 59
      || (timezoneHours === 14 && timezoneMinutes !== 0)
    ) {
      errors.push('REPORT_TIMEZONE_OFFSET must use +HH:MM or -HH:MM and be between -14:00 and +14:00.');
    }
  }

  if (isProduction) {
    requireEnv('FRONTEND_ORIGIN', errors);
  }

  if (!isProduction) {
    requireEnv('PLATFORM_ADMIN_USERNAME', errors);
    requireEnv('PLATFORM_ADMIN_PASSWORD', errors);
    requireEnv('PLATFORM_ADMIN_ROLE', errors);

    if (!isBlank(process.env.PLATFORM_ADMIN_ROLE) && process.env.PLATFORM_ADMIN_ROLE !== 'platform_admin') {
      errors.push('PLATFORM_ADMIN_ROLE must be platform_admin.');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid backend environment:\n- ${errors.join('\n- ')}`);
  }
}
