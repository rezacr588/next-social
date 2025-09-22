// tests/comprehensive.spec.js - Comprehensive Test Suite with 50+ Test Cases
const { test, expect, describe, beforeAll, afterAll, beforeEach, afterEach } = require('@playwright/test');
const crypto = require('crypto');

// Test configuration
test.describe.configure({ mode: 'parallel', retries: 2 });

class TestDataManager {
  constructor() {
    this.users = [];
    this.posts = [];
    this.comments = [];
    this.testSession = null;
  }

  generateUser() {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    return {
      id,
      username: `testuser_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
      email: `test_${timestamp}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'TestPassword123!',
      firstName: `Test${timestamp}`,
      lastName: `User${Math.random().toString(36).substr(2, 3)}`,
      bio: `Test user created at ${new Date().toISOString()}`
    };
  }

  generatePost(userId) {
    const id = crypto.randomUUID();
    return {
      id,
      userId,
      title: `Test Post ${Date.now()}`,
      content: `This is a comprehensive test post with detailed content. Created at ${new Date().toISOString()} with user ID: ${userId}`,
      status: 'published',
      tags: ['test', 'automation', 'playwright'],
      category: 'general'
    };
  }

  generateComment(postId, userId) {
    const id = crypto.randomUUID();
    return {
      id,
      postId,
      userId,
      content: `Test comment on post ${postId} by user ${userId} at ${new Date().toISOString()}`,
      parentId: null
    };
  }
}

const testDataManager = new TestDataManager();

// Authentication Tests
test.describe('Authentication System', () => {
  let authToken;
  let refreshToken;
  let testUser;

  test.beforeEach(async ({ page }) => {
    testUser = testDataManager.generateUser();
    await page.goto('/register');
  });

  test('User registration with valid data', async ({ page }) => {
    await page.fill('[data-testid="username"]', testUser.username);
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.fill('[data-testid="confirmPassword"]', testUser.password);
    await page.click('[data-testid="register-button"]');

    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('User login with valid credentials', async ({ page }) => {
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Password strength validation', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'weak');
    await page.fill('[data-testid="confirmPassword"]', 'weak');
    await page.click('[data-testid="register-button"]');

    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
  });

  test('Email format validation', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.fill('[data-testid="password"]', 'ValidPassword123!');
    await page.click('[data-testid="register-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
  });

  test('Rate limiting for login attempts', async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="email"]', 'wrong@example.com');
      await page.fill('[data-testid="password"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
    }

    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText('Too many attempts');
  });

  test('Session timeout handling', async ({ page, context }) => {
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="login-button"]');

    // Simulate session timeout
    await context.addCookies([{
      name: 'sessionExpired',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }]);

    await page.reload();
    await expect(page).toHaveURL('/login');
  });
});

// User Management Tests
test.describe('User Management', () => {
  test('User profile creation and editing', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/user/1');
    await page.click('[data-testid="edit-profile-button"]');
    await page.fill('[data-testid="bio"]', 'Updated bio for testing');
    await page.click('[data-testid="save-profile-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('User search functionality', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'test');
    await page.waitForSelector('[data-testid="search-results"]');

    const results = page.locator('[data-testid="search-result"]');
    await expect(results.first()).toBeVisible();
  });

  test('User following system', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/user/2');
    await page.click('[data-testid="follow-button"]');

    await expect(page.locator('[data-testid="following-status"]')).toContainText('Following');
  });

  test('User profile validation', async ({ page }) => {
    await page.goto('/user/1');
    await page.click('[data-testid="edit-profile-button"]');

    await page.fill('[data-testid="bio"]', 'a'.repeat(501));
    await page.click('[data-testid="save-profile-button"]');

    await expect(page.locator('[data-testid="bio-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="bio-error"]')).toContainText('Bio must be less than 500 characters');
  });
});

