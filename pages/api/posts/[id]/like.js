// Post Like API
import { run, query } from '../../../../lib/db.js';

export default async function handler(req, res) {
  const { id: postId } = req.query;
  const userIdHeader = req.headers['x-user-id'];

  if (!userIdHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'POST') {
    // Like post
    try {
      // Check if post exists
      const posts = await query('SELECT id FROM posts WHERE id = ?', [postId]);
      if (!posts.length) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if already liked
      const existingLike = await query(
        'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userIdHeader]
      );

      if (existingLike.length) {
        return res.status(400).json({ error: 'Post already liked' });
      }

      // Create like
      await run(
        'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
        [postId, userIdHeader]
      );

      // Update like count
      await run(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = ?',
        [postId]
      );

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Like post error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Unlike post
    try {
      const result = await run(
        'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userIdHeader]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Like not found' });
      }

      // Update like count
      await run(
        'UPDATE posts SET like_count = like_count - 1 WHERE id = ?',
        [postId]
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Unlike post error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}