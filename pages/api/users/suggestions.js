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
        limit = 10,
        exclude = '' // Comma-separated list of user IDs to exclude
      } = req.query;

      const excludeIds = exclude ? exclude.split(',').map(id => parseInt(id)).filter(Boolean) : [];
      
      const suggestions = await usersService.getSuggestions(userId, {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 20), // Max 20 suggestions per page
        excludeIds,
      });

      res.json(suggestions);
    } catch (error) {
      console.error('Error getting user suggestions:', error);
      res.status(500).json({ error: 'Failed to get user suggestions' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));