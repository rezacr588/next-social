import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, run } from '../../../lib/db.js';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  serverErrorResponse 
} from '../../../lib/utils/apiResponse.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

// Fail fast if JWT_SECRET is missing
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, ['Method not allowed'], 'Method not allowed', 405);
  }

  try {
    const { email, password } = req.body || {};
    
    // Input validation
    const validationErrors = [];
    if (!email) validationErrors.push('Email is required');
    if (!password) validationErrors.push('Password is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push('Invalid email format');
    }
    
    if (validationErrors.length > 0) {
      return validationErrorResponse(res, validationErrors);
    }

    // Find user by email
    const rows = await query(
      'SELECT id, username, email, password_hash, is_active FROM users WHERE email = ? LIMIT 1', 
      [email]
    );
    
    if (!rows.length) {
      return errorResponse(res, ['Invalid credentials'], 'Authentication failed', 401);
    }

    const userRow = rows[0];
    
    // Check if user is active
    if (!userRow.is_active) {
      return errorResponse(res, ['Account is deactivated'], 'Authentication failed', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userRow.password_hash);
    if (!isValidPassword) {
      return errorResponse(res, ['Invalid credentials'], 'Authentication failed', 401);
    }

    // Update last login
    await run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userRow.id]);

    // Generate JWT token
    const tokenPayload = {
      userId: userRow.id,
      email: userRow.email,
      username: userRow.username
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'nexus-social',
      audience: 'nexus-users'
    });

    // Prepare user data (exclude sensitive information)
    const userData = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email
    };

    // Send successful response
    return successResponse(
      res, 
      { 
        user: userData, 
        token,
        expiresIn: JWT_EXPIRES_IN 
      }, 
      'Login successful', 
      200,
      { loginTime: new Date().toISOString() }
    );

  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse(res, error);
  }
}
