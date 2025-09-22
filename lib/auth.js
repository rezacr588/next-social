const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { AuthenticationError, ValidationError } = require('./errors.js');
const { logger } = require('./logger.js');
const { memoize, retry, isEmail, isUUID } = require('./utils/index.js');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// In-memory storage for demo (use Redis in production)
const refreshTokens = new Set();
const blacklistedTokens = new Set();

// Advanced token generation with multiple algorithms
const generateToken = (payload, options = {}) => {
  const defaultOptions = {
    algorithm: 'HS512',
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'nexus-social',
    audience: 'nexus-users',
    jwtid: crypto.randomUUID()
  };

  const finalOptions = { ...defaultOptions, ...options };

  return jwt.sign(payload, JWT_SECRET, finalOptions);
};

const generateRefreshToken = (payload, options = {}) => {
  const token = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    {
      algorithm: 'HS512',
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'nexus-social',
      audience: 'nexus-users',
      jwtid: crypto.randomUUID(),
      ...options
    }
  );

  refreshTokens.add(token);
  return token;
};

// Advanced token verification with multiple validation layers
const verifyToken = (token, options = {}) => {
  try {
    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
      throw new AuthenticationError('Token has been revoked');
    }

    const defaultOptions = {
      algorithms: ['HS512'],
      issuer: 'nexus-social',
      audience: 'nexus-users'
    };

    const finalOptions = { ...defaultOptions, ...options };
    const decoded = jwt.verify(token, JWT_SECRET, finalOptions);

    // Additional security checks
    if (!decoded.iat) {
      throw new AuthenticationError('Token missing issued at timestamp');
    }

    return decoded;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    }

    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token format');
    }

    throw new AuthenticationError('Token verification failed');
  }
};

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ['HS512'],
      issuer: 'nexus-social',
      audience: 'nexus-users'
    });

    if (!refreshTokens.has(token)) {
      throw new AuthenticationError('Invalid refresh token');
    }

    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
};

// Advanced password hashing with modern techniques
const hashPassword = async (password, options = {}) => {
  const saltRounds = 12;

  // Add pepper for additional security
  const pepper = process.env.PASSWORD_PEPPER || 'default-pepper';
  const pepperedPassword = password + pepper;

  return await bcrypt.hash(pepperedPassword, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  // Add pepper for additional security
  const pepper = process.env.PASSWORD_PEPPER || 'default-pepper';
  const pepperedPassword = password + pepper;

  return await bcrypt.compare(pepperedPassword, hashedPassword);
};

// Advanced token management
const revokeToken = (token) => {
  blacklistedTokens.add(token);
};

const revokeRefreshToken = (token) => {
  refreshTokens.delete(token);
};

// Advanced token refresh with rotation
const refreshAccessToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AuthenticationError('Refresh token required'));
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new token pair with rotation
    const newAccessToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    });

    const newRefreshToken = generateRefreshToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    });

    // Revoke old refresh token
    revokeRefreshToken(refreshToken);

    logger.info('Token refreshed successfully with rotation', {
      userId: decoded.id,
      newTokenId: jwt.decode(newAccessToken).jti
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    next(error);
  }
};

// Advanced authentication middleware with modern patterns
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new AuthenticationError('Access token required'));
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

// Advanced role-based access control
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthenticationError('Insufficient permissions'));
    }

    next();
  };
};

// Advanced permission-based access control
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Check if user has the required permission
    // This would typically come from a permissions database
    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(permission)) {
      return next(new AuthenticationError('Insufficient permissions'));
    }

    next();
  };
};

// Advanced password validation with modern patterns
const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Advanced checks
  const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  // Check for sequential characters
  const hasSequential = /(?=.*012|.*123|.*234|.*345|.*456|.*567|.*678|.*789|.*890)/.test(password);
  if (hasSequential) {
    errors.push('Password must not contain sequential numbers');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Password strength calculator
const calculatePasswordStrength = (password) => {
  let strength = 0;

  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  if (password.length >= 16) strength += 1;

  return Math.min(strength, 7); // Max strength of 7
};

// Advanced email validation
const validateEmailAdvanced = (email) => {
  if (!isEmail(email)) {
    return { isValid: false, errors: ['Invalid email format'] };
  }

  const errors = [];

  // Check for disposable email domains
  const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
  const domain = email.split('@')[1].toLowerCase();

  if (disposableDomains.includes(domain)) {
    errors.push('Disposable email addresses are not allowed');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\+.*\+/, // Multiple plus signs
    /test|demo/i, // Test/demo in email
    /admin|root/i // Admin/root in email
  ];

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(email)) {
      errors.push('Email contains suspicious patterns');
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Advanced session management
const generateSecureSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

const validateSession = (sessionId) => {
  return isUUID(sessionId) || /^[a-f0-9]{64}$/.test(sessionId);
};

// Rate limiting for authentication attempts
const authRateLimit = new Map();

const checkRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!authRateLimit.has(identifier)) {
    authRateLimit.set(identifier, []);
  }

  const attempts = authRateLimit.get(identifier);
  const recentAttempts = attempts.filter(time => time > windowStart);

  if (recentAttempts.length >= maxAttempts) {
    return false;
  }

  recentAttempts.push(now);
  authRateLimit.set(identifier, recentAttempts);

  return true;
};

// Advanced user agent analysis
const analyzeUserAgent = (userAgent) => {
  const patterns = {
    mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    tablet: /iPad|Android(?=.*Mobile)|Tablet/i,
    desktop: /Windows NT|Mac OS X|Linux/i,
    bot: /bot|crawler|spider|scraper/i
  };

  return Object.entries(patterns).find(([_, pattern]) => pattern.test(userAgent))?.[0] || 'unknown';
};

// Advanced IP analysis for security
const analyzeIP = (ip) => {
  // This would typically integrate with IP geolocation and threat intelligence services
  return {
    isPrivate: /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip),
    isLocalhost: ip === '127.0.0.1' || ip === '::1',
    region: 'unknown', // Would come from geolocation service
    riskScore: 0 // Would come from threat intelligence
  };
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  revokeRefreshToken,
  authenticateToken,
  refreshAccessToken,
  validatePassword,
  validateEmail,
  requireRole,
  requirePermission,
  validatePasswordStrength,
  calculatePasswordStrength,
  validateEmailAdvanced,
  generateSecureSessionId,
  validateSession,
  checkRateLimit,
  analyzeUserAgent,
  analyzeIP
};
