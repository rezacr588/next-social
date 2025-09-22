// Post Comments API
import { run, query } from '../../../../lib/db.js';

export default async function handler(req, res) {
  const { id: postId } = req.query;

  if (req.method === 'GET') {
    // Get comments
    try {
      const { page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const comments = await query(
        `SELECT c.id, c.content, c.created_at, u.username, u.id as user_id
         FROM post_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC
         LIMIT ? OFFSET ?`,
        [postId, limitNum, offset]
      );

      res.status(200).json(comments);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Add comment
    const userIdHeader = req.headers['x-user-id'];
    if (!userIdHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const { content } = req.body || {};
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      // Check if post exists
      const posts = await query('SELECT id FROM posts WHERE id = ?', [postId]);
      if (!posts.length) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Create comment
      const result = await run(
        'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [postId, userIdHeader, content.trim()]
      );

      // Get the created comment with user info
      const comments = await query(
        `SELECT c.id, c.content, c.created_at, u.username, u.id as user_id
         FROM post_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`,
        [result.lastID]
      );

      res.status(201).json(comments[0]);
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}