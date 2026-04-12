import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints (signup, login).
 * Limits to 10 requests per 3 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'rate_limit_exceeded',
    message: 'Too many requests, please try again later.',
    data: null,
  },
});

/**
 * General API rate limiter for all authenticated/public endpoints.
 * Limits to 200 requests per 3 seconds per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 3 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'rate_limit_exceeded',
    message: 'Too many requests, please try again later.',
    data: null,
  },
});
