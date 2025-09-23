// Authentication middleware
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authErrorResponse, serverErrorResponse } from '../utils/apiResponse.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast if JWT_SECRET is missing
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return authErrorResponse(res, 'Access token required');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database with all required fields
    const users = await query(
      'SELECT id, username, email, is_active, is_admin, email_verified FROM users WHERE id = ?', 
      [decoded.userId]
    );
    
    if (!users.length) {
      return authErrorResponse(res, 'Invalid token - user not found');
    }
    
    const user = users[0];
    
    if (!user.is_active) {
      return authErrorResponse(res, 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return authErrorResponse(res, 'Token has expired');
    }
    
    if (error.name === 'JsonWebTokenError') {
      return authErrorResponse(res, 'Invalid token');
    }
    
    return serverErrorResponse(res, error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const users = await query(
        'SELECT id, username, email, is_active, is_admin, email_verified FROM users WHERE id = ?', 
        [decoded.userId]
      );
      
      if (users.length && users[0].is_active) {
        req.user = users[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth if token is invalid in optional auth
    console.log('Optional auth failed:', error.message);
    next();
  }
};

export const requireAdmin = async (req, res, next) => {
  // First authenticate the user
  authenticateToken(req, res, (err) => {
    if (err) return;
    
    // Check if user is admin
    if (!req.user || !req.user.is_admin) {
      return authErrorResponse(res, 'Admin access required', 403);
    }
    
    next();
  });
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return authErrorResponse(res, 'Authentication required');
  }
  next();
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};