const REDACTED = '********';
const MAX_LOG_STRING_LENGTH = 4000;
const SENSITIVE_KEY_PARTS = [
  'authorization',
  'cookie',
  'credential',
  'csrf',
  'password',
  'pin',
  'secret',
  'session',
  'token',
];

function isSensitiveKey(key) {
  const normalizedKey = String(key || '').toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

function redactString(value) {
  const redacted = value
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, `$1 ${REDACTED}`)
    .replace(
      /\b(password|pin|token|authorization|secret|cookie|csrf(?:[_-]?token)?|session(?:[_-]?id)?)\b\s*[:=]\s*([^\s,;&]+)/gi,
      `$1=${REDACTED}`,
    )
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, `$1${REDACTED}@`);

  if (redacted.length <= MAX_LOG_STRING_LENGTH) {
    return redacted;
  }
  return `${redacted.slice(0, MAX_LOG_STRING_LENGTH)}...[truncated]`;
}

export function redactForLog(value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item, seen));
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[circular]';
    }
    seen.add(value);
    const redacted = Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [
        key,
        isSensitiveKey(key) ? REDACTED : redactForLog(childValue, seen),
      ]),
    );
    seen.delete(value);
    return redacted;
  }
  return value;
}

export function writeStructuredLog(level, event, details = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactForLog(details),
  };
  const line = JSON.stringify(record);

  if (level === 'error') {
    process.stderr.write(`${line}\n`);
    return record;
  }
  process.stdout.write(`${line}\n`);
  return record;
}
