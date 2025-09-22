import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { usersService } from '../../services/usersService.js';

const handler = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { 
        q, 
        page = 1, 
        limit = 20,
        sortBy = 'username',
        sortOrder = 'asc'
      } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const results = await usersService.search(q, {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50), // Max 50 results per page
        sortBy,
        sortOrder,
      });

      res.json(results);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(asyncHandler(handler));