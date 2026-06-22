/**
 * Request logging middleware that prints HTTP requests with sanitized payload bodies.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Clone req.body and mask sensitive fields
  let sanitizedBody = null;
  if (req.body && Object.keys(req.body).length > 0) {
    sanitizedBody = { ...req.body };
    const sensitiveKeys = ['password', 'pin', 'token', 'device_token', 'password_hash'];
    for (const key of sensitiveKeys) {
      if (key in sanitizedBody) {
        sanitizedBody[key] = '********';
      }
    }
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
