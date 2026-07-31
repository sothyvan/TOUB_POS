const IMAGEKIT_UPLOAD_ORIGIN = 'https://upload.imagekit.io';

function parseOrigin(value) {
  if (!value || value.startsWith('/')) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute URL or an app-relative path.');
  }
}

function toWebSocketOrigin(origin) {
  if (!origin) {
    return null;
  }
  const socketUrl = new URL(origin);
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return socketUrl.origin;
}

function directive(name, values) {
  return `${name} ${[...new Set(values.filter(Boolean))].join(' ')}`;
}

export function buildFrontendContentSecurityPolicy({ apiBaseUrl, isDevelopment = false }) {
  const apiOrigin = parseOrigin(apiBaseUrl);
  const socketOrigin = toWebSocketOrigin(apiOrigin);
  const developmentConnections = isDevelopment
    ? [
        'http://localhost:*',
        'http://127.0.0.1:*',
        'ws://localhost:*',
        'ws://127.0.0.1:*',
      ]
    : [];

  return [
    directive('default-src', ["'self'"]),
    directive('base-uri', ["'self'"]),
    directive('connect-src', [
      "'self'",
      apiOrigin,
      socketOrigin,
      IMAGEKIT_UPLOAD_ORIGIN,
      ...developmentConnections,
    ]),
    directive('font-src', ["'self'", 'data:']),
    directive('form-action', ["'self'"]),
    // Product URLs are owner-managed and historically include external HTTPS seed images.
    directive('img-src', ["'self'", 'data:', 'blob:', 'https:']),
    directive('media-src', ["'none'"]),
    directive('object-src', ["'none'"]),
    directive('script-src', ["'self'"]),
    // Existing React components and SweetAlert use inline style attributes/elements.
    directive('style-src', ["'self'"]),
    directive('style-src-attr', ["'unsafe-inline'"]),
    directive('style-src-elem', ["'self'", "'unsafe-inline'"]),
    directive('worker-src', ["'self'", 'blob:']),
  ].join('; ');
}

export function frontendCspPlugin(options) {
  const policy = buildFrontendContentSecurityPolicy(options);
  return {
    name: 'toub-pos-content-security-policy',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [{
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: policy,
          },
          injectTo: 'head-prepend',
        }];
      },
    },
  };
}

