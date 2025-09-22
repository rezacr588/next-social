import { test, expect } from '@playwright/test';

test.describe('UI Components', () => {
  test('should have neumorphic design elements', async ({ page }) => {
    await page.goto('/');

    // Check for neumorphic styling
    const neumorphicElements = page.locator('.neumorphic');
    await expect(neumorphicElements.first()).toBeVisible();

    // Check for gradient backgrounds
    const gradientElements = page.locator('.bg-gradient-to-br');
    await expect(gradientElements.first()).toBeVisible();
  });

  test('should have interactive buttons', async ({ page }) => {
    await page.goto('/');

    // Check for buttons with hover effects
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible();

    // Check for post creation form
    const postForm = page.locator('form');
    await expect(postForm).toBeVisible();

    // Check form elements
    const textarea = page.locator('textarea[name="content"]');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
  });

  test('should have responsive navigation', async ({ page }) => {
    await page.goto('/');

    // Check navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check logo/brand
    const brand = page.locator('text=Nexus');
    await expect(brand).toBeVisible();

    // Check navigation links
    const homeLink = page.locator('text=Home');
    const exploreLink = page.locator('text=Explore');

    await expect(homeLink).toBeVisible();
    await expect(exploreLink).toBeVisible();

    // Test navigation functionality
    await exploreLink.click();
    await expect(page).toHaveURL('/explore');

    await homeLink.click();
    await expect(page).toHaveURL('/');
  });

  test('should have proper typography hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check heading hierarchy
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');

    await expect(h1).toBeVisible();
    await expect(h2).toBeVisible();

    // Check text contrast and readability
    const mainText = page.locator('p');
    await expect(mainText.first()).toBeVisible();
  });

  test('should have accessibility features', async ({ page }) => {
    await page.goto('/');

    // Check for semantic HTML
    const nav = page.locator('nav');
    const main = page.locator('main');
    const footer = page.locator('footer');

    await expect(nav).toBeVisible();
    await expect(main).toBeVisible();
    await expect(footer).toBeVisible();

    // Check for interactive elements
    const buttons = page.locator('button');
    const links = page.locator('a');

    await expect(buttons.first()).toBeVisible();
    await expect(links.first()).toBeVisible();
  });
});
