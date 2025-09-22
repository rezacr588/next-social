import { query } from '../../../lib/db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const users = await query('SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1', [id]);
      if (!users.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];
      // Add additional profile fields (bio, avatar could be added to schema later)
      user.bio = `Welcome to ${user.username}'s profile!`;
      user.avatar = null;
      user.joinedAt = user.created_at;

      res.status(200).json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}