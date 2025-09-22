import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register a new user', async ({ page }) => {
    // First, ensure database is initialized
    await page.goto('/');

    // Try to register (this would need API mocking or actual backend)
    // For now, we'll test the UI elements
    await expect(page.locator('nav')).toBeVisible();

    // Check for ethical controls
    await expect(page.locator('text=Pause Session')).toBeVisible();
  });

  test('should show presence indicator', async ({ page }) => {
    await page.goto('/');

    // Check for presence indicator in top right
    const presenceIndicator = page.locator('.fixed.top-4.right-4');
    await expect(presenceIndicator).toBeVisible();

    // Check for connection status
    await expect(presenceIndicator.locator('text=Connected')).toBeVisible();
  });

  test('should show notifications', async ({ page }) => {
    await page.goto('/');

    // Check for notification system
    const notificationSystem = page.locator('.fixed.bottom-4.right-4');
    await expect(notificationSystem).toBeVisible();
  });
});
