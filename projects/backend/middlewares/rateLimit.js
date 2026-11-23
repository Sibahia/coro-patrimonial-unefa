import rateLimit from 'express-rate-limit';

const message = {
  ok: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Demasiadas peticiones. Espera unos minutos e inténtalo de nuevo.'
  }
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message
});
