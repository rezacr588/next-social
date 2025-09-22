// lib/admin/index.js
import { logger } from '../logger.js';
import { NotFoundError, AuthorizationError } from '../errors.js';
import config from '../config/index.js';

export class AdminService {
  constructor(db) {
    this.db = db;
  }

  // User management
  async getAllUsers(page = 1, limit = 20, filters = {}) {
    try {
      let query = 'SELECT id, username, email, role, is_verified, is_active, created_at, last_login FROM users WHERE 1=1';
      const params = [];

      if (filters.role) {
        query += ' AND role = ?';
        params.push(filters.role);
      }

      if (filters.isVerified !== undefined) {
        query += ' AND is_verified = ?';
        params.push(filters.isVerified ? 1 : 0);
      }

      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive ? 1 : 0);
      }

      if (filters.search) {
        query += ' AND (username LIKE ? OR email LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);

      const users = await this.db.all(query, params);

      // Get total count
      const countQuery = query.replace('SELECT id, username, email, role, is_verified, is_active, created_at, last_login FROM users', 'SELECT COUNT(*) as count FROM users').replace('ORDER BY created_at DESC LIMIT ? OFFSET ?', '');
      const totalResult = await this.db.get(countQuery, params.slice(0, -2));
      const total = totalResult.count;

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting users', { error });
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const user = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    } catch (error) {
      logger.error('Error getting user by ID', { error, userId: id });
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      const allowedFields = ['username', 'email', 'role', 'is_verified', 'is_active', 'bio'];
      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(updates[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      await this.db.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info('User updated by admin', { userId: id, updates });
      return await this.getUserById(id);
    } catch (error) {
      logger.error('Error updating user', { error, userId: id });
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const result = await this.db.run('DELETE FROM users WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('User');
      }

      logger.info('User deleted by admin', { userId: id });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting user', { error, userId: id });
      throw error;
    }
  }

  // Post management
  async getAllPosts(page = 1, limit = 20, filters = {}) {
    try {
      let query = `
        SELECT p.*, u.username, u.avatar_url,
        COUNT(l.id) as like_count,
        COUNT(c.id) as comment_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON p.id = l.post_id
        LEFT JOIN comments c ON p.id = c.post_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      if (filters.userId) {
        query += ' AND p.user_id = ?';
        params.push(filters.userId);
      }

      if (filters.search) {
        query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);

      const posts = await this.db.all(query, params);

      // Get total count
      const countQuery = query.replace(/SELECT p\.\*, u\.username, u\.avatar_url,[\s\S]*FROM posts p/m, 'SELECT COUNT(*) as count FROM posts p').replace(/GROUP BY p\.id ORDER BY p\.created_at DESC LIMIT \? OFFSET \?/, '');
      const totalResult = await this.db.get(countQuery, params.slice(0, -2));
      const total = totalResult.count;

      return {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting posts', { error });
      throw error;
    }
  }

  async moderatePost(postId, action, reason = '') {
    try {
      const post = await this.db.get('SELECT * FROM posts WHERE id = ?', [postId]);

      if (!post) {
        throw new NotFoundError('Post');
      }

      let newStatus = post.status;

      switch (action) {
        case 'approve':
          newStatus = 'published';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'delete':
          await this.db.run('DELETE FROM posts WHERE id = ?', [postId]);
          logger.info('Post deleted by admin', { postId, reason });
          return { success: true, action: 'deleted' };
        case 'hide':
          newStatus = 'hidden';
          break;
        case 'feature':
          newStatus = 'featured';
          break;
      }

      await this.db.run(
        'UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, postId]
      );

      logger.info('Post moderated by admin', { postId, action, newStatus, reason });
      return { success: true, action, newStatus };
    } catch (error) {
      logger.error('Error moderating post', { error, postId, action });
      throw error;
    }
  }

  // Comment management
  async getAllComments(page = 1, limit = 20, filters = {}) {
    try {
      let query = `
        SELECT c.*, p.title as post_title, u.username,
        COUNT(l.id) as like_count
        FROM comments c
        JOIN posts p ON c.post_id = p.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN likes l ON c.id = l.comment_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ' AND c.status = ?';
        params.push(filters.status);
      }

      if (filters.postId) {
        query += ' AND c.post_id = ?';
        params.push(filters.postId);
      }

      if (filters.userId) {
        query += ' AND c.user_id = ?';
        params.push(filters.userId);
      }

      query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);

      const comments = await this.db.all(query, params);

      // Get total count
      const countQuery = query.replace(/SELECT c\.\*, p\.title as post_title, u\.username,[\s\S]*FROM comments c/m, 'SELECT COUNT(*) as count FROM comments c').replace(/GROUP BY c\.id ORDER BY c\.created_at DESC LIMIT \? OFFSET \?/, '');
      const totalResult = await this.db.get(countQuery, params.slice(0, -2));
      const total = totalResult.count;

      return {
        comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting comments', { error });
      throw error;
    }
  }

