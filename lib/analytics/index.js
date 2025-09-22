// lib/analytics/index.js
import { logger } from '../logger.js';

export class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  // Track user events
  async trackEvent(eventType, userId, data = {}) {
    try {
      await this.db.run(
        'INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?)',
        [userId, eventType, JSON.stringify(data), new Date().toISOString()]
      );

      logger.debug('Event tracked', { eventType, userId, data });
    } catch (error) {
      logger.error('Error tracking event', { error, eventType, userId });
    }
  }

  // Track page views
  async trackPageView(userId, page, data = {}) {
    try {
      await this.db.run(
        'INSERT INTO page_views (user_id, page, user_agent, ip_address, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, page, data.userAgent, data.ip, new Date().toISOString()]
      );

      logger.debug('Page view tracked', { userId, page });
    } catch (error) {
      logger.error('Error tracking page view', { error, userId, page });
    }
  }

  // Track user engagement
  async trackEngagement(userId, action, targetId, targetType) {
    try {
      await this.db.run(
        'INSERT INTO user_engagement (user_id, action, target_id, target_type, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, action, targetId, targetType, new Date().toISOString()]
      );

      logger.debug('Engagement tracked', { userId, action, targetId, targetType });
    } catch (error) {
      logger.error('Error tracking engagement', { error, userId, action });
    }
  }

  // Get user analytics
  async getUserAnalytics(userId, timeframe = '30d') {
    try {
      const now = new Date();
      const pastDate = new Date();

      switch (timeframe) {
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
          pastDate.setDate(now.getDate() - 30);
      }

      // Get event counts
      const events = await this.db.all(
        'SELECT event_type, COUNT(*) as count FROM analytics_events WHERE user_id = ? AND created_at >= ? GROUP BY event_type',
        [userId, pastDate.toISOString()]
      );

      // Get page views
      const pageViews = await this.db.get(
        'SELECT COUNT(*) as count FROM page_views WHERE user_id = ? AND created_at >= ?',
        [userId, pastDate.toISOString()]
      );

      // Get engagement metrics
      const engagement = await this.db.all(
        'SELECT action, COUNT(*) as count FROM user_engagement WHERE user_id = ? AND created_at >= ? GROUP BY action',
        [userId, pastDate.toISOString()]
      );

      return {
        userId,
        timeframe,
        events: events.reduce((acc, event) => ({ ...acc, [event.event_type]: event.count }), {}),
        pageViews: pageViews.count,
        engagement: engagement.reduce((acc, item) => ({ ...acc, [item.action]: item.count }), {}),
        generatedAt: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting user analytics', { error, userId });
      throw error;
    }
  }

  // Get platform analytics
  async getPlatformAnalytics(timeframe = '30d') {
    try {
      const now = new Date();
      const pastDate = new Date();

      switch (timeframe) {
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
          pastDate.setDate(now.getDate() - 30);
      }

      // Active users
      const activeUsers = await this.db.get(
        'SELECT COUNT(DISTINCT user_id) as count FROM page_views WHERE created_at >= ?',
        [pastDate.toISOString()]
      );

      // New users
      const newUsers = await this.db.get(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ?',
        [pastDate.toISOString()]
      );

      // Total posts
      const totalPosts = await this.db.get(
        'SELECT COUNT(*) as count FROM posts WHERE created_at >= ?',
        [pastDate.toISOString()]
      );

      // Total comments
      const totalComments = await this.db.get(
        'SELECT COUNT(*) as count FROM comments WHERE created_at >= ?',
        [pastDate.toISOString()]
      );

      // Popular pages
      const popularPages = await this.db.all(
        'SELECT page, COUNT(*) as views FROM page_views WHERE created_at >= ? GROUP BY page ORDER BY views DESC LIMIT 10',
        [pastDate.toISOString()]
      );

      // User growth
      const userGrowth = await this.db.all(
        'SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date',
        [pastDate.toISOString()]
      );

      // Engagement trends
      const engagementTrends = await this.db.all(
        'SELECT DATE(created_at) as date, COUNT(*) as engagements FROM user_engagement WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date',
        [pastDate.toISOString()]
      );

      return {
        overview: {
          activeUsers: activeUsers.count,
          newUsers: newUsers.count,
          totalPosts: totalPosts.count,
          totalComments: totalComments.count
        },
        popularPages,
        userGrowth,
        engagementTrends,
        timeframe,
        generatedAt: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting platform analytics', { error });
      throw error;
    }
  }

  // Real-time metrics
  async getRealtimeMetrics() {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Current online users (users who viewed pages in last 5 minutes)
      const onlineUsers = await this.db.get(
        'SELECT COUNT(DISTINCT user_id) as count FROM page_views WHERE created_at >= ?',
        [fiveMinutesAgo.toISOString()]
      );

      // Recent activity
      const recentPosts = await this.db.get(
        'SELECT COUNT(*) as count FROM posts WHERE created_at >= ?',
        [fiveMinutesAgo.toISOString()]
      );

      const recentComments = await this.db.get(
        'SELECT COUNT(*) as count FROM comments WHERE created_at >= ?',
        [fiveMinutesAgo.toISOString()]
      );

      const recentLikes = await this.db.get(
        'SELECT COUNT(*) as count FROM likes WHERE created_at >= ?',
        [fiveMinutesAgo.toISOString()]
      );

      return {
        onlineUsers: onlineUsers.count,
        recentActivity: {
          posts: recentPosts.count,
          comments: recentComments.count,
          likes: recentLikes.count
        },
        timestamp: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting realtime metrics', { error });
      throw error;
    }
  }

  // Content performance
  async getContentPerformance(timeframe = '30d') {
    try {
      const now = new Date();
      const pastDate = new Date();

      switch (timeframe) {
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
          pastDate.setDate(now.getDate() - 30);
      }

      // Top performing posts
      const topPosts = await this.db.all(`
        SELECT
          p.id,
          p.title,
          p.content,
          u.username,
          COUNT(DISTINCT l.id) as likes,
          COUNT(DISTINCT c.id) as comments,
          p.view_count as views,
          (COUNT(DISTINCT l.id) + COUNT(DISTINCT c.id) + p.view_count) as engagement_score
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON p.id = l.post_id
        LEFT JOIN comments c ON p.id = c.post_id
        WHERE p.created_at >= ? AND p.status = 'published'
        GROUP BY p.id
        ORDER BY engagement_score DESC
        LIMIT 10
      `, [pastDate.toISOString()]);

      // Category performance
      const categoryPerformance = await this.db.all(`
        SELECT
          cat.name,
          COUNT(DISTINCT p.id) as post_count,
          COUNT(DISTINCT l.id) as likes,
          COUNT(DISTINCT c.id) as comments
        FROM categories cat
        LEFT JOIN post_categories pc ON cat.id = pc.category_id
        LEFT JOIN posts p ON pc.post_id = p.id AND p.created_at >= ?
        LEFT JOIN likes l ON p.id = l.post_id
        LEFT JOIN comments c ON p.id = c.post_id
        GROUP BY cat.id, cat.name
        ORDER BY post_count DESC
      `, [pastDate.toISOString()]);

      return {
        topPosts,
        categoryPerformance,
        timeframe,
        generatedAt: now.toISOString()
      };
    } catch (error) {
      logger.error('Error getting content performance', { error });
      throw error;
    }
  }

  // Export data
  async exportUserData(userId) {
    try {
      const user = await this.db.get('SELECT * FROM users WHERE id = ?', [userId]);
      const posts = await this.db.all('SELECT * FROM posts WHERE user_id = ?', [userId]);
      const comments = await this.db.all('SELECT * FROM comments WHERE user_id = ?', [userId]);
      const likes = await this.db.all('SELECT * FROM likes WHERE user_id = ?', [userId]);

      return {
        user: { ...user, password_hash: undefined }, // Remove sensitive data
        posts,
        comments,
        likes,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error exporting user data', { error, userId });
      throw error;
    }
  }
}
