// lib/cache/redis.js - Advanced Redis Caching Layer
const redis = require('redis');
const { logger } = require('../logger.js');
const { retry, measurePerformance } = require('../utils/index.js');

class RedisCacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.cachePrefix = 'nexus:';
    this.defaultTTL = 3600; // 1 hour
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      connections: 0
    };

    this.initializeClient();
    this.setupEventHandlers();
  }

  initializeClient() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused', { error: options.error });
            return new Error('Redis server connection failed');
          }

          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }

          if (options.attempt > 10) {
            logger.error('Redis retry attempts exhausted');
            return new Error('Retry attempts exhausted');
          }

          return Math.min(options.attempt * 100, 3000);
        },
        connect_timeout: 10000,
        command_timeout: 5000,
        lazy_connect: true
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error', { error: error.message });
        this.stats.errors++;
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
        this.stats.connections++;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting');
      });

      this.client.on('end', () => {
        logger.info('Redis client connection ended');
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('Failed to initialize Redis client', { error });
    }
  }

  setupEventHandlers() {
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.close();
      process.exit(0);
    });
  }

  async connect() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      await this.client.connect();
      logger.info('Redis cache manager connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        logger.info('Redis cache manager closed successfully');
      } catch (error) {
        logger.error('Error closing Redis connection', { error });
      }
    }
  }

  // Advanced caching methods
  async set(key, value, ttl = this.defaultTTL, options = {}) {
    return await measurePerformance('RedisCache.set', async () => {
      try {
        const cacheKey = this.getCacheKey(key);
        const serializedValue = JSON.stringify(value);

        if (ttl > 0) {
          await this.client.setEx(cacheKey, ttl, serializedValue);
        } else {
          await this.client.set(cacheKey, serializedValue);
        }

        this.stats.sets++;
        logger.debug('Cache set', { key: cacheKey, ttl });

        // Set expiration for cache metadata
        if (options.tags) {
          await this.setCacheTags(cacheKey, options.tags, ttl);
        }

        return true;
      } catch (error) {
        this.stats.errors++;
        logger.error('Cache set error', { error, key });
        throw error;
      }
    });
  }

  async get(key, defaultValue = null) {
    return await measurePerformance('RedisCache.get', async () => {
      try {
        const cacheKey = this.getCacheKey(key);
        const value = await this.client.get(cacheKey);

        if (value) {
          this.stats.hits++;
          logger.debug('Cache hit', { key: cacheKey });
          return JSON.parse(value);
        } else {
          this.stats.misses++;
          logger.debug('Cache miss', { key: cacheKey });
          return defaultValue;
        }
      } catch (error) {
        this.stats.errors++;
        logger.error('Cache get error', { error, key });
        return defaultValue;
      }
    });
  }

  async delete(key) {
    return await measurePerformance('RedisCache.delete', async () => {
      try {
        const cacheKey = this.getCacheKey(key);
        const result = await this.client.del(cacheKey);

        if (result > 0) {
          this.stats.deletes++;
          logger.debug('Cache delete', { key: cacheKey });
          return true;
        }

        return false;
      } catch (error) {
        this.stats.errors++;
        logger.error('Cache delete error', { error, key });
        throw error;
      }
    });
  }

  async deletePattern(pattern) {
    return await measurePerformance('RedisCache.deletePattern', async () => {
      try {
        const cachePattern = this.getCacheKey(pattern);
        const keys = await this.client.keys(cachePattern);

        if (keys.length > 0) {
          await this.client.del(keys);
          this.stats.deletes += keys.length;
          logger.debug('Cache pattern delete', { pattern: cachePattern, count: keys.length });
          return keys.length;
        }

        return 0;
      } catch (error) {
        this.stats.errors++;
        logger.error('Cache pattern delete error', { error, pattern });
        throw error;
      }
    });
  }

  async exists(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      return await this.client.exists(cacheKey) === 1;
    } catch (error) {
      logger.error('Cache exists error', { error, key });
      return false;
    }
  }

  async ttl(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      logger.error('Cache TTL error', { error, key });
      return -1;
    }
  }

  async expire(key, ttl) {
    try {
      const cacheKey = this.getCacheKey(key);
      return await this.client.expire(cacheKey, ttl);
    } catch (error) {
      logger.error('Cache expire error', { error, key, ttl });
      return false;
    }
  }

  // Advanced caching patterns
  async getOrSet(key, factory, ttl = this.defaultTTL, options = {}) {
    return await measurePerformance('RedisCache.getOrSet', async () => {
      let value = await this.get(key);

      if (value === null) {
        logger.debug('Cache miss, computing value', { key });

        try {
          value = await factory();
          await this.set(key, value, ttl, options);
        } catch (error) {
          logger.error('Factory function error in getOrSet', { error, key });
          throw error;
        }
      }

      return value;
    });
  }

  async mget(keys) {
    return await measurePerformance('RedisCache.mget', async () => {
      try {
        const cacheKeys = keys.map(key => this.getCacheKey(key));
        const values = await this.client.mget(cacheKeys);

        const result = {};
        keys.forEach((key, index) => {
          if (values[index]) {
            result[key] = JSON.parse(values[index]);
            this.stats.hits++;
          } else {
            this.stats.misses++;
          }
        });

        logger.debug('Multi-get operation', {
          keys: keys.length,
          hits: Object.keys(result).length,
          misses: keys.length - Object.keys(result).length
        });

        return result;
      } catch (error) {
        this.stats.errors++;
        logger.error('Multi-get error', { error, keys });
        return {};
      }
    });
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    return await measurePerformance('RedisCache.mset', async () => {
      try {
        const pipeline = this.client.multi();

        Object.entries(keyValuePairs).forEach(([key, value]) => {
          const cacheKey = this.getCacheKey(key);
          pipeline.setEx(cacheKey, ttl, JSON.stringify(value));
        });

        await pipeline.exec();
        this.stats.sets += Object.keys(keyValuePairs).length;

        logger.debug('Multi-set operation', { count: Object.keys(keyValuePairs).length });
        return true;
      } catch (error) {
        this.stats.errors++;
        logger.error('Multi-set error', { error, count: Object.keys(keyValuePairs).length });
        throw error;
      }
    });
  }

  // Cache tags for invalidation
  async setCacheTags(key, tags, ttl = this.defaultTTL) {
    try {
      const tagKey = `tags:${key}`;
      await this.client.setEx(tagKey, ttl, JSON.stringify(tags));

      // Add to tag indexes
      for (const tag of tags) {
        const tagIndexKey = `tag_index:${tag}`;
        await this.client.sadd(tagIndexKey, key);
        await this.client.expire(tagIndexKey, ttl);
      }
    } catch (error) {
      logger.error('Cache tags error', { error, key, tags });
    }
  }

  async invalidateByTag(tag) {
    return await measurePerformance('RedisCache.invalidateByTag', async () => {
      try {
        const tagIndexKey = `tag_index:${tag}`;
        const keys = await this.client.smembers(tagIndexKey);

        if (keys.length > 0) {
          const cacheKeys = keys.map(key => this.getCacheKey(key));
          await this.client.del(cacheKeys);

          // Clean up tag index
          await this.client.del(tagIndexKey);

          // Clean up tag metadata
          await this.client.del(keys.map(key => `tags:${key}`));

          this.stats.deletes += keys.length;
          logger.debug('Tag-based invalidation', { tag, keysInvalidated: keys.length });

          return keys.length;
        }

        return 0;
      } catch (error) {
        this.stats.errors++;
        logger.error('Tag invalidation error', { error, tag });
        throw error;
      }
    });
  }

  async invalidateByPattern(pattern) {
    return await measurePerformance('RedisCache.invalidateByPattern', async () => {
      try {
        const cachePattern = this.getCacheKey(pattern);
        const keys = await this.client.keys(cachePattern);

        if (keys.length > 0) {
          await this.client.del(keys);
          this.stats.deletes += keys.length;
          logger.debug('Pattern-based invalidation', { pattern: cachePattern, keysInvalidated: keys.length });
          return keys.length;
        }

        return 0;
      } catch (error) {
        this.stats.errors++;
        logger.error('Pattern invalidation error', { error, pattern });
        throw error;
      }
    });
  }

  // Advanced cache warming
  async warmCache(cacheConfig) {
    return await measurePerformance('RedisCache.warmCache', async () => {
      const results = [];

      for (const [key, config] of Object.entries(cacheConfig)) {
        try {
          const value = await config.factory();
          await this.set(key, value, config.ttl, config.options);
          results.push({ key, success: true });
        } catch (error) {
          logger.error('Cache warming failed', { key, error });
          results.push({ key, success: false, error: error.message });
        }
      }

      logger.info('Cache warming completed', {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    });
  }

  // Cache statistics and monitoring
  async getCacheStats() {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');

      return {
        stats: this.stats,
        memory: this.parseMemoryInfo(info),
        keyspace: this.parseKeyspaceInfo(keyspace),
        hitRate: this.calculateHitRate(),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return {
        stats: this.stats,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memoryInfo = {};

    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryInfo[key] = isNaN(value) ? value : parseInt(value);
      }
    });

    return memoryInfo;
  }

  parseKeyspaceInfo(keyspace) {
    const lines = keyspace.split('\r\n');
    const keyspaceInfo = {};

    lines.forEach(line => {
      const dbMatch = line.match(/db(\d+):/);
      if (dbMatch) {
        const db = dbMatch[1];
        const keyStats = line.match(/keys=(\d+),expires=(\d+)/);
        if (keyStats) {
          keyspaceInfo[db] = {
            keys: parseInt(keyStats[1]),
            expires: parseInt(keyStats[2])
          };
        }
      }
    });

    return keyspaceInfo;
  }

  calculateHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Advanced pub/sub functionality
  async publish(channel, message) {
    try {
      const result = await this.client.publish(channel, JSON.stringify(message));
      logger.debug('Message published', { channel, subscribers: result });
      return result;
    } catch (error) {
      logger.error('Publish error', { error, channel });
      throw error;
    }
  }

  async subscribe(channels, callback) {
    try {
      const subscriber = this.client.duplicate();

      await subscriber.connect();

      const channelHandlers = channels.map(channel => ({
        channel,
        handler: (message) => {
          try {
            const parsedMessage = JSON.parse(message);
            callback(channel, parsedMessage);
          } catch (error) {
            logger.error('Message parsing error', { error, channel, message });
          }
        }
      }));

      // Subscribe to all channels
      for (const { channel } of channelHandlers) {
        await subscriber.subscribe(channel, () => {
          logger.debug('Subscribed to channel', { channel });
        });
      }

      // Set up message handlers
      for (const { channel, handler } of channelHandlers) {
        subscriber.on('message', (ch, message) => {
          if (ch === channel) {
            handler(message);
          }
        });
      }

      return {
        subscriber,
        channels,
        close: async () => {
          for (const { channel } of channelHandlers) {
            await subscriber.unsubscribe(channel);
          }
          await subscriber.quit();
        }
      };
    } catch (error) {
      logger.error('Subscribe error', { error, channels });
      throw error;
    }
  }

  // Advanced list operations
  async lpush(key, ...values) {
    try {
      const cacheKey = this.getCacheKey(key);
      const serializedValues = values.map(v => JSON.stringify(v));
      const result = await this.client.lpush(cacheKey, ...serializedValues);
      logger.debug('List push', { key: cacheKey, count: values.length });
      return result;
    } catch (error) {
      logger.error('List push error', { error, key });
      throw error;
    }
  }

  async rpop(key, count = 1) {
    try {
      const cacheKey = this.getCacheKey(key);
      const values = await this.client.rpop(cacheKey, count);
      logger.debug('List pop', { key: cacheKey, count });
      return count === 1 ? JSON.parse(values) : values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error('List pop error', { error, key });
      throw error;
    }
  }

  async llen(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      return await this.client.llen(cacheKey);
    } catch (error) {
      logger.error('List length error', { error, key });
      return 0;
    }
  }

  // Advanced set operations
  async sadd(key, ...members) {
    try {
      const cacheKey = this.getCacheKey(key);
      const serializedMembers = members.map(m => JSON.stringify(m));
      const result = await this.client.sadd(cacheKey, ...serializedMembers);
      logger.debug('Set add', { key: cacheKey, count: members.length });
      return result;
    } catch (error) {
      logger.error('Set add error', { error, key });
      throw error;
    }
  }

  async smembers(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const members = await this.client.smembers(cacheKey);
      return members.map(m => JSON.parse(m));
    } catch (error) {
      logger.error('Set members error', { error, key });
      return [];
    }
  }

  // Utility methods
  getCacheKey(key) {
    return `${this.cachePrefix}${key}`;
  }

  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Ping error', { error });
      return false;
    }
  }

  async flushAll() {
    try {
      await this.client.flushall();
      logger.warn('Cache flushed completely');
      return true;
    } catch (error) {
      logger.error('Flush all error', { error });
      throw error;
    }
  }

  async flushDb() {
    try {
      await this.client.flushdb();
      logger.warn('Current database flushed');
      return true;
    } catch (error) {
      logger.error('Flush database error', { error });
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const isConnected = await this.ping();
      const stats = await this.getCacheStats();

      return {
        isHealthy: isConnected,
        isConnected,
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Health check error', { error });
      return {
        isHealthy: false,
        isConnected: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    try {
      const info = await this.client.info('commandstats');

      return {
        commands: this.parseCommandStats(info),
        hitRate: this.calculateHitRate(),
        memoryUsage: await this.client.info('memory'),
        cpuUsage: await this.client.info('cpu'),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Performance metrics error', { error });
      return { error: error.message };
    }
  }

  parseCommandStats(info) {
    const lines = info.split('\r\n');
    const commands = {};

    lines.forEach(line => {
      const match = line.match(/cmdstat_(\w+):(.+)/);
      if (match) {
        const [, command, stats] = match;
        commands[command] = {};

        const statPairs = stats.split(',');
        statPairs.forEach(pair => {
          const [key, value] = pair.split('=');
          commands[command][key] = isNaN(value) ? value : parseInt(value);
        });
      }
    });

    return commands;
  }

  // Cache warming for frequently accessed data
  async warmFrequentData() {
    const frequentKeys = [
      'user:1',
      'user:2',
      'posts:recent',
      'posts:popular',
      'categories:list',
      'system:config'
    ];

    const results = {};
    for (const key of frequentKeys) {
      try {
        // Warm cache with mock data for demonstration
        const mockData = { id: key, data: `Cached data for ${key}`, timestamp: new Date() };
        await this.set(key, mockData, 300); // 5 minutes TTL
        results[key] = { success: true };
      } catch (error) {
        results[key] = { success: false, error: error.message };
      }
    }

    logger.info('Frequent data cache warming completed', {
      total: frequentKeys.length,
      successful: Object.values(results).filter(r => r.success).length
    });

    return results;
  }

  // Backup and restore
  async backup(pattern = '*') {
    try {
      const keys = await this.client.keys(this.getCacheKey(pattern));
      const backup = {};

      for (const key of keys) {
        const value = await this.client.get(key);
        const cleanKey = key.replace(this.cachePrefix, '');
        backup[cleanKey] = JSON.parse(value);
      }

      logger.info('Cache backup created', { keys: keys.length });
      return backup;
    } catch (error) {
      logger.error('Cache backup error', { error });
      throw error;
    }
  }

  async restore(backupData) {
    try {
      let restored = 0;

      for (const [key, value] of Object.entries(backupData)) {
        await this.set(key, value, 3600); // 1 hour TTL
        restored++;
      }

      logger.info('Cache restore completed', { restored });
      return restored;
    } catch (error) {
      logger.error('Cache restore error', { error });
      throw error;
    }
  }

  // Get cache manager status
  getStatus() {
    return {
      isConnected: this.isConnected,
      stats: this.stats,
      config: {
        prefix: this.cachePrefix,
        defaultTTL: this.defaultTTL
      },
      health: this.isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date()
    };
  }
}

const cacheManager = new RedisCacheManager();

// Graceful shutdown
process.on('beforeExit', async () => {
  await cacheManager.close();
});

module.exports = {
  RedisCacheManager,
  cacheManager
};
