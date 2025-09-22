// lib/admin/dashboard.js - Advanced Admin Dashboard Service
const { databaseManager } = require('../database/index.js');
const { logger } = require('../logger.js');
const { memoize, measurePerformance } = require('../utils/index.js');

class AdminDashboardService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeouts = new Map();

    // Memoize expensive operations
    this.getUserStats = memoize(this._getUserStats.bind(this), () => 'user-stats');
    this.getPostStats = memoize(this._getPostStats.bind(this), () => 'post-stats');
    this.getEngagementStats = memoize(this._getEngagementStats.bind(this), () => 'engagement-stats');
    this.getSystemHealth = memoize(this._getSystemHealth.bind(this), () => 'system-health');
  }

  // Advanced user analytics
  async getUserAnalytics(timeframe = '30d', filters = {}) {
    return await measurePerformance('AdminDashboard.getUserAnalytics', async () => {
      const startDate = this.getStartDate(timeframe);

      const analytics = {
        overview: await this.getUserOverview(startDate, filters),
        growth: await this.getUserGrowth(startDate, filters),
        demographics: await this.getUserDemographics(startDate, filters),
        activity: await this.getUserActivity(startDate, filters),
        retention: await this.getUserRetention(startDate, filters),
        geographic: await this.getGeographicData(startDate, filters),
        device: await this.getDeviceData(startDate, filters),
        timeframe,
        generatedAt: new Date()
      };

      return analytics;
    });
  }

  async getUserOverview(startDate, filters) {
    const query = `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login >= ? THEN 1 END) as recent_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified_users,
        AVG(CASE WHEN last_login IS NOT NULL THEN julianday('now') - julianday(last_login) END) as avg_days_since_login
      FROM users
      WHERE created_at >= ?
    `;

    const params = [startDate, startDate, startDate];
    const result = await this.db.executeQuery(query, params);
    return result[0];
  }

  async getUserGrowth(startDate, filters) {
    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as new_users,
        COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified_users
      FROM users
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const growthData = await this.db.executeQuery(query, [startDate]);

    // Calculate growth rates
    const processedData = growthData.map((day, index) => {
      const growthRate = index > 0 ?
        ((day.new_users - growthData[index - 1].new_users) / growthData[index - 1].new_users) * 100 : 0;

      return {
        ...day,
        growthRate: Math.round(growthRate * 100) / 100,
        cumulativeUsers: growthData.slice(0, index + 1).reduce((sum, d) => sum + d.new_users, 0)
      };
    });

    return processedData;
  }

  async getUserDemographics(startDate, filters) {
    const demographics = {
      byRole: await this.getUsersByRole(startDate),
      byStatus: await this.getUsersByStatus(startDate),
      byVerification: await this.getUsersByVerification(startDate),
      byActivity: await this.getUsersByActivityLevel(startDate)
    };

    return demographics;
  }

  async getUsersByRole(startDate) {
    const query = `
      SELECT
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM users
      WHERE created_at >= ?
      GROUP BY role
      ORDER BY count DESC
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getUsersByStatus(startDate) {
    const query = `
      SELECT
        is_active,
        is_verified,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ?
      GROUP BY is_active, is_verified
    `;

    const statusData = await this.db.executeQuery(query, [startDate]);

    return statusData.map(item => ({
      status: item.is_active ? 'active' : 'inactive',
      verified: item.is_verified,
      count: item.count
    }));
  }

  async getUsersByVerification(startDate) {
    const query = `
      SELECT
        is_verified,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM users
      WHERE created_at >= ?
      GROUP BY is_verified
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getUsersByActivityLevel(startDate) {
    const query = `
      SELECT
        CASE
          WHEN last_login IS NULL THEN 'never'
          WHEN julianday('now') - julianday(last_login) <= 1 THEN 'daily'
          WHEN julianday('now') - julianday(last_login) <= 7 THEN 'weekly'
          WHEN julianday('now') - julianday(last_login) <= 30 THEN 'monthly'
          ELSE 'inactive'
        END as activity_level,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ?
      GROUP BY activity_level
      ORDER BY count DESC
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getUserActivity(startDate, filters) {
    const activity = {
      loginTrends: await this.getLoginTrends(startDate),
      sessionDuration: await this.getSessionDurationStats(startDate),
      featureUsage: await this.getFeatureUsageStats(startDate),
      peakHours: await this.getPeakHoursData(startDate)
    };

    return activity;
  }

  async getLoginTrends(startDate) {
    const query = `
      SELECT
        DATE(last_login) as date,
        COUNT(*) as login_count
      FROM users
      WHERE last_login >= ? AND last_login IS NOT NULL
      GROUP BY DATE(last_login)
      ORDER BY date
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getSessionDurationStats(startDate) {
    // Mock session duration data
    return {
      average: 24.5,
      median: 18.3,
      min: 2.1,
      max: 156.7,
      byHour: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        averageDuration: Math.random() * 30 + 10
      }))
    };
  }

  async getFeatureUsageStats(startDate) {
    return {
      posts: await this.getFeatureUsage('posts', startDate),
      comments: await this.getFeatureUsage('comments', startDate),
      likes: await this.getFeatureUsage('likes', startDate),
      messages: await this.getFeatureUsage('messages', startDate),
      searches: await this.getFeatureUsage('searches', startDate)
    };
  }

  async getFeatureUsage(feature, startDate) {
    const query = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as usage_count
      FROM ${feature}
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getPeakHoursData(startDate) {
    // Mock peak hours data
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      users: Math.floor(Math.random() * 1000) + 100,
      activity: Math.floor(Math.random() * 500) + 50
    }));
  }

  async getUserRetention(startDate, filters) {
    const cohorts = await this.getUserCohorts(startDate);
    const retentionRates = await this.calculateRetentionRates(cohorts);

    return {
      cohorts,
      retentionRates,
      averageRetention: this.calculateAverageRetention(retentionRates)
    };
  }

  async getUserCohorts(startDate) {
    const query = `
      SELECT
        strftime('%Y-%m', created_at) as cohort_month,
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login >= datetime('now', '-7 days') THEN 1 END) as retained_week_1,
        COUNT(CASE WHEN last_login >= datetime('now', '-30 days') THEN 1 END) as retained_month_1,
        COUNT(CASE WHEN last_login >= datetime('now', '-90 days') THEN 1 END) as retained_month_3
      FROM users
      WHERE created_at >= ?
      GROUP BY cohort_month
      ORDER BY cohort_month
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  calculateRetentionRates(cohorts) {
    return cohorts.map(cohort => ({
      cohort: cohort.cohort_month,
      week1: cohort.total_users > 0 ? (cohort.retained_week_1 / cohort.total_users) * 100 : 0,
      month1: cohort.total_users > 0 ? (cohort.retained_month_1 / cohort.total_users) * 100 : 0,
      month3: cohort.total_users > 0 ? (cohort.retained_month_3 / cohort.total_users) * 100 : 0
    }));
  }

  calculateAverageRetention(retentionRates) {
    if (retentionRates.length === 0) return 0;

    const total = retentionRates.reduce((sum, rate) => ({
      week1: sum.week1 + rate.week1,
      month1: sum.month1 + rate.month1,
      month3: sum.month3 + rate.month3
    }), { week1: 0, month1: 0, month3: 0 });

    return {
      week1: total.week1 / retentionRates.length,
      month1: total.month1 / retentionRates.length,
      month3: total.month3 / retentionRates.length
    };
  }

  async getGeographicData(startDate, filters) {
    // Mock geographic data
    return {
      byCountry: [
        { country: 'United States', users: 1250, percentage: 35.2 },
        { country: 'United Kingdom', users: 890, percentage: 25.1 },
        { country: 'Canada', users: 567, percentage: 16.0 },
        { country: 'Germany', users: 445, percentage: 12.5 },
        { country: 'France', users: 312, percentage: 8.8 }
      ],
      byRegion: [
        { region: 'North America', users: 1817, percentage: 51.2 },
        { region: 'Europe', users: 1345, percentage: 37.9 },
        { region: 'Asia', users: 234, percentage: 6.6 },
        { region: 'Other', users: 154, percentage: 4.3 }
      ]
    };
  }

  async getDeviceData(startDate, filters) {
    // Mock device data
    return {
      byDeviceType: [
        { type: 'Desktop', users: 1850, percentage: 52.1 },
        { type: 'Mobile', users: 1420, percentage: 40.0 },
        { type: 'Tablet', users: 280, percentage: 7.9 }
      ],
      byOS: [
        { os: 'Windows', users: 950, percentage: 26.8 },
        { os: 'macOS', users: 720, percentage: 20.3 },
        { os: 'Linux', users: 380, percentage: 10.7 },
        { os: 'iOS', users: 890, percentage: 25.1 },
        { os: 'Android', users: 610, percentage: 17.2 }
      ],
      byBrowser: [
        { browser: 'Chrome', users: 1450, percentage: 40.8 },
        { browser: 'Firefox', users: 720, percentage: 20.3 },
        { browser: 'Safari', users: 680, percentage: 19.2 },
        { browser: 'Edge', users: 450, percentage: 12.7 },
        { browser: 'Other', users: 250, percentage: 7.0 }
      ]
    };
  }

  // Content Analytics
  async getContentAnalytics(timeframe = '30d', filters = {}) {
    return await measurePerformance('AdminDashboard.getContentAnalytics', async () => {
      const startDate = this.getStartDate(timeframe);

      return {
        overview: await this.getContentOverview(startDate, filters),
        performance: await this.getContentPerformance(startDate, filters),
        engagement: await this.getContentEngagement(startDate, filters),
        trends: await this.getContentTrends(startDate, filters),
        categories: await this.getCategoryAnalytics(startDate, filters),
        moderation: await this.getModerationStats(startDate, filters)
      };
    });
  }

  async getContentOverview(startDate, filters) {
    const query = `
      SELECT
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts,
        COUNT(CASE WHEN status = 'hidden' THEN 1 END) as hidden_posts,
        AVG(view_count) as avg_views,
        SUM(view_count) as total_views,
        COUNT(DISTINCT user_id) as active_authors
      FROM posts
      WHERE created_at >= ?
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getContentPerformance(startDate, filters) {
    const query = `
      SELECT
        p.id,
        p.title,
        p.content,
        u.username,
        p.view_count as views,
        COUNT(DISTINCT l.id) as likes,
        COUNT(DISTINCT c.id) as comments,
        (COUNT(DISTINCT l.id) + COUNT(DISTINCT c.id) + p.view_count) as engagement_score,
        p.created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.created_at >= ? AND p.status = 'published'
      GROUP BY p.id
      ORDER BY engagement_score DESC
      LIMIT 20
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getContentEngagement(startDate, filters) {
    return {
      likesPerPost: await this.getAverageEngagement('likes', startDate),
      commentsPerPost: await this.getAverageEngagement('comments', startDate),
      sharesPerPost: await this.getAverageEngagement('shares', startDate),
      engagementRate: await this.calculateEngagementRate(startDate)
    };
  }

  async getAverageEngagement(engagementType, startDate) {
    const query = `
      SELECT AVG(engagement_count) as average
      FROM (
        SELECT
          p.id,
          COUNT(${engagementType === 'likes' ? 'l' : engagementType === 'comments' ? 'c' : 's'}.id) as engagement_count
        FROM posts p
        LEFT JOIN likes l ON p.id = l.post_id
        LEFT JOIN comments c ON p.id = c.post_id
        LEFT JOIN shares s ON p.id = s.post_id
        WHERE p.created_at >= ?
        GROUP BY p.id
      )
    `;

    const result = await this.db.executeQuery(query, [startDate]);
    return result[0]?.average || 0;
  }

  async calculateEngagementRate(startDate) {
    const query = `
      SELECT
        COUNT(DISTINCT CASE WHEN l.id IS NOT NULL THEN l.user_id END) as engaged_users,
        COUNT(DISTINCT p.user_id) as total_users
      FROM posts p
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.created_at >= ?
    `;

    const result = await this.db.executeQuery(query, [startDate]);
    const data = result[0];

    return data && data.total_users > 0 ?
      (data.engaged_users / data.total_users) * 100 : 0;
  }

  async getContentTrends(startDate, filters) {
    const query = `
      SELECT
        DATE(p.created_at) as date,
        COUNT(*) as posts_count,
        AVG(p.view_count) as avg_views,
        COUNT(DISTINCT p.user_id) as unique_authors
      FROM posts p
      WHERE p.created_at >= ?
      GROUP BY DATE(p.created_at)
      ORDER BY date
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getCategoryAnalytics(startDate, filters) {
    const query = `
      SELECT
        cat.name as category_name,
        COUNT(DISTINCT p.id) as post_count,
        SUM(p.view_count) as total_views,
        COUNT(DISTINCT l.id) as total_likes,
        COUNT(DISTINCT c.id) as total_comments,
        COUNT(DISTINCT p.user_id) as unique_authors
      FROM categories cat
      LEFT JOIN post_categories pc ON cat.id = pc.category_id
      LEFT JOIN posts p ON pc.post_id = p.id AND p.created_at >= ?
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      GROUP BY cat.id, cat.name
      ORDER BY post_count DESC
    `;

    return await this.db.executeQuery(query, [startDate]);
  }

  async getModerationStats(startDate, filters) {
    const query = `
      SELECT
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as recent_count
      FROM posts
      GROUP BY status
    `;

    const postsByStatus = await this.db.executeQuery(query, [startDate]);

    const commentStats = await this.db.executeQuery(`
      SELECT
        status,
        COUNT(*) as count
      FROM comments
      WHERE created_at >= ?
      GROUP BY status
    `, [startDate]);

    return {
      postsByStatus,
      commentStats,
      flaggedContent: await this.getFlaggedContentStats(startDate),
      moderationActions: await this.getModerationActionStats(startDate)
    };
  }

  async getFlaggedContentStats(startDate) {
    // Mock flagged content data
    return {
      flaggedPosts: Math.floor(Math.random() * 20),
      flaggedComments: Math.floor(Math.random() * 50),
      resolvedCases: Math.floor(Math.random() * 60),
      pendingReview: Math.floor(Math.random() * 10)
    };
  }

  async getModerationActionStats(startDate) {
    // Mock moderation actions
    return {
      warnings: Math.floor(Math.random() * 30),
      suspensions: Math.floor(Math.random() * 5),
      bans: Math.floor(Math.random() * 2),
      contentRemovals: Math.floor(Math.random() * 25)
    };
  }

  // System Health Monitoring
  async getSystemHealth() {
    return await measurePerformance('AdminDashboard.getSystemHealth', async () => {
      const health = {
        database: await this.checkDatabaseHealth(),
        realtime: await this.checkRealtimeHealth(),
        cache: await this.checkCacheHealth(),
        storage: await this.checkStorageHealth(),
        external: await this.checkExternalServices(),
        performance: await this.getPerformanceMetrics(),
        uptime: process.uptime(),
        timestamp: new Date()
      };

      return health;
    });
  }

  async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await this.db.executeQuery('SELECT 1 as health_check');
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      };
    }
  }

  async checkRealtimeHealth() {
    // Mock realtime health check
    return {
      status: 'healthy',
      connectedUsers: Math.floor(Math.random() * 100),
      activeRooms: Math.floor(Math.random() * 20),
      messageQueue: Math.floor(Math.random() * 50)
    };
  }

  async checkCacheHealth() {
    // Mock cache health check
    return {
      status: 'healthy',
      hitRate: Math.random() * 100,
      memoryUsage: Math.random() * 1024,
      items: Math.floor(Math.random() * 1000)
    };
  }

  async checkStorageHealth() {
    // Mock storage health check
    return {
      status: 'healthy',
      usedSpace: Math.random() * 1024 * 1024,
      availableSpace: Math.random() * 1024 * 1024 * 10,
      fileCount: Math.floor(Math.random() * 5000)
    };
  }

  async checkExternalServices() {
    // Mock external services check
    return {
      emailService: { status: 'healthy', responseTime: '120ms' },
      smsService: { status: 'healthy', responseTime: '80ms' },
      cdn: { status: 'healthy', responseTime: '45ms' }
    };
  }

  async getPerformanceMetrics() {
    const memUsage = process.memoryUsage();

    return {
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
      },
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  // Revenue Analytics (if applicable)
  async getRevenueAnalytics(timeframe = '30d') {
    // Mock revenue data for demonstration
    const startDate = this.getStartDate(timeframe);

    return {
      overview: {
        totalRevenue: Math.floor(Math.random() * 10000),
        monthlyRecurring: Math.floor(Math.random() * 5000),
        oneTimePayments: Math.floor(Math.random() * 3000),
        subscriptionCount: Math.floor(Math.random() * 500)
      },
      trends: await this.getRevenueTrends(startDate),
      byPlan: await this.getRevenueByPlan(startDate),
      churn: await this.getChurnAnalytics(startDate)
    };
  }

  async getRevenueTrends(startDate) {
    // Mock revenue trends
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 500) + 100,
      subscriptions: Math.floor(Math.random() * 10) + 5
    })).reverse();
  }

  async getRevenueByPlan(startDate) {
    return [
      { plan: 'Basic', revenue: Math.floor(Math.random() * 3000), subscribers: Math.floor(Math.random() * 200) },
      { plan: 'Pro', revenue: Math.floor(Math.random() * 5000), subscribers: Math.floor(Math.random() * 100) },
      { plan: 'Enterprise', revenue: Math.floor(Math.random() * 10000), subscribers: Math.floor(Math.random() * 50) }
    ];
  }

  async getChurnAnalytics(startDate) {
    return {
      churnRate: Math.random() * 5,
      churnReasons: [
        { reason: 'Too expensive', count: Math.floor(Math.random() * 20) },
        { reason: 'Missing features', count: Math.floor(Math.random() * 15) },
        { reason: 'Poor support', count: Math.floor(Math.random() * 10) }
      ]
    };
  }

  // Utility methods
  getStartDate(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
      default:
        now.setDate(now.getDate() - 30);
    }
    return now.toISOString();
  }

  get db() {
    return databaseManager;
  }

  // Cache management
  clearCache() {
    this.cache.clear();
    this.cacheTimeouts.clear();
    logger.info('Admin dashboard cache cleared');
  }

  // Real-time data streaming (mock)
  async getRealtimeMetrics() {
    return {
      activeUsers: Math.floor(Math.random() * 1000),
      postsPerMinute: Math.floor(Math.random() * 10),
      commentsPerMinute: Math.floor(Math.random() * 25),
      likesPerMinute: Math.floor(Math.random() * 50),
      serverLoad: Math.random() * 100,
      memoryUsage: Math.random() * 1024,
      timestamp: new Date()
    };
  }

  // Export functionality
  async exportAnalytics(format = 'json') {
    const analytics = {
      users: await this.getUserAnalytics('30d'),
      content: await this.getContentAnalytics('30d'),
      system: await this.getSystemHealth(),
      generatedAt: new Date()
    };

    if (format === 'csv') {
      return this.convertToCSV(analytics);
    }

    return analytics;
  }

  convertToCSV(data) {
    // Simple CSV conversion for demonstration
    return JSON.stringify(data, null, 2);
  }
}

const adminDashboardService = new AdminDashboardService();

module.exports = {
  AdminDashboardService,
  adminDashboardService
};
