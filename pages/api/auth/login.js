import bcrypt from 'bcrypt';
import { query } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const rows = await query('SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userRow = rows[0];
    const valid = await bcrypt.compare(password, userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = { id: userRow.id, username: userRow.username, email: userRow.email };
    res.status(200).json({ user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
