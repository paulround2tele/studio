import { test, expect } from '@playwright/test';

// Uses stable data-testid selectors across campaign listing & domains card.

test.describe('Domain pagination UI', () => {
  test('pagination controls render', async ({ page }) => {
    const campaignId = process.env.PLAYWRIGHT_CAMPAIGN_ID;
    if (!campaignId) test.skip();
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByTestId('campaign-domains-card')).toBeVisible();
    // Page indicator
    const pageIndicator = page.getByTestId('campaign-domains-page-indicator');
    await expect(pageIndicator).toBeVisible();

    // Optional load more (supports infinite or standard pagination case)
    const maybeLoadMore = page.getByTestId('campaign-domains-load-more');
    if (await maybeLoadMore.count()) {
      await maybeLoadMore.click();
    }
  });
});
