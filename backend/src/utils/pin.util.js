import bcrypt from 'bcryptjs';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const PIN_PATTERN = /^\d{4}$/;

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function isBcryptHash(value) {
  return BCRYPT_HASH_PATTERN.test(String(value || ''));
}

export function normalizePin(pin) {
  const normalized = String(pin ?? '').trim();
  return normalized || null;
}

export function assertValidPin(pin) {
  const normalized = normalizePin(pin);
  if (!normalized) {
    return null;
  }

  if (!PIN_PATTERN.test(normalized)) {
    throw httpError('PIN must be exactly 4 digits.', 400);
  }

  return normalized;
}

export function hashPin(pin) {
  const normalized = assertValidPin(pin);
  if (!normalized) {
    return null;
  }

  return bcrypt.hash(normalized, 10);
}

export async function verifyPin(pin, storedPin) {
  const normalized = normalizePin(pin);
  const stored = String(storedPin || '');

  if (!normalized || !PIN_PATTERN.test(normalized) || !stored) {
    return { valid: false, needsUpgrade: false };
  }

  if (isBcryptHash(stored)) {
    return {
      valid: await bcrypt.compare(normalized, stored),
      needsUpgrade: false,
    };
  }

  const valid = stored === normalized;
  return { valid, needsUpgrade: valid };
}
