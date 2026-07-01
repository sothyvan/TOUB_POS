import rateLimit from 'express-rate-limit';

function rateLimitHandler(message) {
  return (_req, res) => {
    res.status(429).json({ success: false, message });
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many login attempts. Please try again later.'),
});

export const pinLoginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many PIN attempts. Please wait a few minutes and try again.'),
});
