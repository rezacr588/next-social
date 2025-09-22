// lib/services/UserService.js - Modern Service Layer with Advanced Patterns
const { databaseManager } = require('../database/index.js');
const { logger } = require('../logger.js');
const { ValidationError, NotFoundError } = require('../errors.js');
const {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  validatePasswordStrength,
  validateEmailAdvanced,
  checkRateLimit
} = require('../auth.js');
const {
  memoize,
  retry,
  measurePerformance,
  chunk,
  groupBy,
  partition
} = require('../utils/index.js');

class UserService {
  constructor() {
    this.db = databaseManager;
    this.rateLimitStore = new Map();

    // Memoize expensive operations
    this.getUserById = memoize(this._getUserById.bind(this));
    this.getUserByEmail = memoize(this._getUserByEmail.bind(this));
  }

  // Advanced user creation with comprehensive validation
  async createUser(userData) {
    return await measurePerformance('UserService.createUser', async () => {
      const { username, email, password, firstName, lastName, bio } = userData;

      // Validate input data
      this._validateUserData({ username, email, password });

      // Check rate limiting
      if (!checkRateLimit(`register:${email}`, 3, 60 * 60 * 1000)) {
        throw new ValidationError('Too many registration attempts');
      }

      return await this.db.withTransaction(async (db) => {
        // Check if user already exists
        const existingUser = await db.get(
          'SELECT id FROM users WHERE email = ? OR username = ?',
          [email, username]
        );

        if (existingUser) {
          throw new ValidationError('User with this email or username already exists');
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const result = await db.run(
          `INSERT INTO users (
            username, email, password_hash, first_name, last_name, bio,
            created_at, updated_at, is_verified, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0, 1)`,
          [username, email, passwordHash, firstName, lastName, bio]
        );

        const user = await this.getUserById(result.lastID);

        // Generate tokens
        const accessToken = generateToken({
          id: user.id,
          email: user.email,
          role: user.role
        });

        const refreshToken = generateRefreshToken({
          id: user.id,
          email: user.email,
          role: user.role
        });

        logger.info('User created successfully', { userId: user.id, email: user.email });

        return {
          user: { ...user, password_hash: undefined },
          accessToken,
          refreshToken
        };
      });
    });
  }

  // Advanced user authentication with security features
  async authenticateUser(credentials) {
    return await measurePerformance('UserService.authenticateUser', async () => {
      const { email, password, rememberMe = false } = credentials;

      // Rate limiting
      if (!checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000)) {
        throw new ValidationError('Too many login attempts. Try again later.');
      }

      const user = await this.getUserByEmail(email);

      if (!user || !user.is_active) {
        throw new ValidationError('Invalid credentials or account disabled');
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        throw new ValidationError('Invalid credentials');
      }

      // Update last login
      await this.db.run(
        'UPDATE users SET last_login = datetime("now") WHERE id = ?',
        [user.id]
      );

      // Generate tokens
      const accessToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      // Store refresh token based on rememberMe preference
      if (rememberMe) {
        // In production, store in HTTP-only cookie
        logger.info('User logged in with remember me', { userId: user.id });
      }

      logger.info('User authenticated successfully', { userId: user.id });

      return {
        user: { ...user, password_hash: undefined },
        accessToken,
        refreshToken
      };
    });
  }

