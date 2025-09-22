// lib/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, true, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, true);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, true);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, true);
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError) {
    super(message, 500, false);
    this.originalError = originalError;
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError
};

// lib/logger.js
class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.currentLevel = process.env.LOG_LEVEL || 'info';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;

    return {
      timestamp,
      level,
      message,
      pid,
      ...meta
    };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.currentLevel];
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatMessage(level, message, meta);

    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry, null, 2));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry, null, 2));
        break;
      case 'info':
        console.info(JSON.stringify(logEntry, null, 2));
        break;
      case 'debug':
        console.debug(JSON.stringify(logEntry, null, 2));
        break;
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Performance logging
  performance(operation, duration, meta = {}) {
    this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...meta
    });
  }

  // Request logging
  request(req, res, duration) {
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.log(level, `${req.method} ${req.url}`, {
      statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress
    });
  }
}

export const logger = new Logger();

// lib/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${err.name}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ValidationError(message, { field: Object.keys(err.keyValue)[0] });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      details: error.details || {}
    }
  });
};

// lib/middleware/requestLogger.js
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });

  next();
};

// lib/middleware/asyncHandler.js
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// lib/middleware/validation.js
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ValidationError('Validation failed', { errors }));
    }

    req.body = value;
    next();
  };
};

// lib/middleware/security.js
export const securityHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

// components/ErrorBoundary.js
import React from 'react';
import { logger } from '../lib/logger.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React Error Boundary caught an error', {
      error: error.toString(),
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-gray-400">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-800 p-4 rounded overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
