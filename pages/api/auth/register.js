import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { run, query } from '../../../lib/db.js';
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
    const { username, email, password } = req.body || {};
    
    // Input validation
    const validationErrors = [];
    if (!username) validationErrors.push('Username is required');
    if (!email) validationErrors.push('Email is required');
    if (!password) validationErrors.push('Password is required');
    
    if (username && (username.length < 3 || username.length > 50)) {
      validationErrors.push('Username must be between 3 and 50 characters');
    }
    
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      validationErrors.push('Username can only contain letters, numbers, and underscores');
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push('Invalid email format');
    }
    
    if (password && password.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    }
    
    if (validationErrors.length > 0) {
      return validationErrorResponse(res, validationErrors);
    }

    // Check if user already exists
    const existing = await query(
      'SELECT id, email, username FROM users WHERE email = ? OR username = ? LIMIT 1', 
      [email, username]
    );
    
    if (existing.length) {
      const existingUser = existing[0];
      const conflictType = existingUser.email === email ? 'email' : 'username';
      return errorResponse(
        res, 
        [`User with this ${conflictType} already exists`], 
        'Registration failed', 
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12); // Increased rounds for better security
    
    // Create user
    const result = await run(
      'INSERT INTO users (username, email, password_hash, is_active, is_admin, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, passwordHash, 1, 0, 0]
    );

    // Generate JWT token for immediate login
    const tokenPayload = {
      userId: result.lastID,
      email,
      username
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'nexus-social',
      audience: 'nexus-users'
    });

    // Prepare user data (exclude sensitive information)
    const userData = {
      id: result.lastID,
      username,
      email,
      created_at: new Date().toISOString(),
      email_verified: false
    };

    // Send successful response
    return successResponse(
      res, 
      { 
        user: userData, 
        token,
        expiresIn: JWT_EXPIRES_IN 
      }, 
      'User registered successfully', 
      201,
      { registrationTime: new Date().toISOString() }
    );

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle SQLite constraint errors
    if (error.message && error.message.includes('SQLITE_CONSTRAINT')) {
      return errorResponse(res, ['User already exists'], 'Registration failed', 409);
    }
    
    return serverErrorResponse(res, error);
  }
}
