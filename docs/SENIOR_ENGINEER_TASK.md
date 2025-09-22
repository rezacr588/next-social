# Senior Software Engineer Task: Next-Social Platform Enhancement

## Project Overview

Next-Social is a modern social media platform built with Next.js, React, and SQLite, featuring real-time interactions, content moderation, and advanced analytics. The codebase currently has 200+ files with comprehensive API infrastructure, UI components, and admin dashboards.

## Task Scope

You are being assigned to enhance the platform's architecture, fix critical issues, and implement advanced features that require senior-level engineering expertise. This is a **2-hour sprint challenge** that will test your ability to quickly identify, prioritize, and implement high-impact solutions under time pressure.

## Primary Objectives (2-Hour Sprint)

### 1. Critical Security Fixes (30 minutes) - MUST DO

**Priority: P0 - Blocking Production**

- **Issue**: Authentication system broken due to missing database columns
- **Quick Fixes**:
  - Add missing `is_active` and `is_admin` columns to users table
  - Fix JWT secret fallback (fail-fast on missing env)
  - Patch auth middleware to handle missing columns gracefully
  - Add basic input validation to prevent injection attacks

### 2. Database Schema Corrections (20 minutes) - MUST DO

**Priority: P0 - Data Integrity**

- **Issue**: Schema inconsistencies causing runtime errors
- **Quick Fixes**:
  - Run ALTER TABLE statements to add missing columns
  - Add basic foreign key constraints
  - Create essential indexes for performance
  - Fix any immediate data integrity issues

### 3. API Response Standardization (25 minutes) - HIGH VALUE

**Priority: P1 - Client Integration**

- **Issue**: Inconsistent API responses breaking client expectations
- **Quick Fixes**:
  - Create unified response wrapper utility
  - Update 3-5 critical endpoints to use standard format
  - Add basic error handling middleware
  - Document response contract

### 4. Performance Quick Wins (20 minutes) - HIGH IMPACT

**Priority: P1 - User Experience**

- **Issue**: Synchronous operations blocking performance
- **Quick Fixes**:
  - Replace synchronous logging with async implementation
  - Add basic in-memory caching for user profiles
  - Optimize 2-3 most critical database queries
  - Add request timing middleware

### 5. Real-time Foundation (15 minutes) - NICE TO HAVE

**Priority: P2 - Future Readiness**

- **Issue**: No real-time infrastructure
- **Quick Setup**:
  - Create WebSocket endpoint scaffold
  - Add basic event emitter for notifications
  - Implement simple presence indicator
  - Document real-time architecture plan

### 6. Testing & Validation (10 minutes) - VERIFICATION

**Priority: P1 - Quality Assurance**

- **Deliverables**:
  - Smoke test all critical endpoints
  - Verify authentication flow works
  - Test database operations
  - Document any remaining issues

## Sprint Strategy (2-Hour Focus)

### Time Management

- **0-30 min**: Critical security fixes (auth system, JWT, database columns)
- **30-50 min**: Database schema corrections and integrity fixes
- **50-75 min**: API standardization (unified responses, error handling)
- **75-95 min**: Performance quick wins (async logging, basic caching)
- **95-105 min**: Real-time foundation (WebSocket scaffold, event system)
- **105-120 min**: Testing, validation, and documentation

### Success Criteria for 2-Hour Sprint

- **Must Have**: Authentication system fully functional
- **Must Have**: Database schema consistent and working
- **Must Have**: Critical API endpoints return standard responses
- **Should Have**: Basic performance optimizations implemented
- **Could Have**: Real-time infrastructure foundation laid

### Risk Mitigation

- Focus on fixes over features
- Implement minimum viable solutions
- Document decisions for future iteration
- Test changes incrementally
- Maintain backward compatibility where possible

## Single Focused Task: Critical Authentication & Database Foundation Fix

### The Challenge

You have **2 hours** to fix the broken authentication system that's preventing the entire application from functioning. This is a production-critical issue that requires both database schema corrections and security implementation.

### Specific Problem Statement

The authentication middleware is failing because:

1. **Missing Database Columns**: The auth middleware references `is_active` and `is_admin` columns that don't exist in the users table
2. **JWT Security Vulnerability**: Hardcoded JWT secret fallback creates a security risk
3. **Authentication Flow Broken**: Login/register endpoints return errors due to schema mismatches
4. **No Data Integrity**: Missing foreign key constraints and indexes causing performance issues

### Detailed Implementation Requirements

#### Phase 1: Database Schema Fix (45 minutes)

**File: `lib/db.js` and `scripts/init-db.js`**

1. **Add Missing Columns** (15 minutes):

   ```sql
   ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;
   ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;
   ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0;
   ALTER TABLE users ADD COLUMN last_login DATETIME;
   ```

2. **Add Foreign Key Constraints** (15 minutes):

   ```sql
   -- Posts table
   ALTER TABLE posts ADD FOREIGN KEY (user_id) REFERENCES users(id);
   -- Comments table
   ALTER TABLE comments ADD FOREIGN KEY (user_id) REFERENCES users(id);
   ALTER TABLE comments ADD FOREIGN KEY (post_id) REFERENCES posts(id);
   -- Likes table
   ALTER TABLE likes ADD FOREIGN KEY (user_id) REFERENCES users(id);
   ALTER TABLE likes ADD FOREIGN KEY (post_id) REFERENCES posts(id);
   ```

