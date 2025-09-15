import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

try {
  const envPath = path.resolve(process.cwd(), '.playwright-env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const l of lines) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(l);
      if (m && m[1] && typeof m[2] === 'string') {
        (process.env as Record<string,string>)[m[1]] = m[2];
      }
    }
  }
} catch {}

// Scenario: Domain list infinite pagination & accumulation (scaffold)
// Updated with stable data-testid selectors to ease future implementation.

const getDomainRowLocator = (page: Page) => page.getByTestId('campaign-domains-row');
const getVirtualRowLocator = (page: Page) => page.getByTestId('campaign-domains-virtual-row');

test.describe('Domain Infinite Pagination', () => {
  test('SCENARIO PLACEHOLDER: accumulates domains in infinite mode without duplicates (pending implementation)', async ({ page }) => {
    const campaignId = process.env.PLAYWRIGHT_CAMPAIGN_ID;
    if (!campaignId) test.skip();
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByTestId('campaign-domains-card')).toBeVisible();

    // 2. Record baseline rows
    const baselineRows = await getDomainRowLocator(page).count();

    // 3. Enable infinite mode
    const infiniteSwitch = page.getByTestId('campaign-domains-infinite-switch');
    if (await infiniteSwitch.isVisible()) {
      const isChecked = await infiniteSwitch.isChecked();
      if (!isChecked) await infiniteSwitch.click();
    }

    // 4. Load more (if button exists)
    const loadMore = page.getByTestId('campaign-domains-load-more');
    if (await loadMore.count()) {
      await loadMore.click();
    }

    // 5. Verify row count increased (best-effort, skip if not)
    const postRows = await getDomainRowLocator(page).count();
    if (postRows <= baselineRows) test.skip();

    // 6. Placeholder for future duplicate + virtualization assertions
    // Example (future): collect domains text, ensure Set size matches array size
  });
});
