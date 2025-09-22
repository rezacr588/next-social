import { run, query } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Very basic mock auth replaced with simple header-based user resolution (to be replaced with JWT)
  const userIdHeader = req.headers['x-user-id'];
  if (!userIdHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { content, mediaUrl, mediaType } = req.body || {};
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const userRows = await query('SELECT id, username FROM users WHERE id = ? LIMIT 1', [userIdHeader]);
    if (!userRows.length) {
      return res.status(401).json({ error: 'Invalid user' });
    }
    const user = userRows[0];

    const result = await run(
      'INSERT INTO posts (user_id, content, media_url, media_type) VALUES (?, ?, ?, ?)',
      [user.id, content, mediaUrl || null, mediaType || 'text']
    );

    const created = await query('SELECT p.*, ? as username FROM posts p WHERE p.id = ?', [user.username, result.lastID]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