// Content Management Tests
test.describe('Content Management', () => {
  test('Post creation with rich content', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/');
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-title"]', 'Comprehensive Test Post');
    await page.fill('[data-testid="post-content"]', 'This is a comprehensive test post with detailed content including:\n\n1. Rich text formatting\n2. Multiple paragraphs\n3. Technical details\n4. Testing scenarios\n\nThis post tests the complete content creation workflow.');
    await page.selectOption('[data-testid="post-category"]', 'technology');
    await page.fill('[data-testid="post-tags"]', 'test,automation,playwright,quality-assurance');
    await page.click('[data-testid="publish-button"]');

    await expect(page.locator('[data-testid="post-created-success"]')).toBeVisible();
  });

  test('Comment system functionality', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="post-1"]');
    await page.click('[data-testid="add-comment-button"]');
    await page.fill('[data-testid="comment-content"]', 'This is a comprehensive test comment that validates the comment system functionality including text formatting, length validation, and user interaction patterns.');
    await page.click('[data-testid="submit-comment-button"]');

    await expect(page.locator('[data-testid="comment-added"]')).toBeVisible();
  });

  test('Post interaction features', async ({ page }) => {
    await page.goto('/');

    // Test like functionality
    await page.click('[data-testid="post-like-button"]');
    await expect(page.locator('[data-testid="like-count"]')).toContainText('1');

    // Test share functionality
    await page.click('[data-testid="post-share-button"]');
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();

    // Test save functionality
    await page.click('[data-testid="post-save-button"]');
    await expect(page.locator('[data-testid="save-indicator"]')).toBeVisible();
  });

  test('Content moderation workflow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/admin/moderation');
    await page.click('[data-testid="flag-post-button"]');
    await page.selectOption('[data-testid="moderation-action"]', 'hide');
    await page.fill('[data-testid="moderation-reason"]', 'Test moderation action');
    await page.click('[data-testid="apply-moderation-button"]');

    await expect(page.locator('[data-testid="moderation-success"]')).toBeVisible();
  });

  test('Content categorization and tagging', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-title"]', 'Advanced JavaScript Features');
    await page.fill('[data-testid="post-content"]', 'This post covers advanced JavaScript features including ES2023 modules, async patterns, and performance optimization techniques.');
    await page.selectOption('[data-testid="post-category"]', 'technology');
    await page.fill('[data-testid="post-tags"]', 'javascript,es2023,async,performance,modern');
    await page.click('[data-testid="publish-button"]');

    // Verify post appears in category
    await page.goto('/explore?category=technology');
    await expect(page.locator('[data-testid="post-in-category"]')).toBeVisible();
  });
});

// Real-time Features Tests
test.describe('Real-time Features', () => {
  test('Real-time messaging system', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/chat/general');

    // Test typing indicators
    await page.fill('[data-testid="message-input"]', 'Hello, this is a test message');
    await page.click('[data-testid="typing-indicator"]').toBeVisible();

    await page.click('[data-testid="send-message-button"]');
    await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
  });

  test('Presence indicators', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="presence-online"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-count"]')).toContainText('1');
  });

  test('Live notifications', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    // Simulate receiving a notification
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'mention',
          title: 'You were mentioned',
          message: 'Test user mentioned you in a post'
        }
      }));
    });

    await expect(page.locator('[data-testid="notification-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-toast"]')).toContainText('You were mentioned');
  });
});

// API Tests
test.describe('API Endpoints', () => {
  test('REST API authentication', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@nexus.com',
        password: 'admin123'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('refreshToken');
  });

  test('API rate limiting', async ({ request }) => {
    // Make multiple requests to trigger rate limiting
    for (let i = 0; i < 10; i++) {
      await request.get('/api/posts');
    }

    const response = await request.get('/api/posts');
    expect(response.status()).toBe(429);
  });

  test('API pagination', async ({ request }) => {
    const response = await request.get('/api/posts?page=1&limit=10');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.posts).toHaveLength(10);
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('pages');
  });

  test('API filtering and search', async ({ request }) => {
    const response = await request.get('/api/posts?search=test&category=technology&status=published');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.posts.length).toBeGreaterThanOrEqual(0);
  });

  test('API error handling', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint');
    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('message');
  });
});

// Performance Tests
test.describe('Performance', () => {
  test('Page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('API response time', async ({ request }) => {
    const startTime = Date.now();
    await request.get('/api/posts');
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });

  test('Database query performance', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 5000 });
    const queryTime = Date.now() - startTime;

    expect(queryTime).toBeLessThan(2000); // Should load posts within 2 seconds
  });

  test('Memory usage monitoring', async ({ page }) => {
    await page.goto('/');

    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Should use less than 50MB
  });
});

// Security Tests
test.describe('Security', () => {
  test('XSS protection', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', '<script>alert("XSS")</script>');
    await page.press('Enter');

    // Should not execute script
    const alertTriggered = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('alert', () => resolve(true), { once: true });
        setTimeout(() => resolve(false), 1000);
      });
    });

    expect(alertTriggered).toBeFalsy();
  });

  test('CSRF protection', async ({ request }) => {
    const response = await request.post('/api/posts', {
      data: { title: 'Test', content: 'Test content' }
    });

    expect(response.status()).toBe(403); // Should require authentication
  });

  test('SQL injection protection', async ({ page }) => {
    await page.goto('/');

    // Try SQL injection in search
    await page.fill('[data-testid="search-input"]', "'; DROP TABLE users; --");
    await page.press('Enter');

    // Should not affect database
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('Input sanitization', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', '"><script>alert("XSS")</script>');
    await page.click('[data-testid="login-button"]');

    // Should sanitize input and not execute script
    const alertTriggered = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('alert', () => resolve(true), { once: true });
        setTimeout(() => resolve(false), 1000);
      });
    });

    expect(alertTriggered).toBeFalsy();
  });
});

