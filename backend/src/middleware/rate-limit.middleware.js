import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function rateLimitHandler(message) {
  return (_req, res) => {
    res.status(429).json({ success: false, message });
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute temporary
  max: 8,
  keyGenerator: (req) => (
    `${ipKeyGenerator(req.ip)}:${String(req.body?.username || '').trim().toLowerCase()}`
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many login attempts. Please try again in 1 minute.'),
});

export const pinLoginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute temporary
  max: 5,
  keyGenerator: (req) => (
    `${ipKeyGenerator(req.ip)}:${String(req.body?.userId || '').trim()}`
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many PIN attempts. Please wait 1 minute and try again.'),
});

export const authIpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication requests. Please wait 1 minute and try again.'),
});

export const refreshRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many session refresh attempts. Please try again shortly.'),
});
