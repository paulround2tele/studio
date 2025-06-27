import { test, expect } from '@playwright/test';

test.describe('Component Cross-Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Login page renders correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/DomainFlow/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Button interactions work across browsers', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    
    // Test button is focusable
    await submitButton.focus();
    await expect(submitButton).toBeFocused();
    
    // Test button visual states
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    
    // Test hover state (if supported)
    await submitButton.hover();
    await page.waitForTimeout(100); // Allow hover state to apply
  });

  test('Form validation works consistently', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Test empty form submission
    await submitButton.click();
    
    // Test email validation
    await emailInput.fill('invalid-email');
    await submitButton.click();
    
    // Test password validation
    await emailInput.fill('test@example.com');
    await passwordInput.fill('123'); // Too short
    await submitButton.click();
  });

  test('Responsive design works on different viewports', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('form')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('form')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('form')).toBeVisible();
  });

  test('Keyboard navigation works consistently', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Test Enter key submission
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.keyboard.press('Enter');
  });
});

test.describe('Accessibility Cross-Browser Tests', () => {
  test('Page has proper accessibility structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for proper labeling
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label[for*="email"], [aria-label*="email"], [aria-labelledby]');
    await expect(emailLabel).toBeVisible();
    
    // Check for proper form structure
    await expect(page.locator('form')).toHaveAttribute('role');
  });

  test('Focus management works consistently', async ({ page }) => {
    await page.goto('/');
    
    // Test focus is visible
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test focus outline is visible (browser dependent)
    const styles = await focusedElement.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        boxShadow: computed.boxShadow
      };
    });
    
    // Should have some form of focus indication
    expect(styles.outline !== 'none' || styles.boxShadow !== 'none').toBe(true);
  });
});
