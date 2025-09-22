import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const handler = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { 
        limit = 20,
        timeframe = '24h' // 1h, 24h, 7d, 30d
      } = req.query;

      // Mock trending tags data - in real app, this would come from database
      const trendingTags = [
        { tag: 'javascript', count: 1234, change: '+15%' },
        { tag: 'react', count: 987, change: '+8%' },
        { tag: 'nextjs', count: 654, change: '+22%' },
        { tag: 'webdev', count: 543, change: '+5%' },
        { tag: 'programming', count: 432, change: '+12%' },
        { tag: 'css', count: 321, change: '-2%' },
        { tag: 'frontend', count: 298, change: '+18%' },
        { tag: 'backend', count: 245, change: '+7%' },
        { tag: 'database', count: 198, change: '+3%' },
        { tag: 'api', count: 167, change: '+25%' },
      ].slice(0, parseInt(limit));

      res.json({ tags: trendingTags, timeframe });
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      res.status(500).json({ error: 'Failed to fetch trending tags' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(asyncHandler(handler));