import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { getRateLimitStore } from '../services/rate-limit-store.service.js';

function hashSubject(value) {
  return createHash('sha256')
    .update(String(value || '').trim().toLowerCase())
    .digest('hex');
}

function rateLimitHandler(limiter, message) {
  return (req, res) => {
    process.stderr.write(`${JSON.stringify({
      level: 'warn',
      event: 'authentication_rate_limited',
      limiter,
      method: req.method,
      path: req.originalUrl,
    })}\n`);
    res.status(429).json({ success: false, code: 'RATE_LIMITED', message });
  };
}

function store(name) {
  const sharedStore = getRateLimitStore(name);
  return sharedStore ? { store: sharedStore } : {};
}

export const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute temporary
  max: 8,
  keyGenerator: (req) => (
    `${ipKeyGenerator(req.ip)}:${hashSubject(req.body?.username)}`
  ),
  ...store('password-account'),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  handler: rateLimitHandler(
    'password-account',
    'Too many login attempts. Please try again in 1 minute.',
  ),
});

export const pinLoginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute temporary
  max: 5,
  keyGenerator: (req) => (
    `${ipKeyGenerator(req.ip)}:${hashSubject(req.body?.userId)}`
  ),
  ...store('pin-account'),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  handler: rateLimitHandler(
    'pin-account',
    'Too many PIN attempts. Please wait 1 minute and try again.',
  ),
});

export const authIpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  ...store('auth-ip'),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  handler: rateLimitHandler(
    'auth-ip',
    'Too many authentication requests. Please wait 1 minute and try again.',
  ),
});

export const refreshRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  ...store('refresh-ip'),
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  handler: rateLimitHandler(
    'refresh-ip',
    'Too many session refresh attempts. Please try again shortly.',
  ),
});
