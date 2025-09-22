import { requireAuth } from '../../../middleware/auth.js';
import { validationMiddleware } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { postsService } from '../../../services/postsService.js';
import { auditLogger } from '../../../middleware/logging.js';

const shareValidation = {
  content: { maxLength: 500 },
  platform: { required: false },
};

const handler = async (req, res) => {
  const { id } = req.query;
  const postId = parseInt(id);
  const userId = req.user.id;

  if (req.method === 'POST') {
    // Share post
    try {
      const { content, platform } = req.body;

      const shareData = {
        originalPostId: postId,
        content,
        platform,
        userId,
      };

      const share = await postsService.share(shareData);
      
      auditLogger('POST_SHARED', userId, { 
        postId, 
        shareId: share.id,
        platform 
      });
      
      res.status(201).json({ share });
    } catch (error) {
      if (error.message === 'Post not found') {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      console.error('Error sharing post:', error);
      res.status(500).json({ error: 'Failed to share post' });
    }
  } else if (req.method === 'GET') {
    // Get post shares
    try {
      const { page = 1, limit = 20 } = req.query;

      const shares = await postsService.getShares(postId, {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
      });

      res.json(shares);
    } catch (error) {
      console.error('Error fetching shares:', error);
      res.status(500).json({ error: 'Failed to fetch shares' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(
  asyncHandler(async (req, res, next) => {
    if (req.method === 'POST') {
      return requireAuth(validationMiddleware(shareValidation)(handler))(req, res, next);
    } else {
      return handler(req, res);
    }
  })
);