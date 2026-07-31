const ERROR_ID_PREFIX = 'ERR';
const MAX_COMPONENTS = 12;
const KNOWN_ROUTES = new Set(['/', '/login', '/cashier', '/owner-portal']);
const ERROR_ID_PATTERN = /^ERR-(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{24}|unavailable)$/i;

export function createFrontendErrorId(cryptoApi = globalThis.crypto) {
  if (cryptoApi?.randomUUID) {
    return `${ERROR_ID_PREFIX}-${cryptoApi.randomUUID()}`;
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(12);
    cryptoApi.getRandomValues(bytes);
    const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${ERROR_ID_PREFIX}-${value}`;
  }

  return `${ERROR_ID_PREFIX}-unavailable`;
}

export function sanitizeFrontendPath(value) {
  const pathname = String(value || '/').split(/[?#]/, 1)[0];
  return KNOWN_ROUTES.has(pathname) ? pathname : '/_unknown';
}

export function sanitizeComponentStack(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.match(/^\s*at\s+([A-Za-z0-9_.$-]+)/)?.[1] || '')
    .filter(Boolean)
    .slice(0, MAX_COMPONENTS);
}

export function createFrontendErrorReport({ errorId, pathname, componentStack }) {
  const candidateErrorId = String(errorId || `${ERROR_ID_PREFIX}-unavailable`);
  const safeErrorId = ERROR_ID_PATTERN.test(candidateErrorId)
    ? candidateErrorId
    : `${ERROR_ID_PREFIX}-unavailable`;

  return {
    event: 'frontend_render_error',
    error_id: safeErrorId,
    route: sanitizeFrontendPath(pathname),
    components: sanitizeComponentStack(componentStack),
  };
}

export function reportFrontendRenderError(report, logger = globalThis.console) {
  try {
    logger.error(JSON.stringify(report));
  } catch {
    // The recovery screen must remain usable even when diagnostics are unavailable.
  }
}