  // Advanced user search with multiple filters
  async searchUsers(searchTerm, options = {}) {
    return await measurePerformance('UserService.searchUsers', async () => {
      const {
        limit = 20,
        offset = 0,
        role,
        isVerified,
        isActive,
        sortBy = 'username',
        sortOrder = 'ASC'
      } = options;

      let query = `
        SELECT id, username, email, first_name, last_name, bio, avatar_url,
               role, is_verified, is_active, created_at, last_login
        FROM users
        WHERE 1=1
      `;

      const params = [];

      // Text search across multiple fields
      if (searchTerm) {
        query += ` AND (
          username LIKE ? OR
          email LIKE ? OR
          first_name LIKE ? OR
          last_name LIKE ? OR
          bio LIKE ?
        )`;
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Filters
      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }

      if (isVerified !== undefined) {
        query += ' AND is_verified = ?';
        params.push(isVerified ? 1 : 0);
      }

      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
      }

      // Sorting
      const validSortFields = ['username', 'email', 'created_at', 'last_login'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'username';
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      query += ` ORDER BY ${sortField} ${order}`;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const users = await this.db.executeQuery(query, params);

      // Get total count for pagination
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM').replace(/ORDER BY.*LIMIT.*OFFSET.*/, '');
      const totalResult = await this.db.executeQuery(countQuery, params.slice(0, -2));
      const total = totalResult[0]?.count || 0;

      return {
        users,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    });
  }

  // Advanced user profile update with validation
  async updateUserProfile(userId, updates) {
    return await measurePerformance('UserService.updateUserProfile', async () => {
      return await this.db.withTransaction(async (db) => {
        // Get current user
        const currentUser = await this.getUserById(userId);

        if (!currentUser) {
          throw new NotFoundError('User');
        }

        // Validate updates
        this._validateUserUpdates(updates);

        // Build update query
        const updateFields = [];
        const updateValues = [];

        Object.keys(updates).forEach(key => {
          if (updates[key] !== undefined && this._isUpdatableField(key)) {
            updateFields.push(`${key} = ?`);
            updateValues.push(updates[key]);
          }
        });

        if (updateFields.length === 0) {
          return currentUser;
        }

        updateFields.push('updated_at = datetime("now")');
        updateValues.push(userId);

        // Execute update
        await db.run(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        // Return updated user
        const updatedUser = await this.getUserById(userId);
        logger.info('User profile updated', { userId, updatedFields: updateFields.length });

        return updatedUser;
      });
    });
  }

  // Advanced user statistics with aggregation
  async getUserStatistics(userId) {
    return await measurePerformance('UserService.getUserStatistics', async () => {
      const user = await this.getUserById(userId);

      if (!user) {
        throw new NotFoundError('User');
      }

      // Get post statistics
      const postStats = await this.db.executeQuery(
        'SELECT COUNT(*) as total_posts, SUM(view_count) as total_views FROM posts WHERE user_id = ?',
        [userId]
      );

      // Get engagement statistics
      const engagementStats = await this.db.executeQuery(`
        SELECT
          COUNT(DISTINCT l.id) as total_likes_given,
          COUNT(DISTINCT c.id) as total_comments,
          COUNT(DISTINCT f.id) as total_followers
        FROM users u
        LEFT JOIN likes l ON u.id = l.user_id
        LEFT JOIN comments c ON u.id = c.user_id
        LEFT JOIN follows f ON u.id = f.following_id
        WHERE u.id = ?
      `, [userId]);

      // Get activity over time
      const activityData = await this.db.executeQuery(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as posts_count
        FROM posts
        WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [userId]);

      return {
        user: { ...user, password_hash: undefined },
        statistics: {
          posts: {
            total: postStats[0]?.total_posts || 0,
            totalViews: postStats[0]?.total_views || 0
          },
          engagement: {
            likesGiven: engagementStats[0]?.total_likes_given || 0,
            comments: engagementStats[0]?.total_comments || 0,
            followers: engagementStats[0]?.total_followers || 0
          },
          activity: activityData.reverse() // Most recent first
        }
      };
    });
  }

  // Advanced batch user operations
  async batchUpdateUsers(updates) {
    return await measurePerformance('UserService.batchUpdateUsers', async () => {
      const results = [];

      // Process in chunks for better performance
      const chunks = chunk(updates, 10);

      for (const updateChunk of chunks) {
        const chunkResults = await Promise.allSettled(
          updateChunk.map(update => this.updateUserProfile(update.id, update.data))
        );

        results.push(...chunkResults);
      }

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info('Batch user update completed', { successful, failed });

      return {
        successful,
        failed,
        results: results.map((result, index) => ({
          index,
          success: result.status === 'fulfilled',
          user: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      };
    });
  }

  // Advanced user export with data anonymization options
  async exportUserData(userId, options = {}) {
    return await measurePerformance('UserService.exportUserData', async () => {
      const { includePrivateData = false, anonymize = false } = options;

      const user = await this.getUserById(userId);

      if (!user) {
        throw new NotFoundError('User');
      }

      // Get user's posts
      const posts = await this.db.executeQuery(
        'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      // Get user's comments
      const comments = await this.db.executeQuery(
        'SELECT * FROM comments WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      // Get user's likes
      const likes = await this.db.executeQuery(
        'SELECT * FROM likes WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      let exportData = {
        user: { ...user, password_hash: undefined },
        posts,
        comments,
        likes,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      // Anonymize data if requested
      if (anonymize) {
        exportData = this._anonymizeData(exportData);
      }

      // Remove private data if not authorized
      if (!includePrivateData) {
        delete exportData.user.email;
        delete exportData.user.last_login;
      }

      return exportData;
    });
  }

  // Private helper methods
  async _getUserById(id) {
    const user = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  async _getUserByEmail(email) {
    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  _validateUserData({ username, email, password }) {
    const errors = [];

    // Username validation
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Email validation
    const emailValidation = validateEmailAdvanced(email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    // Password validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }
  }

  _validateUserUpdates(updates) {
    const allowedFields = ['first_name', 'last_name', 'bio', 'avatar_url', 'cover_url'];
    const updateKeys = Object.keys(updates);

    const invalidFields = updateKeys.filter(key => !allowedFields.includes(key));

    if (invalidFields.length > 0) {
      throw new ValidationError('Invalid fields for update', { invalidFields });
    }

    // Additional validation for specific fields
    if (updates.bio && updates.bio.length > 500) {
      throw new ValidationError('Bio must be less than 500 characters');
    }
  }

  _isUpdatableField(field) {
    const updatableFields = ['first_name', 'last_name', 'bio', 'avatar_url', 'cover_url'];
    return updatableFields.includes(field);
  }

  _anonymizeData(data) {
    const anonymized = { ...data };

    // Anonymize user data
    if (anonymized.user) {
      anonymized.user.email = `user${anonymized.user.id}@anonymous.local`;
      anonymized.user.first_name = 'Anonymous';
      anonymized.user.last_name = 'User';
      anonymized.user.bio = 'This user has chosen to remain anonymous';
      delete anonymized.user.avatar_url;
      delete anonymized.user.cover_url;
    }

    return anonymized;
  }
}

const userService = new UserService();

module.exports = {
  UserService,
  userService
};
