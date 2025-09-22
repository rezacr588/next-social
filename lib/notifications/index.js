// lib/notifications/index.js - Advanced Notification System
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { logger } = require('../logger.js');
const { databaseManager } = require('../database/index.js');
const { memoize, retry, chunk } = require('../utils/index.js');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.smsClient = null;
    this.notificationQueue = new Map();
    this.templates = new Map();
    this.providers = new Map();

    this.initializeProviders();
    this.loadTemplates();
    this.startQueueProcessor();
  }

  initializeProviders() {
    // Email configuration
    if (process.env.EMAIL_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      this.providers.set('email', {
        name: 'Email',
        enabled: true,
        rateLimit: 100, // emails per hour
        lastUsed: null
      });
    }

    // SMS configuration
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.smsClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      this.providers.set('sms', {
        name: 'SMS',
        enabled: true,
        rateLimit: 50, // SMS per hour
        lastUsed: null
      });
    }

    // Push notification configuration (mock)
    this.providers.set('push', {
      name: 'Push Notifications',
      enabled: true,
      rateLimit: 1000, // push notifications per hour
      lastUsed: null
    });

    // In-app notification (always available)
    this.providers.set('inapp', {
      name: 'In-App Notifications',
      enabled: true,
      rateLimit: Infinity,
      lastUsed: null
    });

    logger.info('Notification providers initialized', {
      providers: Array.from(this.providers.keys())
    });
  }

  loadTemplates() {
    // Email templates
    this.templates.set('welcome', {
      subject: 'Welcome to Nexus Social!',
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to Nexus Social, ${data.username}!</h1>
          <p>Thank you for joining our community. Your account has been successfully created.</p>
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Account Details:</h3>
            <p><strong>Username:</strong> ${data.username}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Joined:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Start exploring and connecting with others!</p>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}"
             style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            Visit Nexus Social
          </a>
        </div>
      `
    });

    this.templates.set('password-reset', {
      subject: 'Password Reset Request - Nexus Social',
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Password Reset Request</h1>
          <p>Hello ${data.username},</p>
          <p>We received a request to reset your password for your Nexus Social account.</p>
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Reset Code:</strong> <span style="font-size: 24px; font-weight: bold; color: #7c3aed;">${data.resetCode}</span></p>
            <p><em>This code will expire in 15 minutes.</em></p>
          </div>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
      `
    });

    this.templates.set('mention', {
      subject: 'You were mentioned in a post - Nexus Social',
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>New Mention</h1>
          <p>Hello ${data.username},</p>
          <p><strong>${data.mentionedBy}</strong> mentioned you in a post:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0;">
            "${data.postContent.substring(0, 200)}${data.postContent.length > 200 ? '...' : ''}"
          </div>
          <a href="${data.postUrl}"
             style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            View Post
          </a>
        </div>
      `
    });

    // SMS templates
    this.templates.set('sms-verification', {
      text: (data) => `Nexus Social: Your verification code is ${data.code}. Valid for 10 minutes.`
    });

    this.templates.set('sms-password-reset', {
      text: (data) => `Nexus Social: Password reset code: ${data.code}. Expires in 15 minutes.`
    });

    logger.info('Notification templates loaded', { count: this.templates.size });
  }

  startQueueProcessor() {
    // Process notification queue every 5 seconds
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000);

    // Clean up old queued notifications every hour
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 60 * 60 * 1000);

    logger.info('Notification queue processor started');
  }

  // Advanced notification creation
  async createNotification(data) {
    try {
      const notification = {
        id: this.generateNotificationId(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        priority: data.priority || 'normal',
        channels: data.channels || ['inapp'],
        scheduledFor: data.scheduledFor || new Date(),
        expiresAt: data.expiresAt,
        createdAt: new Date()
      };

      // Validate notification
      await this.validateNotification(notification);

      // Queue notification for processing
      if (!this.notificationQueue.has(notification.userId)) {
        this.notificationQueue.set(notification.userId, []);
      }

      this.notificationQueue.get(notification.userId).push(notification);

      // Save to database
      await this.saveNotificationToDatabase(notification);

      logger.debug('Notification created', {
        id: notification.id,
        userId: notification.userId,
        type: notification.type
      });

      return notification;
    } catch (error) {
      logger.error('Error creating notification', { error, data });
      throw error;
    }
  }

  // Advanced notification processing
  async processNotificationQueue() {
    for (const [userId, notifications] of this.notificationQueue.entries()) {
      if (notifications.length === 0) continue;

      try {
        // Process notifications in batches
        const batch = notifications.splice(0, 5); // Process 5 at a time

        for (const notification of batch) {
          await this.processSingleNotification(notification);
        }

        // Remove user from queue if empty
        if (this.notificationQueue.get(userId).length === 0) {
          this.notificationQueue.delete(userId);
        }
      } catch (error) {
        logger.error('Error processing notification batch', { error, userId });
      }
    }
  }

  async processSingleNotification(notification) {
    try {
      const userPreferences = await this.getUserNotificationPreferences(notification.userId);

      // Check if notification should be sent based on user preferences
      if (!this.shouldSendNotification(notification, userPreferences)) {
        return;
      }

      const results = [];

      // Send through each requested channel
      for (const channel of notification.channels) {
        try {
          const result = await this.sendByChannel(notification, channel);
          results.push({ channel, success: true, result });
        } catch (error) {
          logger.error(`Failed to send ${channel} notification`, {
            error,
            notificationId: notification.id
          });
          results.push({ channel, success: false, error: error.message });
        }
      }

      // Update notification status
      await this.updateNotificationStatus(notification.id, {
        sentAt: new Date(),
        deliveryStatus: results
      });

      logger.debug('Notification processed', {
        id: notification.id,
        channels: results
      });
    } catch (error) {
      logger.error('Error processing single notification', {
        error,
        notificationId: notification.id
      });
    }
  }

  // Multi-channel notification sending
  async sendByChannel(notification, channel) {
    const provider = this.providers.get(channel);

    if (!provider || !provider.enabled) {
      throw new Error(`Channel ${channel} not available`);
    }

    // Rate limiting check
    if (!this.checkRateLimit(channel, notification.userId)) {
      throw new Error(`Rate limit exceeded for channel ${channel}`);
    }

    switch (channel) {
      case 'email':
        return await this.sendEmailNotification(notification);
      case 'sms':
        return await this.sendSMSNotification(notification);
      case 'push':
        return await this.sendPushNotification(notification);
      case 'inapp':
        return await this.sendInAppNotification(notification);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  // Email notifications
  async sendEmailNotification(notification) {
    if (!this.emailTransporter) {
      throw new Error('Email provider not configured');
    }

    const template = this.templates.get(notification.type);
    if (!template) {
      throw new Error(`No template found for notification type: ${notification.type}`);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@nexus.com',
      to: notification.data.email,
      subject: template.subject,
      html: template.html(notification.data)
    };

    const result = await this.emailTransporter.sendMail(mailOptions);

    this.providers.get('email').lastUsed = new Date();

    return {
      messageId: result.messageId,
      provider: 'email',
      timestamp: new Date()
    };
  }

  // SMS notifications
  async sendSMSNotification(notification) {
    if (!this.smsClient) {
      throw new Error('SMS provider not configured');
    }

    const template = this.templates.get(`sms-${notification.type}`) ||
                     this.templates.get(notification.type);

    if (!template || !template.text) {
      throw new Error(`No SMS template found for notification type: ${notification.type}`);
    }

    const result = await this.smsClient.messages.create({
      body: template.text(notification.data),
      to: notification.data.phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    this.providers.get('sms').lastUsed = new Date();

    return {
      messageId: result.sid,
      provider: 'sms',
      timestamp: new Date()
    };
  }

  // Push notifications (mock implementation)
  async sendPushNotification(notification) {
    // Mock push notification service
    const result = {
      id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      timestamp: new Date()
    };

    this.providers.get('push').lastUsed = new Date();

    return {
      messageId: result.id,
      provider: 'push',
      timestamp: new Date()
    };
  }

  // In-app notifications
  async sendInAppNotification(notification) {
    // This would typically send to the user's active WebSocket connection
    const result = {
      id: notification.id,
      status: 'delivered',
      timestamp: new Date()
    };

    return {
      messageId: notification.id,
      provider: 'inapp',
      timestamp: new Date()
    };
  }

  // Bulk notifications
  async sendBulkNotification(recipients, notificationData) {
    const results = [];

    // Process in chunks to avoid overwhelming the system
    const chunks = chunk(recipients, 10);

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(recipient =>
          this.createNotification({
            ...notificationData,
            userId: recipient.userId,
            data: { ...notificationData.data, ...recipient.data }
          })
        )
      );

      results.push(...chunkResults);
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('Bulk notification completed', { successful, failed, total: recipients.length });

    return {
      successful,
      failed,
      total: recipients.length,
      results
    };
  }

  // Advanced notification scheduling
  async scheduleNotification(notificationData, scheduledTime) {
    const notification = await this.createNotification({
      ...notificationData,
      scheduledFor: new Date(scheduledTime),
      status: 'scheduled'
    });

    // In a real implementation, this would be added to a job queue
    setTimeout(() => {
      this.processSingleNotification(notification);
    }, new Date(scheduledTime) - new Date());

    return notification;
  }

  // Notification templates management
  async createTemplate(type, template) {
    this.templates.set(type, template);
    await this.saveTemplateToDatabase(type, template);

    logger.info('Notification template created', { type });
    return template;
  }

  async updateTemplate(type, template) {
    this.templates.set(type, template);
    await this.updateTemplateInDatabase(type, template);

    logger.info('Notification template updated', { type });
    return template;
  }

  // User preferences management
  async setUserNotificationPreferences(userId, preferences) {
    await this.saveUserPreferencesToDatabase(userId, preferences);

    logger.info('User notification preferences updated', { userId });
    return preferences;
  }

  async getUserNotificationPreferences(userId) {
    const preferences = await this.getUserPreferencesFromDatabase(userId);

    return {
      email: preferences?.email ?? true,
      sms: preferences?.sms ?? false,
      push: preferences?.push ?? true,
      inapp: preferences?.inapp ?? true,
      quietHours: preferences?.quietHours ?? { start: '22:00', end: '08:00' },
      frequency: preferences?.frequency ?? 'immediate'
    };
  }

  // Notification analytics
  async getNotificationAnalytics(timeframe = '7d') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    const analytics = {
      totalSent: 0,
      byChannel: {},
      byType: {},
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      timeRange: timeframe
    };

    // Mock analytics data
    analytics.totalSent = await this.getNotificationCount(startDate);
    analytics.byChannel = await this.getChannelBreakdown(startDate);
    analytics.byType = await this.getTypeBreakdown(startDate);

    return analytics;
  }

  // Utility methods
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateNotification(notification) {
    if (!notification.userId) {
      throw new Error('Notification must have a userId');
    }

    if (!notification.type) {
      throw new Error('Notification must have a type');
    }

    if (!notification.title) {
      throw new Error('Notification must have a title');
    }

    return true;
  }

  shouldSendNotification(notification, preferences) {
    const now = new Date();
    const hour = now.getHours();
    const quietStart = parseInt(preferences.quietHours.start.split(':')[0]);
    const quietEnd = parseInt(preferences.quietHours.end.split(':')[0]);

    // Check quiet hours
    if (hour >= quietStart || hour < quietEnd) {
      return false;
    }

    // Check channel preferences
    return notification.channels.some(channel => preferences[channel]);
  }

  checkRateLimit(channel, userId) {
    const provider = this.providers.get(channel);
    if (!provider || provider.rateLimit === Infinity) return true;

    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const key = `${channel}:${userId}`;

    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, []);
    }

    const timestamps = this.rateLimitStore.get(key);
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= provider.rateLimit) {
      return false;
    }

    recent.push(now);
    this.rateLimitStore.set(key, recent);

    return true;
  }

  // Database operations (mock implementations)
  async saveNotificationToDatabase(notification) {
    // Mock database save
    logger.debug('Notification saved to database', { id: notification.id });
    return notification;
  }

  async updateNotificationStatus(notificationId, status) {
    // Mock status update
    logger.debug('Notification status updated', { id: notificationId, status });
    return status;
  }

  async saveTemplateToDatabase(type, template) {
    // Mock template save
    logger.debug('Template saved to database', { type });
    return template;
  }

  async updateTemplateInDatabase(type, template) {
    // Mock template update
    logger.debug('Template updated in database', { type });
    return template;
  }

  async saveUserPreferencesToDatabase(userId, preferences) {
    // Mock preferences save
    logger.debug('User preferences saved', { userId });
    return preferences;
  }

  async getUserPreferencesFromDatabase(userId) {
    // Mock preferences retrieval
    return {
      email: true,
      sms: false,
      push: true,
      inapp: true,
      quietHours: { start: '22:00', end: '08:00' },
      frequency: 'immediate'
    };
  }

  async getNotificationCount(startDate) {
    // Mock count retrieval
    return Math.floor(Math.random() * 1000);
  }

  async getChannelBreakdown(startDate) {
    // Mock channel breakdown
    return {
      email: Math.floor(Math.random() * 500),
      sms: Math.floor(Math.random() * 100),
      push: Math.floor(Math.random() * 800),
      inapp: Math.floor(Math.random() * 900)
    };
  }

  async getTypeBreakdown(startDate) {
    // Mock type breakdown
    return {
      welcome: Math.floor(Math.random() * 100),
      mention: Math.floor(Math.random() * 200),
      'password-reset': Math.floor(Math.random() * 50),
      system: Math.floor(Math.random() * 150)
    };
  }

  cleanupOldNotifications() {
    // Clean up old notifications from queue
    for (const [userId, notifications] of this.notificationQueue.entries()) {
      const validNotifications = notifications.filter(n =>
        new Date(n.scheduledFor) > new Date()
      );

      if (validNotifications.length === 0) {
        this.notificationQueue.delete(userId);
      } else {
        this.notificationQueue.set(userId, validNotifications);
      }
    }

    logger.debug('Old notifications cleaned up');
  }

  // Public API methods
  getProviders() {
    return Array.from(this.providers.entries()).map(([key, config]) => ({
      name: key,
      ...config
    }));
  }

  getTemplates() {
    return Array.from(this.templates.entries()).map(([key, template]) => ({
      type: key,
      subject: template.subject,
      channels: template.text ? ['sms'] : ['email']
    }));
  }

  getQueueStatus() {
    const status = {
      totalQueued: 0,
      byUser: {},
      oldestNotification: null,
      newestNotification: null
    };

    for (const [userId, notifications] of this.notificationQueue.entries()) {
      status.totalQueued += notifications.length;
      status.byUser[userId] = notifications.length;
    }

    return status;
  }

  // Advanced notification types
  async sendWelcomeNotification(userId, userData) {
    return await this.createNotification({
      userId,
      type: 'welcome',
      title: 'Welcome to Nexus Social!',
      message: `Welcome ${userData.username}! Your account has been created successfully.`,
      channels: ['email', 'inapp'],
      data: userData
    });
  }

  async sendPasswordResetNotification(userId, userData, resetCode) {
    return await this.createNotification({
      userId,
      type: 'password-reset',
      title: 'Password Reset Request',
      message: 'A password reset code has been sent to your email.',
      channels: ['email', 'sms'],
      data: { ...userData, resetCode }
    });
  }

  async sendMentionNotification(userId, mentionData) {
    return await this.createNotification({
      userId,
      type: 'mention',
      title: 'You were mentioned',
      message: `${mentionData.mentionedBy} mentioned you in a post`,
      channels: ['email', 'inapp', 'push'],
      data: mentionData
    });
  }

  async sendSystemNotification(userId, title, message, channels = ['inapp']) {
    return await this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      channels,
      priority: 'high'
    });
  }
}

const notificationService = new NotificationService();

module.exports = {
  NotificationService,
  notificationService
};
