import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Lazy load .playwright-env (if present) so process.env.PLAYWRIGHT_CAMPAIGN_ID is available when running a single spec directly.
try {
  const envPath = path.resolve(process.cwd(), '.playwright-env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const l of lines) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(l);
      if (m && m[1] && typeof m[2] === 'string') {
        const key = m[1];
        const val = m[2];
        (process.env as Record<string,string>)[key] = val;
      }
    }
  }
} catch {}

// Visual regression / exploratory test (run via `npx playwright test`)
// NOTE: Jest is configured to ignore this directory.

// Updated to use stable data-testid selectors exclusively.

test.describe('Pipeline Overview Visual', () => {
  test('campaign pipeline workspace renders overview & stepper', async ({ page }) => {
    const campaignId = process.env.PLAYWRIGHT_CAMPAIGN_ID;
    if (!campaignId) test.skip();
    await page.goto(`/campaigns/${campaignId}`);
    const workspace = page.getByTestId('pipeline-workspace');
    await expect(workspace).toBeVisible();
    // Stepper presence
    await expect(page.getByTestId('pipeline-phase-stepper')).toBeVisible();
    // Overview card basic assertions
    await expect(page.getByTestId('campaign-overview-card')).toBeVisible();
    await expect(page.getByTestId('campaign-overview-title')).toContainText('Campaign Overview');
    await expect(page.getByTestId('campaign-overview-status')).toBeVisible();
  });
});
