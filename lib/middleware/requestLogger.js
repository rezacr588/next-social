// lib/middleware/requestLogger.js
import { logger } from '../logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });

  next();
};
