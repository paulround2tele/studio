import { test, expect } from '@playwright/test';

// Visual regression / exploratory test (run via `npx playwright test`)
// NOTE: Jest is configured to ignore this directory.

test.describe('Pipeline Overview Visual', () => {
  test('campaign pipeline workspace renders overview & stepper', async ({ page }) => {
    // Adjust campaign id / seed step as needed for your env
    await page.goto('/campaigns/campaign-1');
    await expect(page.locator('[data-pipeline-workspace]')).toBeVisible();
    await expect(page.locator('text=Pipeline Workspace').first()).toBeVisible();
    await expect(page.locator('[data-pipeline-workspace] [role="list"], [data-pipeline-workspace] nav')).toBeVisible();
  });
});
