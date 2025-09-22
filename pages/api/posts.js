import { requireAuth } from '../middleware/auth.js';
import { validationMiddleware } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/security.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { postsService } from '../services/postsService.js';
import { auditLogger } from '../middleware/logging.js';

const postValidation = {
  content: { required: true, minLength: 1, maxLength: 5000 },
  title: { maxLength: 200 },
  tags: { maxLength: 500 },
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    // Get posts feed
    try {
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        userId,
        tag,
        search
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        sortBy,
        sortOrder,
        userId: userId ? parseInt(userId) : undefined,
        tag,
        search,
      };

      const posts = await postsService.getAll(options);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  } else if (req.method === 'POST') {
    // Create new post
    const userId = req.user.id;

    try {
      const { content, title, tags, mediaUrl, mediaType } = req.body;

      const postData = {
        content,
        title,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        mediaUrl,
        mediaType,
        userId,
      };

      const post = await postsService.create(postData);
      
      auditLogger('POST_CREATED', userId, { postId: post.id });
      
      res.status(201).json({ post });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(
  asyncHandler(async (req, res, next) => {
    if (req.method === 'POST') {
      return requireAuth(validationMiddleware(postValidation)(handler))(req, res, next);
    } else {
      return handler(req, res);
    }
  })
);