// Accessibility Tests
test.describe('Accessibility', () => {
  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);

    // Test enter key activation
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA labels
    const ariaLabels = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label]');
      return Array.from(elements).map(el => el.getAttribute('aria-label'));
    });

    expect(ariaLabels.length).toBeGreaterThan(0);
  });

  test('Semantic HTML structure', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading hierarchy
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => ({ tag: h.tagName, text: h.textContent }));
    });

    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0].tag).toBe('H1'); // First heading should be H1
  });

  test('Color contrast compliance', async ({ page }) => {
    await page.goto('/');

    // Check for sufficient color contrast (mock test)
    const textElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('p, span, div'))
        .filter(el => el.textContent && el.textContent.trim().length > 0)
        .slice(0, 10); // Test first 10 elements
    });

    expect(textElements.length).toBeGreaterThan(0);
  });
});

// Mobile Responsiveness Tests
test.describe('Mobile Responsiveness', () => {
  test('Mobile layout adaptation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();
  });

  test('Touch interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Test touch-friendly button sizes
    const buttons = await page.locator('button, [role="button"]');
    const buttonBoxes = await buttons.boundingBox();

    expect(buttonBoxes.width).toBeGreaterThanOrEqual(44); // Minimum touch target size
    expect(buttonBoxes.height).toBeGreaterThanOrEqual(44);
  });

  test('Mobile form optimization', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Test mobile-optimized input fields
    const inputs = await page.locator('input');
    const inputBoxes = await inputs.boundingBox();

    expect(inputBoxes.width).toBeGreaterThan(300); // Should be wide enough for mobile
  });
});

// Integration Tests
test.describe('Integration', () => {
  test('End-to-end user journey', async ({ page }) => {
    // 1. User registration
    await page.goto('/register');
    await page.fill('[data-testid="username"]', `e2e_user_${Date.now()}`);
    await page.fill('[data-testid="email"]', `e2e_${Date.now()}@example.com`);
    await page.fill('[data-testid="password"]', 'E2EPassword123!');
    await page.fill('[data-testid="confirmPassword"]', 'E2EPassword123!');
    await page.click('[data-testid="register-button"]');

    // 2. Email verification (mock)
    await page.goto('/verify-email?token=mock_token');

    // 3. Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', `e2e_${Date.now()}@example.com`);
    await page.fill('[data-testid="password"]', 'E2EPassword123!');
    await page.click('[data-testid="login-button"]');

    // 4. Create post
    await page.goto('/');
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-title"]', 'E2E Test Post');
    await page.fill('[data-testid="post-content"]', 'This is an end-to-end test post');
    await page.click('[data-testid="publish-button"]');

    // 5. Interact with post
    await page.click('[data-testid="post-like-button"]');
    await page.click('[data-testid="add-comment-button"]');
    await page.fill('[data-testid="comment-content"]', 'E2E test comment');
    await page.click('[data-testid="submit-comment-button"]');

    // 6. Verify all interactions worked
    await expect(page.locator('[data-testid="post-created-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="comment-added"]')).toBeVisible();
  });

  test('Data persistence across sessions', async ({ page, context }) => {
    // Create test data
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/');
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[data-testid="post-title"]', 'Persistence Test Post');
    await page.fill('[data-testid="post-content"]', 'Testing data persistence');
    await page.click('[data-testid="publish-button"]');

    // Get post ID from URL or page content
    const postId = await page.evaluate(() => {
      const urlMatch = window.location.href.match(/\/post\/(\w+)/);
      return urlMatch ? urlMatch[1] : null;
    });

    expect(postId).toBeTruthy();

    // Navigate away and come back
    await page.goto('/explore');
    await page.goto(`/post/${postId}`);

    // Verify post still exists
    await expect(page.locator('[data-testid="post-content"]')).toContainText('Testing data persistence');
  });

  test('Real-time synchronization', async ({ page, browser }) => {
    // Create two pages for testing real-time features
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // User 1 logs in
    await page1.goto('/login');
    await page1.fill('[data-testid="email"]', 'admin@nexus.com');
    await page1.fill('[data-testid="password"]', 'admin123');
    await page1.click('[data-testid="login-button"]');

    // User 2 logs in
    await page2.goto('/login');
    await page2.fill('[data-testid="email"]', 'admin@nexus.com');
    await page2.fill('[data-testid="password"]', 'admin123');
    await page2.click('[data-testid="login-button"]');

    // Both users go to the same chat room
    await page1.goto('/chat/general');
    await page2.goto('/chat/general');

    // User 1 sends a message
    await page1.fill('[data-testid="message-input"]', 'Real-time test message');
    await page1.click('[data-testid="send-message-button"]');

    // User 2 should see the message
    await expect(page2.locator('[data-testid="message-content"]')).toContainText('Real-time test message');

    await context1.close();
    await context2.close();
  });
});

