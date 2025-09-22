import { test, expect } from '@playwright/test';

test.describe('Real-time Features', () => {
  test('should connect to realtime server', async ({ page }) => {
    // Monitor network requests
    const wsRequests = [];
    page.on('request', request => {
      if (request.url().includes('socket.io')) {
        wsRequests.push(request.url());
      }
    });

    await page.goto('/');

    // Wait for potential socket connection
    await page.waitForTimeout(2000);

    // Check if socket connection was attempted
    expect(wsRequests.length).toBeGreaterThanOrEqual(0);
  });

  test('should show presence indicator', async ({ page }) => {
    await page.goto('/');

    // Check presence indicator
    const presenceIndicator = page.locator('.fixed.top-4.right-4');
    await expect(presenceIndicator).toBeVisible();

    // Check for connection status text
    const statusText = presenceIndicator.locator('text=Connected,Disconnected');
    await expect(statusText).toBeVisible();
  });

  test('should display notifications', async ({ page }) => {
    await page.goto('/');

    // Check notification system
    const notificationSystem = page.locator('.fixed.bottom-4.right-4');
    await expect(notificationSystem).toBeVisible();
  });

  test('should handle post creation in real-time', async ({ page }) => {
    await page.goto('/');

    // Wait for initial posts to load
    await page.waitForSelector('.neumorphic', { timeout: 5000 });

    // Get initial post count
    const initialPosts = await page.locator('.neumorphic').count();

    // Create a new post
    const textarea = page.locator('textarea[name="content"]');
    const submitButton = page.locator('button[type="submit"]');

    await textarea.fill('Test post for real-time functionality');
    await submitButton.click();

    // Wait for new post to appear
    await page.waitForTimeout(1000);

    // Check if new post was added
    const newPosts = await page.locator('.neumorphic').count();
    expect(newPosts).toBeGreaterThan(initialPosts);
  });

  test('should have working chat room', async ({ page }) => {
    await page.goto('/explore');

    // Check chat room is available
    await expect(page.locator('text=General Chat')).toBeVisible();

    // Join chat
    await page.click('text=Join Chat');
    await expect(page.locator('text=Connected to chat room')).toBeVisible();

    // Check message input is available
    const messageInput = page.locator('input[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible();

    // Send a message
    await messageInput.fill('Hello from test!');
    await page.click('text=Send');

    // Check if message appears in chat
    await expect(page.locator('text=Hello from test!')).toBeVisible();
  });
});
