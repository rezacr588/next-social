// Rate limiting middleware
const requestCounts = new Map();
const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100;

export const rateLimit = (options = {}) => {
  const {
    windowMs = WINDOW_SIZE,
    max = MAX_REQUESTS_PER_WINDOW,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [ip, requests] of requestCounts.entries()) {
      const filteredRequests = requests.filter(time => time > windowStart);
      if (filteredRequests.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, filteredRequests);
      }
    }

    // Get current requests for this IP
    const currentRequests = requestCounts.get(key) || [];
    const recentRequests = currentRequests.filter(time => time > windowStart);

    if (recentRequests.length >= max) {
      return res.status(statusCode).json({ error: message });
    }

    // Add current request
    recentRequests.push(now);
    requestCounts.set(key, recentRequests);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - recentRequests.length));
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs));

    next();
  };
};

// Specific rate limits for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded, please try again later.',
});