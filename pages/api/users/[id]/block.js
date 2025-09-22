import { requireAuth } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { usersService } from '../../../services/usersService.js';
import { auditLogger } from '../../../middleware/logging.js';

const handler = async (req, res) => {
  const userId = req.user.id;
  const { id: targetUserId } = req.query;

  if (req.method === 'POST') {
    // Block user
    try {
      if (parseInt(targetUserId) === userId) {
        return res.status(400).json({ error: 'Cannot block yourself' });
      }

      await usersService.block(userId, parseInt(targetUserId));
      
      auditLogger('USER_BLOCKED', userId, { targetUserId });
      
      res.json({ message: 'User blocked successfully' });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error.message === 'Already blocked') {
        return res.status(400).json({ error: 'User already blocked' });
      }
      
      console.error('Error blocking user:', error);
      res.status(500).json({ error: 'Failed to block user' });
    }
  } else if (req.method === 'DELETE') {
    // Unblock user
    try {
      await usersService.unblock(userId, parseInt(targetUserId));
      
      auditLogger('USER_UNBLOCKED', userId, { targetUserId });
      
      res.json({ message: 'User unblocked successfully' });
    } catch (error) {
      if (error.message === 'Not blocked') {
        return res.status(400).json({ error: 'User not blocked' });
      }
      
      console.error('Error unblocking user:', error);
      res.status(500).json({ error: 'Failed to unblock user' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(requireAuth(asyncHandler(handler)));