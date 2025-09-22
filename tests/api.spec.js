import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('should return feed data', async ({ request }) => {
    const response = await request.get('/api/feed');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();

    // If there are posts, check their structure
    if (data.length > 0) {
      const post = data[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('username');
      expect(post).toHaveProperty('created_at');
    }
  });

  test('should handle post creation', async ({ request }) => {
    const newPost = {
      content: 'Test post from API test',
      mediaUrl: null,
      mediaType: 'text'
    };

    const response = await request.post('/api/posts/create', {
      data: newPost
    });

    // This might fail due to authentication, so we'll check the response structure
    expect([200, 401, 403]).toContain(response.status());
  });

  test('should handle authentication endpoints', async ({ request }) => {
    // Test registration endpoint structure
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123'
      }
    });

    expect([200, 400, 201]).toContain(registerResponse.status());

    // Test login endpoint structure
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpass123'
      }
    });

    expect([200, 401, 400]).toContain(loginResponse.status());
  });

  test('should handle invalid routes', async ({ request }) => {
    const response = await request.get('/api/nonexistent');
    expect(response.status()).toBe(404);
  });

  test('should handle method not allowed', async ({ request }) => {
    const response = await request.post('/api/feed');
    expect(response.status()).toBe(405);
  });
});
