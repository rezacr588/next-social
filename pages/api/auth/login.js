const bcrypt = require('bcrypt');
const { query } = require('../../../lib/db.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Mock login - accept any email/password for testing
    const mockUser = {
      id: Date.now(),
      username: 'Test User',
      email
    };

    res.status(200).json({
      user: mockUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
