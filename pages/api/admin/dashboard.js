import { query } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get basic stats from database
    const [userCount, postCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM posts')
    ]);

    // Get recent posts for activity
    const recentPosts = await query(
      `SELECT p.content, u.username, p.created_at 
       FROM posts p 
       JOIN users u ON u.id = p.user_id 
       ORDER BY p.created_at DESC 
       LIMIT 5`
    );

    const recentActivity = recentPosts.map(post => ({
      type: 'post',
      description: `${post.username} created a new post`,
      timestamp: new Date(post.created_at).toLocaleString()
    }));

    const stats = {
      totalUsers: userCount[0]?.count || 0,
      totalPosts: postCount[0]?.count || 0,
      activeUsers: Math.floor((userCount[0]?.count || 0) * 0.7), // Mock active users as 70% of total
      recentActivity
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}