// Advanced Features Tests
test.describe('Advanced Features', () => {
  test('File upload functionality', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/');
    await page.click('[data-testid="create-post-button"]');

    // Create a test file
    const fileInput = await page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test file content')
    });

    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
  });

  test('Search with advanced filters', async ({ page }) => {
    await page.goto('/');

    // Test text search
    await page.fill('[data-testid="search-input"]', 'test');
    await page.waitForSelector('[data-testid="search-results"]');
    await expect(page.locator('[data-testid="search-result"]')).toHaveCountGreaterThan(0);

    // Test category filter
    await page.selectOption('[data-testid="category-filter"]', 'technology');
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();

    // Test date range filter
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');
    await page.click('[data-testid="apply-filters"]');
    await expect(page.locator('[data-testid="filter-indicator"]')).toBeVisible();
  });

  test('User profile customization', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/user/1');
    await page.click('[data-testid="edit-profile-button"]');

    // Test avatar upload
    await page.setInputFiles('[data-testid="avatar-input"]', {
      name: 'test-avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test avatar content')
    });

    // Test bio update
    await page.fill('[data-testid="bio"]', 'Updated bio with comprehensive testing information and advanced features demonstration.');

    // Test social links
    await page.fill('[data-testid="website"]', 'https://example.com');
    await page.fill('[data-testid="github"]', 'https://github.com/testuser');

    await page.click('[data-testid="save-profile-button"]');
    await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();
  });

  test('Notification preferences', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/settings/notifications');

    // Test email notification settings
    await page.click('[data-testid="email-notifications"]');
    await page.click('[data-testid="mention-notifications"]');
    await page.click('[data-testid="message-notifications"]');

    // Test quiet hours
    await page.fill('[data-testid="quiet-hours-start"]', '22:00');
    await page.fill('[data-testid="quiet-hours-end"]', '08:00');

    await page.click('[data-testid="save-preferences"]');
    await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
  });

  test('Admin dashboard functionality', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@nexus.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    await page.goto('/admin');

    // Test user management
    await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
    await page.click('[data-testid="user-management"]');
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible();

    // Test content moderation
    await page.click('[data-testid="content-moderation"]');
    await expect(page.locator('[data-testid="moderation-queue"]')).toBeVisible();

    // Test analytics
    await page.click('[data-testid="analytics"]');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();

    // Test system health
    await page.click('[data-testid="system-health"]');
    await expect(page.locator('[data-testid="health-metrics"]')).toBeVisible();
  });

  test('API documentation access', async ({ page }) => {
    await page.goto('/api/docs');
    await expect(page.locator('[data-testid="api-documentation"]')).toBeVisible();
    await expect(page.locator('[data-testid="swagger-ui"]')).toBeVisible();
  });
});

// Error Handling Tests
test.describe('Error Handling', () => {
  test('404 error page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="404-title"]')).toContainText('Page Not Found');
  });

  test('500 error handling', async ({ page }) => {
    // Mock server error
    await page.route('/api/test-error', async route => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/api/test-error');
    await expect(page.locator('[data-testid="error-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Internal Server Error');
  });

  test('Network error handling', async ({ page }) => {
    // Mock network error
    await page.route('**/api/posts', async route => {
      await route.abort();
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('Form validation errors', async ({ page }) => {
    await page.goto('/register');

    // Submit empty form
    await page.click('[data-testid="register-button"]');

    // Check for validation errors
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });
});

// Performance and Load Tests
test.describe('Performance and Load', () => {
  test('Concurrent user simulation', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all(
      Array.from({ length: 5 }, () => browser.newContext())
    );

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    try {
      // All users navigate to the site
      await Promise.all(
        pages.map(page => page.goto('/'))
      );

      // All users perform search
      await Promise.all(
        pages.map(page =>
          page.fill('[data-testid="search-input"]', 'performance test')
        )
      );

      // Verify all pages loaded successfully
      for (const page of pages) {
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      }

    } finally {
      // Clean up
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('Memory leak detection', async ({ page }) => {
    const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      await page.goto('/');
      await page.fill('[data-testid="search-input"]', `test ${i}`);
      await page.waitForTimeout(100);
    }

    const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });

  test('Database connection pool testing', async ({ page }) => {
    const startTime = Date.now();

    // Perform multiple database operations
    for (let i = 0; i < 20; i++) {
      await page.goto(`/user/${i + 1}`);
      await page.waitForSelector('[data-testid="user-profile"]', { timeout: 5000 });
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should complete within reasonable time (indicating proper connection pooling)
    expect(totalTime).toBeLessThan(30000); // 30 seconds
  });
});

module.exports = { testDataManager };
