import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const handler = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { 
        q, 
        page = 1, 
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc',
        type = 'all', // 'posts', 'users', 'all'
        dateRange = 'all' // 'day', 'week', 'month', 'year', 'all'
      } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      // Mock search results - in real app, this would use search service
      const mockResults = {
        posts: [
          {
            id: 1,
            title: 'Getting started with React',
            content: 'Learn the basics of React development...',
            author: 'john_doe',
            createdAt: new Date().toISOString(),
            likes: 45,
            comments: 12,
          },
          {
            id: 2,
            title: 'Advanced JavaScript concepts',
            content: 'Deep dive into JavaScript...',
            author: 'jane_smith',
            createdAt: new Date().toISOString(),
            likes: 78,
            comments: 23,
          },
        ],
        users: [
          {
            id: 1,
            username: 'john_doe',
            firstName: 'John',
            lastName: 'Doe',
            avatar: null,
            followers: 150,
          },
          {
            id: 2,
            username: 'jane_smith',
            firstName: 'Jane',
            lastName: 'Smith',
            avatar: null,
            followers: 230,
          },
        ],
        totalPosts: 25,
        totalUsers: 5,
      };

      const results = {
        query: q,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        type,
        dateRange,
      };

      if (type === 'posts' || type === 'all') {
        results.posts = mockResults.posts;
        results.totalPosts = mockResults.totalPosts;
      }

      if (type === 'users' || type === 'all') {
        results.users = mockResults.users;
        results.totalUsers = mockResults.totalUsers;
      }

      res.json(results);
    } catch (error) {
      console.error('Error performing search:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(asyncHandler(handler));