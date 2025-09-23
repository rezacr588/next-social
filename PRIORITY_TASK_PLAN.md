# Next-Social: Critical Foundation Fixes & Enhancement Plan

## 🚨 Critical Issues Identified

### 1. **Database Schema Misalignment (P0 - Production Blocking)**

- **Problem**: Auth middleware references `is_active` and `is_admin` columns that don't exist in users table
- **Current Schema**: Only has `id`, `username`, `email`, `password_hash`, `created_at`
- **Impact**: Authentication system completely broken, all protected routes failing

### 2. **Missing Development Environment (P0 - Development Blocking)**

- **Problem**: Node.js/npm not installed or not in PATH
- **Impact**: Cannot run, test, or develop the application

### 3. **Inconsistent API Response Format (P1 - Integration Issues)**

- **Problem**: API endpoints return different response structures
- **Impact**: Client-side integration complexity, poor developer experience

### 4. **Security Vulnerabilities (P1 - Security Risk)**

- **Problem**: Hardcoded JWT secrets, no input validation on several endpoints
- **Impact**: Production security risks

## 🎯 Primary Task: Critical Foundation Restoration

### **Objective**: Fix core authentication system and database schema to make the application functional

### **Time Estimate**: 2-3 hours

### **Success Criteria**:

1. ✅ Database schema includes all required columns
2. ✅ Authentication middleware works without errors
3. ✅ Login/register endpoints functional
4. ✅ All API endpoints return consistent response format
5. ✅ Development environment properly configured

---

## 📋 Implementation Plan

### **Phase 1: Environment Setup (15 minutes)**

#### Task 1.1: Install Node.js and Dependencies

```bash
# Install Node.js (if not installed)
# On macOS with Homebrew:
brew install node

# Navigate to project and install dependencies
cd /Users/rezazeraat/Projects/next-social
npm install

# Verify installation
node --version
npm --version
```

#### Task 1.2: Database Initialization Check

```bash
# Initialize database with current schema
npm run init-db

# Verify database exists and check current schema
sqlite3 nexus_social.db ".schema"
```

---

### **Phase 2: Database Schema Fixes (30 minutes)**

#### Task 2.1: Add Missing User Columns

**File**: `lib/db.js`

**Current Schema Issues**:

- Missing `is_active` column (required by auth middleware)
- Missing `is_admin` column (required by auth middleware)
- Missing `email_verified` column (referenced in some endpoints)
- Missing `last_login` column (for security tracking)

**Solution**:

```sql
-- Add missing columns to users table
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login DATETIME;
```

#### Task 2.2: Update Database Schema Definition

Update `SCHEMA_STATEMENTS` in `lib/db.js` to include new columns for future database initializations.

#### Task 2.3: Add Essential Indexes

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
```

#### Task 2.4: Add Missing Tables

Based on codebase analysis, add missing tables referenced in the application:

```sql
-- Comments table (referenced in components)
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes table (referenced in posts)
CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### **Phase 3: Authentication System Fixes (25 minutes)**

#### Task 3.1: Fix JWT Secret Security

**File**: `lib/auth.js`

**Current Issue**: Hardcoded fallback secrets

```javascript
// BEFORE (security risk)
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// AFTER (fail-fast approach)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
```

#### Task 3.2: Update Auth Middleware

**File**: `lib/middleware/auth.js`

**Current Issue**: References non-existent columns

- Update SQL query to handle missing columns gracefully
- Add proper error handling for database errors

#### Task 3.3: Fix Login/Register Endpoints

**Files**: `pages/api/auth/login.js`, `pages/api/auth/register.js`

**Issues**:

- No JWT token generation in login endpoint
- Missing validation
- Inconsistent response format

---

### **Phase 4: API Response Standardization (30 minutes)**

#### Task 4.1: Create Unified Response Utility

**File**: `lib/utils/apiResponse.js` (new file)

