import { query } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Mock feed data for testing
    const mockPosts = [
      {
        id: '1',
        user_id: 1,
        content: 'Welcome to Nexus! This is our first test post.',
        username: 'Nexus Team',
        media_url: null,
        media_type: 'text',
        created_at: new Date().toISOString(),
        like_count: 5,
        share_count: 2
      },
      {
        id: '2',
        user_id: 1,
        content: 'Check out our amazing features!',
        username: 'Nexus Team',
        media_url: null,
        media_type: 'text',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        like_count: 3,
        share_count: 1
      }
    ];

    res.status(200).json(mockPosts);
  } catch (error) {
    console.error('Fetch feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
