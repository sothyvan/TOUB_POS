/**
 * Global error handler — must be registered LAST in app.js.
 * Catches any error passed via next(err).
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error.';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[error]', err);
  }

  res.status(status).json({ success: false, message });
}
