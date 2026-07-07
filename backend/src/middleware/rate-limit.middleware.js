import rateLimit from 'express-rate-limit';

function rateLimitHandler(message) {
  return (_req, res) => {
    res.status(429).json({ success: false, message });
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute temporary
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many login attempts. Please try again in 1 minute.'),
});

export const pinLoginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute temporary
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many PIN attempts. Please wait 1 minute and try again.'),
});
