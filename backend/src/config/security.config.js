function parseOptionalBoolean(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!['true', 'false'].includes(normalized)) {
    throw new Error(`${name} must be true or false.`);
  }
  return normalized === 'true';
}

export function getApiDocsConfiguration(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const configuredEnabled = parseOptionalBoolean(env.API_DOCS_ENABLED, 'API_DOCS_ENABLED');
  const enabled = configuredEnabled ?? !isProduction;
  const username = String(env.API_DOCS_USERNAME || '').trim();
  const password = String(env.API_DOCS_PASSWORD || '');

  if (isProduction && enabled && (!username || !password)) {
    throw new Error(
      'Production API documentation requires API_DOCS_USERNAME and API_DOCS_PASSWORD.',
    );
  }
  if (isProduction && enabled && (username.length < 3 || username.length > 100)) {
    throw new Error('API_DOCS_USERNAME must be between 3 and 100 characters.');
  }
  if (isProduction && enabled && password.length < 16) {
    throw new Error('API_DOCS_PASSWORD must be at least 16 characters.');
  }

  return {
    enabled,
    requireAuthentication: isProduction && enabled,
    username: username || null,
    password: password || null,
  };
}

export function getApiContentSecurityPolicy() {
  return {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    connectSrc: ["'none'"],
    fontSrc: ["'none'"],
    formAction: ["'none'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'none'"],
    manifestSrc: ["'none'"],
    mediaSrc: ["'none'"],
    objectSrc: ["'none'"],
    scriptSrc: ["'none'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'none'"],
    workerSrc: ["'none'"],
    upgradeInsecureRequests: null,
  };
}

export function getSwaggerContentSecurityPolicy() {
  return {
    defaultSrc: ["'self'"],
    baseUri: ["'none'"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    formAction: ["'none'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    upgradeInsecureRequests: null,
  };
}
