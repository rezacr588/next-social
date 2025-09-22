import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');

    // Check if page title contains expected text
    await expect(page).toHaveTitle(/Nexus/);

    // Check for main heading
    await expect(page.locator('h1')).toContainText('Your Decentralized Feed');

    // Check for navigation elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('text=Nexus')).toBeVisible();
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Explore')).toBeVisible();
  });

  test('should display sample posts', async ({ page }) => {
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('.neumorphic', { timeout: 5000 });

    // Check if posts are displayed
    const posts = page.locator('.neumorphic');
    await expect(posts.first()).toBeVisible();

    // Check post content
    await expect(page.locator('text=Welcome to Nexus')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Test navigation to Explore page
    await page.click('text=Explore');
    await expect(page).toHaveURL('/explore');

    // Go back to home
    await page.click('text=Home');
    await expect(page).toHaveURL('/');
  });
});