3. **Add Performance Indexes** (15 minutes):
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_active ON users(is_active);
   CREATE INDEX idx_posts_user_id ON posts(user_id);
   CREATE INDEX idx_posts_created_at ON posts(created_at);
   CREATE INDEX idx_comments_post_id ON comments(post_id);
   CREATE INDEX idx_likes_post_user ON likes(post_id, user_id);
   ```

#### Phase 2: Authentication Security Fix (45 minutes)

**File: `lib/auth.js`**

1. **JWT Secret Management** (15 minutes):

   ```javascript
   // Replace hardcoded fallback with environment validation
   const JWT_SECRET = process.env.JWT_SECRET;
   if (!JWT_SECRET) {
     throw new Error(
       "JWT_SECRET environment variable is required for production"
     );
   }

   // Add token expiration and refresh logic
   const generateTokens = (user) => ({
     accessToken: jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
       expiresIn: "15m",
     }),
     refreshToken: jwt.sign({ userId: user.id }, JWT_SECRET, {
       expiresIn: "7d",
     }),
   });
   ```

2. **Auth Middleware Enhancement** (15 minutes):

   ```javascript
   // Update middleware to handle new schema
   const authMiddleware = async (req, res, next) => {
     try {
       const token = req.headers.authorization?.replace("Bearer ", "");
       if (!token) return res.status(401).json({ error: "No token provided" });

       const decoded = jwt.verify(token, JWT_SECRET);
       const user = await getUserById(decoded.userId);

       if (!user || !user.is_active) {
         return res.status(401).json({ error: "User not active" });
       }

       req.user = user;
       next();
     } catch (error) {
       return res.status(401).json({ error: "Invalid token" });
     }
   };
   ```

3. **Input Validation & Sanitization** (15 minutes):
   ```javascript
   const validateRegistration = (userData) => {
     const errors = [];

     // Email validation
     if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) {
       errors.push("Valid email is required");
     }

     // Password strength
     if (!userData.password || userData.password.length < 8) {
       errors.push("Password must be at least 8 characters");
     }

     // SQL injection prevention
     userData.email = userData.email?.trim().toLowerCase();
     userData.username = userData.username
       ?.trim()
       .replace(/[^a-zA-Z0-9_]/g, "");

     return { isValid: errors.length === 0, errors, sanitizedData: userData };
   };
   ```

#### Phase 3: API Response Standardization (30 minutes)

**File: `lib/utils/apiResponse.js` (create new)**

1. **Unified Response Format** (15 minutes):

   ```javascript
   const createResponse = (
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
       ...meta,
     },
   });

   const successResponse = (
     res,
     data,
     message = "Success",
     statusCode = 200,
     meta = null
   ) => {
     return res
       .status(statusCode)
       .json(createResponse(data, message, null, meta));
   };

   const errorResponse = (
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

2. **Update Critical Endpoints** (15 minutes):
   Update `/api/auth/login`, `/api/auth/register`, `/api/posts`, `/api/users/me`, `/api/posts/[id]` to use the new response format.

### Success Criteria

**Must Complete (Non-negotiable)**:

- [ ] Users table has `is_active`, `is_admin`, `email_verified`, `last_login` columns
- [ ] All foreign key constraints added and working
- [ ] JWT_SECRET environment validation implemented (fails fast if missing)
- [ ] Auth middleware works with new schema
- [ ] Login/register endpoints return success responses
- [ ] At least 3 API endpoints use unified response format

**Quality Validation**:

- [ ] No console errors when running the application
- [ ] Authentication flow works end-to-end (register → login → protected route)
- [ ] Database operations complete without constraint violations
- [ ] API responses follow consistent format

### Testing Protocol

1. **Database Test**:

   ```bash
   npm run init-db  # Should complete without errors
   ```

2. **Authentication Test**:

   ```bash
   # Test registration
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password123","username":"testuser"}'

   # Test login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password123"}'
   ```

3. **Protected Route Test**:
   ```bash
   # Use token from login response
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/users/me
   ```

### Time Management Strategy

- **0-15 min**: Database schema analysis and column additions
- **15-30 min**: Foreign key constraints and indexes
- **30-45 min**: Database testing and validation
- **45-60 min**: JWT secret management and environment validation
- **60-75 min**: Auth middleware updates and user validation
- **75-90 min**: Input validation and sanitization
- **90-105 min**: API response standardization utility
- **105-120 min**: Endpoint updates and end-to-end testing

### Critical Success Factor

This task focuses on **one cohesive fix**: making the authentication system production-ready. Every step builds toward this single goal. You succeed when a user can register, login, and access protected routes without any errors.

## Required Skills

- **Backend**: Node.js, Express/Next.js, PostgreSQL, Redis
- **Frontend**: React, TypeScript, Advanced CSS/Tailwind
- **Infrastructure**: Docker, Kubernetes, AWS/GCP
- **Security**: OAuth, JWT, encryption, security auditing
- **Performance**: Caching strategies, database optimization
- **Architecture**: Microservices, event-driven design, DDD

## Resources Provided

- Comprehensive audit report with prioritized issues
- Existing UI component library and dashboard infrastructure
- API endpoint structure and middleware foundation

## Acceptance Criteria

1. All critical security issues resolved
2. Database migration system fully functional
3. API endpoints follow consistent patterns
4. Performance benchmarks meet targets
5. Real-time features working in production
6. Comprehensive test coverage implemented
7. Documentation complete and up-to-date

## Additional Challenges (Bonus Points)

- Implement A/B testing framework
- Add machine learning recommendation engine
- Create mobile app using React Native
- Implement blockchain-based content verification
- Add video streaming capabilities
- Create advanced analytics dashboard with real-time metrics

This task is designed to challenge your expertise across multiple domains while building a production-ready social media platform. You'll need to balance technical excellence with practical delivery constraints, making architectural decisions that will scale with the platform's growth.

Good luck, and feel free to ask questions about any aspect of the implementation!
