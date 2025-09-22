import { test, expect } from '@playwright/test';

test.describe('Basic Functionality', () => {
  test('should be able to run basic test', async () => {
    expect(1 + 1).toBe(2);
  });

  test('should have test framework working', async () => {
    expect('hello').toBe('hello');
  });
});
