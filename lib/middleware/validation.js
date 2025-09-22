// Input validation and sanitization middleware
import validator from 'validator';

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return validator.escape(input)
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const validateUsername = (username) => {
  // 3-30 characters, alphanumeric and underscores only
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username);
};

export const validatePost = (content) => {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 5000;
};

export const validateComment = (content) => {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 1000;
};

export const sanitizePost = (post) => {
  return {
    ...post,
    content: sanitizeInput(post.content),
    title: post.title ? sanitizeInput(post.title) : undefined,
  };
};

export const sanitizeUser = (user) => {
  return {
    ...user,
    username: user.username ? sanitizeInput(user.username) : undefined,
    email: user.email ? validator.normalizeEmail(user.email) : undefined,
    firstName: user.firstName ? sanitizeInput(user.firstName) : undefined,
    lastName: user.lastName ? sanitizeInput(user.lastName) : undefined,
    bio: user.bio ? sanitizeInput(user.bio) : undefined,
  };
};

export const validationMiddleware = (validationRules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(validationRules)) {
      const value = req.body[field];

      if (rules.required && (!value || value.toString().trim() === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (!value && !rules.required) continue;

      if (rules.type === 'email' && !validateEmail(value)) {
        errors.push(`${field} must be a valid email`);
      }

      if (rules.type === 'password' && !validatePassword(value)) {
        errors.push(`${field} must be at least 8 characters with uppercase, lowercase, and number`);
      }

      if (rules.type === 'username' && !validateUsername(value)) {
        errors.push(`${field} must be 3-30 characters, alphanumeric and underscores only`);
      }

      if (rules.minLength && value.toString().length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && value.toString().length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Sanitize inputs
    for (const field in req.body) {
      if (typeof req.body[field] === 'string') {
        req.body[field] = sanitizeInput(req.body[field]);
      }
    }

    next();
  };
};