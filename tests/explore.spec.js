import { test, expect } from '@playwright/test';

test.describe('Explore Page', () => {
  test('should load explore page successfully', async ({ page }) => {
    await page.goto('/explore');

    // Check page title and heading
    await expect(page).toHaveTitle(/Nexus/);
    await expect(page.locator('h1')).toContainText('Explore Nexus');

    // Check for main sections
    await expect(page.locator('text=Community Feed')).toBeVisible();
    await expect(page.locator('text=Live Chat')).toBeVisible();
  });

  test('should display chat room functionality', async ({ page }) => {
    await page.goto('/explore');

    // Check chat room elements
    await expect(page.locator('text=General Chat')).toBeVisible();
    await expect(page.locator('text=Join Chat')).toBeVisible();

    // Join chat
    await page.click('text=Join Chat');
    await expect(page.locator('text=Connected to chat room')).toBeVisible();
    await expect(page.locator('text=Leave')).toBeVisible();

    // Check for message input
    const messageInput = page.locator('input[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible();
    await expect(messageInput).toBeEnabled();
  });

  test('should have responsive design', async ({ page, isMobile }) => {
    await page.goto('/explore');

    if (isMobile) {
      // Check mobile layout
      await expect(page.locator('text=Community Feed')).toBeVisible();
      await expect(page.locator('text=Live Chat')).toBeVisible();
    } else {
      // Check desktop layout - should be side by side
      const grid = page.locator('.grid');
      await expect(grid).toBeVisible();
    }
  });
});
