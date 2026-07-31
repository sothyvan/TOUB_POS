import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';
import { getRateLimitConfiguration } from '../config/rate-limit.config.js';
import { httpError } from '../utils/http-error.util.js';

let redisClient = null;
let rateLimitConfiguration = null;

function writeStoreEvent(event, error) {
  process.stderr.write(`${JSON.stringify({
    level: 'error',
    event,
    code: error?.code || 'REDIS_ERROR',
  })}\n`);
}

export async function initializeRateLimitStore() {
  if (redisClient?.isReady) {
    return { shared: true };
  }
  rateLimitConfiguration = getRateLimitConfiguration();
  if (!rateLimitConfiguration.redisUrl) {
    return { shared: false };
  }

  redisClient = createClient({
    url: rateLimitConfiguration.redisUrl,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy(retries) {
        return Math.min(100 * (retries + 1), 2000);
      },
    },
  });
  redisClient.on('error', (error) => writeStoreEvent('rate_limit_store_error', error));
  await redisClient.connect();
  await redisClient.ping();
  return { shared: true };
}

export function createRedisRateLimitStore({ client, prefix }) {
  return new RedisStore({
    async sendCommand(...args) {
      try {
        return await client.sendCommand(args);
      } catch {
        throw httpError(
          'Authentication protection is temporarily unavailable.',
          503,
          'RATE_LIMIT_STORE_UNAVAILABLE',
        );
      }
    },
    prefix,
  });
}

export function getRateLimitStore(limiterName) {
  const configuration = rateLimitConfiguration || getRateLimitConfiguration();
  if (!configuration.redisUrl) {
    return undefined;
  }
  if (!redisClient?.isReady) {
    throw new Error('Shared rate-limit store was not initialized before the API routes loaded.');
  }
  return createRedisRateLimitStore({
    client: redisClient,
    prefix: `${configuration.redisPrefix}:${limiterName}:`,
  });
}

export async function closeRateLimitStore() {
  const client = redisClient;
  redisClient = null;
  rateLimitConfiguration = null;

  if (!client?.isOpen) {
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    writeStoreEvent('rate_limit_store_close_error', error);
    client.destroy?.();
  }
}
