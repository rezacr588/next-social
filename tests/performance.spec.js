import { test, expect } from '@playwright/test';

test.describe('Performance and Accessibility', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);

    // Check for title
    const title = await page.title();
    expect(title).toContain('Nexus');
  });

  test('should have keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check that focus is visible
    const focusedElementId = await focusedElement.getAttribute('id');
    expect(focusedElementId).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for navigation landmark
    const nav = page.locator('nav[role="navigation"]');
    await expect(nav).toBeVisible();

    // Check for main content
    const main = page.locator('main[role="main"]');
    await expect(main).toBeVisible();
  });

  test('should work without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false
    });
    const page = await context.newPage();

    try {
      await page.goto('/');
      // Should at least load the basic HTML structure
      await expect(page.locator('body')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
