import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRateLimitConfiguration,
  parseRateLimitRedisPrefix,
  parseRateLimitRedisUrl,
  parseTrustProxyHops,
} from '../src/config/rate-limit.config.js';

test('development defaults to direct client IPs and process-local counters', () => {
  assert.deepEqual(getRateLimitConfiguration({ NODE_ENV: 'development' }), {
    trustProxyHops: 0,
    redisUrl: null,
    redisPrefix: 'toub-pos:development',
  });
});

test('production requires an explicit proxy hop count and shared Redis URL', () => {
  assert.throws(
    () => getRateLimitConfiguration({ NODE_ENV: 'production' }),
    /TRUST_PROXY_HOPS is required/,
  );
  assert.throws(
    () => getRateLimitConfiguration({
      NODE_ENV: 'production',
      TRUST_PROXY_HOPS: '1',
    }),
    /RATE_LIMIT_REDIS_URL is required/,
  );

  assert.deepEqual(getRateLimitConfiguration({
    NODE_ENV: 'production',
    TRUST_PROXY_HOPS: '1',
    RATE_LIMIT_REDIS_URL: 'rediss://user:password@example.com:6379',
    RATE_LIMIT_REDIS_PREFIX: 'toub-pos:production',
  }), {
    trustProxyHops: 1,
    redisUrl: 'rediss://user:password@example.com:6379',
    redisPrefix: 'toub-pos:production',
  });
});

test('proxy, Redis URL, and namespace parsing reject ambiguous deployment values', () => {
  assert.equal(parseTrustProxyHops('0'), 0);
  assert.equal(parseTrustProxyHops('2'), 2);
  assert.throws(() => parseTrustProxyHops('true'), /integer from 0 to 10/);
  assert.throws(() => parseTrustProxyHops('11'), /integer from 0 to 10/);
  assert.equal(parseRateLimitRedisUrl('redis://localhost:6379'), 'redis://localhost:6379');
  assert.throws(() => parseRateLimitRedisUrl('https://example.com'), /redis:\/\/ or rediss:\/\//);
  assert.equal(parseRateLimitRedisPrefix('', 'test'), 'toub-pos:test');
  assert.throws(() => parseRateLimitRedisPrefix('invalid prefix'), /1-64 characters/);
});
