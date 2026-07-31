import { randomUUID } from 'node:crypto';
import { redactForLog, writeStructuredLog } from '../utils/logger.util.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function requestContext(req, res, next) {
  const suppliedRequestId = req.get('x-request-id');
  req.requestId = REQUEST_ID_PATTERN.test(suppliedRequestId || '')
    ? suppliedRequestId
    : randomUUID();
  res.set('X-Request-ID', req.requestId);
  next();
}

export function requestLogger(req, res, next) {
  const start = Date.now();

  let sanitizedBody;
  if (req.body && Object.keys(req.body).length > 0) {
    sanitizedBody = redactForLog(req.body);
  }

  res.on('finish', () => {
    writeStructuredLog('info', 'http_request_completed', {
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      status_code: res.statusCode,
      duration_ms: Date.now() - start,
      client_ip: req.ip,
      actor_id: req.user?.id,
      actor_role: req.user?.role,
      ...(sanitizedBody ? { body: sanitizedBody } : {}),
    });
  });

  next();
}
export default requestLogger;
