import { test, expect } from '@playwright/test';

test.describe('Pipeline Overview Visual', () => {
  test('campaign pipeline workspace renders overview & stepper', async ({ page }) => {
    // Assumes a dev server running & a known campaign id "campaign-1" (adjust as needed or create fixture)
    await page.goto('/campaigns/campaign-1');
    await page.waitForSelector('[data-pipeline-workspace]');
    await page.waitForSelector('[data-phase-stepper]');
    const overview = page.locator('[data-overview-card]');
    await expect(overview).toBeVisible();
    // Percy snapshot if percy enabled
    // @ts-ignore
    if (page.percySnapshot) {
      // @ts-ignore
      await page.percySnapshot('Pipeline Overview Workspace');
    }
  });
});
