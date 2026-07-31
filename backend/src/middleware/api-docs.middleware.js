import { timingSafeEqual } from 'node:crypto';

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicCredentials(header) {
  if (!header?.startsWith('Basic ')) {
    return null;
  }
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 1) {
      return null;
    }
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function requireApiDocsAuthentication(configuration) {
  return (req, res, next) => {
    if (!configuration.requireAuthentication) {
      return next();
    }

    const credentials = parseBasicCredentials(req.get('authorization'));
    const authenticated = credentials
      && safeEqual(credentials.username, configuration.username)
      && safeEqual(credentials.password, configuration.password);
    if (authenticated) {
      return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="TouB POS API documentation", charset="UTF-8"');
    res.set('Cache-Control', 'no-store');
    return res.status(401).json({
      success: false,
      code: 'API_DOCS_AUTH_REQUIRED',
      message: 'API documentation authentication is required.',
      request_id: req.requestId,
    });
  };
}

