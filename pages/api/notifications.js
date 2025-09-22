import { requireAuth } from '../../middleware/auth.js';
import { validationMiddleware } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { auditLogger } from '../../middleware/logging.js';

const notificationValidation = {
  title: { required: true, maxLength: 100 },
  message: { required: true, maxLength: 500 },
  type: { required: true },
};

// Mock notification service - in real app, this would be a proper service
const notificationsService = {
  async getAll(userId, options = {}) {
    const { page = 1, limit = 20, type, unreadOnly = false } = options;
    
    // Mock notifications data
    const notifications = [
      {
        id: 1,
        userId,
        type: 'like',
        title: 'New like on your post',
        message: 'john_doe liked your post "Getting started with React"',
        read: false,
        createdAt: new Date().toISOString(),
        data: { postId: 123, likerId: 456 },
      },
      {
        id: 2,
        userId,
        type: 'comment',
        title: 'New comment on your post',
        message: 'jane_smith commented on your post',
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        data: { postId: 123, commentId: 789 },
      },
      {
        id: 3,
        userId,
        type: 'follow',
        title: 'New follower',
        message: 'alex_wilson is now following you',
        read: false,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        data: { followerId: 321 },
      },
    ];

    let filtered = notifications;
    if (type) {
      filtered = filtered.filter(n => n.type === type);
    }
    if (unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    return {
      notifications: filtered,
      total: filtered.length,
      page,
      limit,
      hasMore: false,
    };
  },

  async markAsRead(userId, notificationId) {
    // Mock implementation
    return { success: true };
  },

  async markAllAsRead(userId) {
    // Mock implementation
    return { success: true };
  },

  async delete(userId, notificationId) {
    // Mock implementation
    return { success: true };
  },

  async create(notification) {
    // Mock implementation
    return { id: Date.now(), ...notification };
  },
};

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method === 'GET') {
    // Get notifications
    try {
      const { 
        page = 1, 
        limit = 20,
        type,
        unreadOnly = false
      } = req.query;

      const notifications = await notificationsService.getAll(userId, {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        type,
        unreadOnly: unreadOnly === 'true',
      });

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  } else if (req.method === 'POST') {
    // Create notification (admin only)
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const { title, message, type, targetUserIds, data } = req.body;

      const notifications = [];
      const userIds = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];

      for (const targetUserId of userIds) {
        const notification = await notificationsService.create({
          userId: targetUserId,
          title,
          message,
          type,
          data,
        });
        notifications.push(notification);
      }

      auditLogger('NOTIFICATIONS_CREATED', userId, { 
        count: notifications.length,
        type,
        targetUserIds: userIds 
      });

      res.status(201).json({ notifications });
    } catch (error) {
      console.error('Error creating notifications:', error);
      res.status(500).json({ error: 'Failed to create notifications' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(
  asyncHandler(async (req, res, next) => {
    if (req.method === 'POST') {
      return requireAuth(validationMiddleware(notificationValidation)(handler))(req, res, next);
    } else {
      return requireAuth(handler)(req, res, next);
    }
  })
);