  async moderateComment(commentId, action, reason = '') {
    try {
      const comment = await this.db.get('SELECT * FROM comments WHERE id = ?', [commentId]);

      if (!comment) {
        throw new NotFoundError('Comment');
      }

      let newStatus = comment.status;

      switch (action) {
        case 'approve':
          newStatus = 'approved';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'delete':
          await this.db.run('DELETE FROM comments WHERE id = ?', [commentId]);
          logger.info('Comment deleted by admin', { commentId, reason });
          return { success: true, action: 'deleted' };
      }

      await this.db.run(
        'UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, commentId]
      );

      logger.info('Comment moderated by admin', { commentId, action, newStatus, reason });
      return { success: true, action, newStatus };
    } catch (error) {
      logger.error('Error moderating comment', { error, commentId, action });
      throw error;
    }
  }

  // Analytics
  async getAnalytics(timeframe = '7d') {
    try {
      const now = new Date();
      const pastDate = new Date();

      switch (timeframe) {
        case '1d':
          pastDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          pastDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          pastDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          pastDate.setDate(now.getDate() - 90);
          break;
        default:
          pastDate.setDate(now.getDate() - 7);
      }

      const [userStats] = await this.db.all(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
        FROM users
      `, [pastDate.toISOString()]);

      const [postStats] = await this.db.all(`
        SELECT
          COUNT(*) as total_posts,
          COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_posts,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
          AVG(view_count) as avg_views
        FROM posts
      `, [pastDate.toISOString()]);

      const [engagementStats] = await this.db.all(`
        SELECT
          COUNT(*) as total_likes,
          COUNT(*) as total_comments,
          COUNT(DISTINCT user_id) as active_users
        FROM (
          SELECT user_id FROM likes
          UNION
          SELECT user_id FROM comments
        ) t
      `);

      return {
        users: userStats,
        posts: postStats,
        engagement: engagementStats,
        timeframe,
        generatedAt: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting analytics', { error });
      throw error;
    }
  }

  // System settings
  async getSystemSettings() {
    try {
      // Mock system settings - in a real app, this would come from a settings table
      return {
        siteName: 'Nexus Social',
        siteDescription: 'Advanced social media platform',
        registrationEnabled: config.features.registration,
        socialLoginEnabled: config.features.socialLogin,
        fileUploadEnabled: config.features.fileUpload,
        commentsEnabled: config.features.comments,
        maintenanceMode: false,
        version: '1.0.0'
      };
    } catch (error) {
      logger.error('Error getting system settings', { error });
      throw error;
    }
  }

  async updateSystemSettings(settings) {
    try {
      // Mock settings update - in a real app, this would update a settings table
      logger.info('System settings updated', { settings });
      return { success: true, settings };
    } catch (error) {
      logger.error('Error updating system settings', { error });
      throw error;
    }
  }
}
