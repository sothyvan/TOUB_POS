/**
 * Request logging middleware that prints HTTP requests with sanitized payload bodies.
 */
const SENSITIVE_KEY_PARTS = ['password', 'pin', 'token', 'authorization', 'secret'];

function isSensitiveKey(key) {
  const normalizedKey = String(key || '').toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

function sanitizeForLog(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [
        key,
        isSensitiveKey(key) ? '********' : sanitizeForLog(childValue),
      ])
    );
  }

  return value;
}

export function requestLogger(req, res, next) {
  const start = Date.now();

  let sanitizedBody = null;
  if (req.body && Object.keys(req.body).length > 0) {
    sanitizedBody = sanitizeForLog(req.body);
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [http] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`;
    if (sanitizedBody) {
      console.log(`${logMsg} - Body: ${JSON.stringify(sanitizedBody)}`);
    } else {
      console.log(logMsg);
    }
  });

  next();
}
export default requestLogger;
