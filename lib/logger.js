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

const logger = new Logger();

module.exports = { logger };
