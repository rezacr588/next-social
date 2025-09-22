import { query } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept either page/limit or cursor style later; for now simple page.
  let { page = '1', limit = '10' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  try {
    const rows = await query(
      `SELECT p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.like_count, p.share_count, u.username
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limitNum, offset]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
