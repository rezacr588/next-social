import { run } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for authentication (mock check)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { content, mediaUrl, mediaType } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Mock post creation
    const newPost = {
      id: Date.now().toString(),
      user_id: 1,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      created_at: new Date().toISOString(),
      username: 'Test User',
      like_count: 0,
      share_count: 0
    };

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
