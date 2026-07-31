const DEFAULT_REDIS_PREFIX = 'toub-pos';
const MAX_TRUST_PROXY_HOPS = 10;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

export function parseTrustProxyHops(value, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new Error('TRUST_PROXY_HOPS is required in production.');
    }
    return 0;
  }

  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0 || hops > MAX_TRUST_PROXY_HOPS) {
    throw new Error(
      `TRUST_PROXY_HOPS must be an integer from 0 to ${MAX_TRUST_PROXY_HOPS}.`,
    );
  }
  return hops;
}

export function parseRateLimitRedisUrl(value, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new Error('RATE_LIMIT_REDIS_URL is required in production.');
    }
    return null;
  }

  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch {
    throw new Error('RATE_LIMIT_REDIS_URL must be a valid redis:// or rediss:// URL.');
  }
  if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
    throw new Error('RATE_LIMIT_REDIS_URL must use redis:// or rediss://.');
  }
  return parsed.toString();
}

export function parseRateLimitRedisPrefix(value, nodeEnv = 'development') {
  const fallback = `${DEFAULT_REDIS_PREFIX}:${nodeEnv}`;
  const prefix = isBlank(value) ? fallback : String(value).trim();
  if (!/^[A-Za-z0-9:_-]{1,64}$/.test(prefix)) {
    throw new Error(
      'RATE_LIMIT_REDIS_PREFIX must be 1-64 characters using letters, numbers, colon, underscore, or hyphen.',
    );
  }
  return prefix;
}

export function getRateLimitConfiguration(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  return {
    trustProxyHops: parseTrustProxyHops(env.TRUST_PROXY_HOPS, { required: isProduction }),
    redisUrl: parseRateLimitRedisUrl(env.RATE_LIMIT_REDIS_URL, { required: isProduction }),
    redisPrefix: parseRateLimitRedisPrefix(env.RATE_LIMIT_REDIS_PREFIX, env.NODE_ENV),
  };
}
