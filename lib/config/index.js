// lib/config/index.js
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || './nexus_social.db',
    type: process.env.DATABASE_TYPE || 'sqlite',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    migrations: {
      tableName: 'migrations',
      directory: process.env.MIGRATIONS_DIR || './migrations'
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // File upload configuration
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './temp'
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@nexus.com'
  },

  // Social login configuration
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET
    }
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000, // 15 minutes
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000']
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '5'
  },

  // Features
  features: {
    registration: process.env.FEATURE_REGISTRATION !== 'false',
    socialLogin: process.env.FEATURE_SOCIAL_LOGIN === 'true',
    fileUpload: process.env.FEATURE_FILE_UPLOAD !== 'false',
    comments: process.env.FEATURE_COMMENTS !== 'false',
    notifications: process.env.FEATURE_NOTIFICATIONS !== 'false',
    analytics: process.env.FEATURE_ANALYTICS === 'true'
  },

  // API
  api: {
    prefix: '/api',
    version: 'v1',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100
  },

  // Cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600 // 10 minutes
  },

  // Pagination
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT) || 100
  },

  // Validation
  validation: {
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false'
    },
    username: {
      minLength: parseInt(process.env.USERNAME_MIN_LENGTH) || 3,
      maxLength: parseInt(process.env.USERNAME_MAX_LENGTH) || 30,
      allowedChars: process.env.USERNAME_ALLOWED_CHARS || 'a-zA-Z0-9_-'
    }
  },

  // Third-party services
  services: {
    s3: {
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET
    },
    cloudfront: {
      domain: process.env.CLOUDFRONT_DOMAIN,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY
    },
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
  }
};

// Validate critical configuration
const validateConfig = () => {
  const errors = [];

  if (!config.jwt.secret || config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (config.env === 'production' && config.server.corsOrigin === '*') {
    errors.push('CORS_ORIGIN should not be "*" in production');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    process.exit(1);
  }
};

// Validate configuration on startup
if (config.env === 'production') {
  validateConfig();
}

export default config;
export { validateConfig };
