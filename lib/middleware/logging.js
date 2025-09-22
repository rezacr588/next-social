// Logging middleware and utilities
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    });
  }

  writeLog(level, message, meta = {}) {
    if (LOG_LEVELS[level] > this.level) return;

    const logMessage = this.formatMessage(level, message, meta);
    
    // Console output
    console.log(logMessage);

    // File output
    const fileName = `${new Date().toISOString().split('T')[0]}.log`;
    const filePath = path.join(LOG_DIR, fileName);
    
    fs.appendFileSync(filePath, logMessage + '\n');
  }

  error(message, meta = {}) {
    this.writeLog('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.writeLog('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.writeLog('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.writeLog('DEBUG', message, meta);
  }
}

const logger = new Logger(process.env.LOG_LEVEL || 'INFO');

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;

  logger.info('Request started', {
    method,
    url,
    ip,
    userAgent: req.get('User-Agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    logger.info('Request completed', {
      method,
      url,
      ip,
      statusCode,
      duration,
    });
  });

  next();
};

// Audit logging for sensitive operations
export const auditLogger = (action, userId = null, details = {}) => {
  logger.info('Audit event', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

export { logger };