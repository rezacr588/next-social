import { requireAuth } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { auditLogger } from '../../../middleware/logging.js';

// Mock notification service
const notificationsService = {
  async markAllAsRead(userId) {
    // Mock implementation
    return { count: 5 }; // Number of notifications marked as read
  },
};

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method === 'PUT') {
    // Mark all notifications as read
    try {
      const result = await notificationsService.markAllAsRead(userId);
      
      auditLogger('ALL_NOTIFICATIONS_READ', userId, { count: result.count });
      
      res.json({ 
        message: 'All notifications marked as read',
        count: result.count 
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));