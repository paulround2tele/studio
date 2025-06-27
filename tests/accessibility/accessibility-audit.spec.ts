import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit - WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('Login page meets WCAG 2.1 AA standards', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form elements have proper labeling', async ({ page }) => {
    // Check email input labeling
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('aria-label');
    
    // Check password input labeling  
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('aria-label');
    
    // Check submit button has accessible name
    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    expect(buttonText).toBeTruthy();
    expect(buttonText!.length).toBeGreaterThan(0);
  });

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation works properly', async ({ page }) => {
    // Test tab order
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Test reverse tab order
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
  });

  test('Focus indicators are visible', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    
    // Check that focused element has visible focus indicator
    const computedStyle = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        border: styles.border
      };
    });
    
    // Should have some form of focus indication
    const hasFocusIndicator = 
      computedStyle.outline !== 'none' || 
      computedStyle.boxShadow !== 'none' ||
      computedStyle.border.includes('focus');
    
    expect(hasFocusIndicator).toBe(true);
  });

  test('Page has proper heading structure', async ({ page }) => {
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Run heading structure audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.structure'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Images have alt text or proper ARIA labeling', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.text-alternatives'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form has proper landmarks and structure', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Check form has proper role
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Run landmark audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.aria'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Component-Specific Accessibility Tests', () => {
  test('Button components meet accessibility standards', async ({ page }) => {
    // Test all button variants if available
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();
      
      // Check button has accessible name
      const accessibleName = await button.getAttribute('aria-label') || 
                            await button.textContent();
      expect(accessibleName).toBeTruthy();
    }
    
    // Run button-specific audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('button')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Input components have proper accessibility attributes', async ({ page }) => {
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      
      // Check input has label or aria-label
      const hasLabel = await input.getAttribute('aria-label') ||
                      await input.getAttribute('aria-labelledby') ||
                      await page.locator(`label[for="${await input.getAttribute('id')}"]`).isVisible();
      
      expect(hasLabel).toBeTruthy();
    }
  });
});

test.describe('Screen Reader Compatibility Tests', () => {
  test('Page announces content changes appropriately', async ({ page }) => {
    // Look for ARIA live regions
    const liveRegions = page.locator('[aria-live]');
    const liveRegionCount = await liveRegions.count();
    
    if (liveRegionCount > 0) {
      for (let i = 0; i < liveRegionCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }
    }
  });

  test('Dynamic content has proper ARIA attributes', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.aria'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
