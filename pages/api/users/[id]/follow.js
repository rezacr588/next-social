import { requireAuth } from '../../../middleware/auth.js';
import { validationMiddleware } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { usersService } from '../../../services/usersService.js';
import { auditLogger } from '../../../middleware/logging.js';

const handler = async (req, res) => {
  const userId = req.user.id;
  const { id: targetUserId } = req.query;

  if (req.method === 'POST') {
    // Follow user
    try {
      if (parseInt(targetUserId) === userId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      await usersService.follow(userId, parseInt(targetUserId));
      
      auditLogger('USER_FOLLOWED', userId, { targetUserId });
      
      res.json({ message: 'User followed successfully' });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error.message === 'Already following') {
        return res.status(400).json({ error: 'Already following this user' });
      }
      
      console.error('Error following user:', error);
      res.status(500).json({ error: 'Failed to follow user' });
    }
  } else if (req.method === 'DELETE') {
    // Unfollow user
    try {
      await usersService.unfollow(userId, parseInt(targetUserId));
      
      auditLogger('USER_UNFOLLOWED', userId, { targetUserId });
      
      res.json({ message: 'User unfollowed successfully' });
    } catch (error) {
      if (error.message === 'Not following') {
        return res.status(400).json({ error: 'Not following this user' });
      }
      
      console.error('Error unfollowing user:', error);
      res.status(500).json({ error: 'Failed to unfollow user' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));