import { requireAuth } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

// Mock notification service
const notificationsService = {
  async getUnreadCount(userId) {
    // Mock implementation
    return { count: 3 };
  },
};

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method === 'GET') {
    // Get unread notification count
    try {
      const result = await notificationsService.getUnreadCount(userId);
      
      res.json({ count: result.count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));