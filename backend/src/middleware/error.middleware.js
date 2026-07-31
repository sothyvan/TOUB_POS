import { writeStructuredLog } from '../utils/logger.util.js';

const INTERNAL_ERROR_MESSAGE = 'Internal server error.';

export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
    ? err.status
    : 500;
  const expose = err.expose === true || (err.expose !== false && status < 500);
  const message = expose && err.message ? err.message : INTERNAL_ERROR_MESSAGE;
  const responseCode = expose ? err.code : 'INTERNAL_SERVER_ERROR';

  writeStructuredLog(status >= 500 ? 'error' : 'warn', 'http_request_failed', {
    request_id: req.requestId,
    method: req.method,
    path: req.path,
    status_code: status,
    actor_id: req.user?.id,
    actor_role: req.user?.role,
    error: {
      name: err.name,
      code: err.code,
      message: err.message,
      stack: err.stack,
    },
    request: {
      query: req.query,
      params: req.params,
      body: req.body,
    },
  });

  res.status(status).json({
    success: false,
    ...(responseCode ? { code: responseCode } : {}),
    message,
    request_id: req.requestId,
  });
}
