import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { usersService } from '../../services/usersService.js';

const handler = async (req, res) => {
  if (req.method === 'GET') {
    const userId = req.user.id;

    try {
      const { 
        page = 1, 
        limit = 20,
        type = 'all' // 'followers', 'following', or 'all'
      } = req.query;

      let activities;

      switch (type) {
        case 'followers':
          activities = await usersService.getFollowerActivity(userId, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 50),
          });
          break;
        case 'following':
          activities = await usersService.getFollowingActivity(userId, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 50),
          });
          break;
        default:
          activities = await usersService.getActivity(userId, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 50),
          });
      }

      res.json(activities);
    } catch (error) {
      console.error('Error getting user activity:', error);
      res.status(500).json({ error: 'Failed to get user activity' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));