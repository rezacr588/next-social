import { requireAuth } from '../../middleware/auth.js';
import { validationMiddleware } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/security.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { postsService } from '../../services/postsService.js';
import { auditLogger } from '../../middleware/logging.js';

const postValidation = {
  content: { required: true, minLength: 1, maxLength: 5000 },
  title: { maxLength: 200 },
  tags: { maxLength: 500 },
};

const handler = async (req, res) => {
  const { id } = req.query;
  const postId = parseInt(id);

  if (req.method === 'GET') {
    // Get single post
    try {
      const post = await postsService.getById(postId);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json({ post });
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  } else if (req.method === 'PUT') {
    // Update post
    const userId = req.user.id;

    try {
      const post = await postsService.getById(postId);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Only post author can edit
      if (post.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { content, title, tags } = req.body;

      const updateData = {
        content,
        title,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      };

      const updatedPost = await postsService.update(postId, updateData);
      
      auditLogger('POST_UPDATED', userId, { postId });
      
      res.json({ post: updatedPost });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Failed to update post' });
    }
  } else if (req.method === 'DELETE') {
    // Delete post
    const userId = req.user.id;

    try {
      const post = await postsService.getById(postId);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Only post author or admin can delete
      if (post.userId !== userId && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await postsService.delete(postId);
      
      auditLogger('POST_DELETED', userId, { postId, originalAuthor: post.userId });
      
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(
  asyncHandler(async (req, res, next) => {
    if (req.method === 'GET') {
      return handler(req, res);
    } else {
      return requireAuth(
        req.method === 'PUT' ? validationMiddleware(postValidation)(handler) : handler
      )(req, res, next);
    }
  })
);