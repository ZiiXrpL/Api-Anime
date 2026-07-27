import rateLimit from 'express-rate-limit';
import { env } from '../configs/env';

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: false,
    message: 'Terlalu banyak request, silakan coba lagi beberapa saat lagi.',
    source: 'None',
  },
});