```javascript
export const createResponse = (
  data = null,
  message = null,
  errors = null,
  meta = null
) => ({
  success: !errors,
  data,
  message,
  errors: errors ? (Array.isArray(errors) ? errors : [errors]) : null,
  meta: {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    ...meta,
  },
});

export const successResponse = (
  res,
  data,
  message = "Success",
  statusCode = 200,
  meta = null
) => {
  return res.status(statusCode).json(createResponse(data, message, null, meta));
};

export const errorResponse = (
  res,
  errors,
  message = "Error",
  statusCode = 400,
  meta = null
) => {
  return res
    .status(statusCode)
    .json(createResponse(null, message, errors, meta));
};
```

#### Task 4.2: Update Critical Endpoints

Update these endpoints to use standardized responses:

1. `/api/auth/login`
2. `/api/auth/register`
3. `/api/posts`
4. `/api/posts/[id]`
5. `/api/users/me`

---

### **Phase 5: Security Enhancements (20 minutes)**

#### Task 5.1: Input Validation

Add basic input validation to prevent injection attacks:

- Email format validation
- Password strength requirements
- Content length limits
- SQL injection prevention

#### Task 5.2: Environment Variables Setup

**File**: `.env.local` (create if not exists)

```bash
JWT_SECRET=your_super_secure_random_jwt_secret_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_here
DATABASE_URL=sqlite:./nexus_social.db
NODE_ENV=development
```

---

### **Phase 6: Performance Quick Wins (20 minutes)**

#### Task 6.1: Database Connection Optimization

- Implement connection pooling
- Add query timeout handling
- Optimize most common queries

#### Task 6.2: Add Basic Caching

- Implement in-memory caching for user profiles
- Cache frequently accessed posts
- Add cache invalidation strategy

---

### **Phase 7: Testing & Validation (20 minutes)**

#### Task 7.1: Smoke Testing

```bash
# Test database operations
npm run init-db

# Test server startup
npm run dev

# Test critical endpoints
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"testpass123"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpass123"}'
```

#### Task 7.2: Run Existing Tests

```bash
npm run test
```

---

## 🚀 Post-Foundation Enhancements (Future Iterations)

### **Phase 8: Real-time Infrastructure (Low Priority)**

- WebSocket implementation for live notifications
- Real-time chat functionality
- Live user presence indicators

### **Phase 9: Advanced Features**

- File upload system optimization
- Advanced search capabilities
- Content moderation system
- Analytics dashboard completion

### **Phase 10: Performance & Scalability**

- Database migration to PostgreSQL
- Redis caching implementation
- CDN integration for media
- Load balancing preparation

---

## 🔧 Development Workflow

### **Before Starting**:

1. ✅ Backup current database: `cp nexus_social.db nexus_social.db.backup`
2. ✅ Create feature branch: `git checkout -b fix/critical-foundation`
3. ✅ Document current state

### **During Development**:

1. ✅ Test each phase incrementally
2. ✅ Commit changes after each successful phase
3. ✅ Update documentation as you go

### **After Completion**:

1. ✅ Full integration testing
2. ✅ Performance benchmarking
3. ✅ Security audit of changes
4. ✅ Documentation update

---

## 📊 Success Metrics

### **Immediate (Post-Foundation)**:

- ✅ Authentication system functional (0% → 100%)
- ✅ API response consistency (30% → 100%)
- ✅ Database integrity (60% → 100%)
- ✅ Test suite passing (Unknown → >90%)

### **Short-term (1-2 weeks)**:

- ✅ Real-time features implemented
- ✅ Performance optimized (< 200ms API response)
- ✅ Security audit passed
- ✅ Documentation complete

### **Long-term (1-2 months)**:

- ✅ Production-ready deployment
- ✅ Scalability testing complete
- ✅ User acceptance testing passed
- ✅ Monitoring and analytics implemented

---

## 🎯 **IMMEDIATE NEXT STEPS**

1. **Set up development environment** (Node.js, npm)
2. **Fix database schema** (add missing columns)
3. **Fix authentication system** (JWT secrets, middleware)
4. **Standardize API responses** (consistent format)
5. **Test and validate** (ensure everything works)

This plan addresses the most critical issues first and provides a clear path to make the application functional and ready for further development.
