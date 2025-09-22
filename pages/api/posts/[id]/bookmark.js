import { requireAuth } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { postsService } from '../../../services/postsService.js';
import { auditLogger } from '../../../middleware/logging.js';

const handler = async (req, res) => {
  const { id } = req.query;
  const postId = parseInt(id);
  const userId = req.user.id;

  if (req.method === 'POST') {
    // Bookmark post
    try {
      await postsService.bookmark(userId, postId);
      
      auditLogger('POST_BOOKMARKED', userId, { postId });
      
      res.json({ message: 'Post bookmarked successfully' });
    } catch (error) {
      if (error.message === 'Post not found') {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (error.message === 'Already bookmarked') {
        return res.status(400).json({ error: 'Post already bookmarked' });
      }
      
      console.error('Error bookmarking post:', error);
      res.status(500).json({ error: 'Failed to bookmark post' });
    }
  } else if (req.method === 'DELETE') {
    // Remove bookmark
    try {
      await postsService.removeBookmark(userId, postId);
      
      auditLogger('POST_BOOKMARK_REMOVED', userId, { postId });
      
      res.json({ message: 'Bookmark removed successfully' });
    } catch (error) {
      if (error.message === 'Not bookmarked') {
        return res.status(400).json({ error: 'Post not bookmarked' });
      }
      
      console.error('Error removing bookmark:', error);
      res.status(500).json({ error: 'Failed to remove bookmark' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));