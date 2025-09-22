// Authentication middleware
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const users = await query('SELECT id, username, email, is_active FROM users WHERE id = ?', [decoded.userId]);
    
    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const users = await query('SELECT id, username, email, is_active FROM users WHERE id = ?', [decoded.userId]);
      
      if (users.length && users[0].is_active) {
        req.user = users[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};