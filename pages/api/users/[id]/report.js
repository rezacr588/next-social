import { requireAuth } from '../../../middleware/auth.js';
import { validationMiddleware } from '../../../middleware/validation.js';
import { asyncHandler } from '../../../middleware/security.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { usersService } from '../../../services/usersService.js';
import { auditLogger } from '../../../middleware/logging.js';

const reportValidation = {
  reason: { required: true, maxLength: 100 },
  description: { maxLength: 500 },
};

const handler = async (req, res) => {
  const userId = req.user.id;
  const { id: targetUserId } = req.query;

  if (req.method === 'POST') {
    // Report user
    try {
      if (parseInt(targetUserId) === userId) {
        return res.status(400).json({ error: 'Cannot report yourself' });
      }

      const { reason, description } = req.body;

      await usersService.report(userId, parseInt(targetUserId), reason, description);
      
      auditLogger('USER_REPORTED', userId, { 
        targetUserId, 
        reason,
        description: description?.substring(0, 100) 
      });
      
      res.json({ message: 'User reported successfully' });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (error.message === 'Already reported') {
        return res.status(400).json({ error: 'User already reported' });
      }
      
      console.error('Error reporting user:', error);
      res.status(500).json({ error: 'Failed to report user' });
    }
  } else if (req.method === 'GET') {
    // Get user reports (admin only)
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const reports = await usersService.getReports(parseInt(targetUserId));
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
};

export default rateLimit()(
  asyncHandler(async (req, res, next) => {
    if (req.method === 'POST') {
      return requireAuth(validationMiddleware(reportValidation)(handler))(req, res, next);
    } else {
      return requireAuth(handler)(req, res, next);
    }
  })
);