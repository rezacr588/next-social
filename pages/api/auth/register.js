import bcrypt from 'bcrypt';
import { run, query } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Basic uniqueness check
    const existing = await query('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email, username]);
    if (existing.length) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const user = { id: result.lastID, username, email, created_at: new Date().toISOString() };
    res.status(201).json({ user, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message && error.message.includes('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
