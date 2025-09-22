import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { postsService } from '../../services/postsService.js';

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method === 'GET') {
    try {
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const feed = await postsService.getFeed(userId, {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        sortBy,
        sortOrder,
      });

      res.json(feed);
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));