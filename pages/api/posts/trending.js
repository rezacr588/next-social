import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { postsService } from '../../services/postsService.js';

const handler = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const trending = await postsService.getTrending({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        sortBy,
        sortOrder,
      });

      res.json(trending);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      res.status(500).json({ error: 'Failed to fetch trending posts' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(asyncHandler(handler));