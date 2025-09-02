import { test, expect } from '@playwright/test';

test.describe('Discovery UI end-to-end', () => {
  test.setTimeout(3 * 60 * 1000);

  test('create campaign -> configure discovery via modal -> start -> domains appear', async ({ page }) => {
    // Bypass middleware auth by setting the presence cookie expected by middleware
    await page.context().addCookies([
      { name: 'domainflow_session', value: 'dev', domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' },
    ]);

    // Navigate to new campaign form
    await page.goto('/campaigns/new', { waitUntil: 'domcontentloaded' });

    // Fill campaign name and submit
    await page.getByLabel(/Campaign Name/i).fill('UI Discovery E2E');
    await page.getByRole('button', { name: /Create Campaign/i }).click();

    // Expect redirect to campaign details page with Phase dashboard and domains list
    await expect(page).toHaveURL(/\/campaigns\//);
    // Wait for Discovery card to render
    await expect(page.getByText('Discovery', { exact: false })).toBeVisible();

    // Open Discovery configuration modal
    // Click Configure button near Discovery card
    await page.getByRole('button', { name: /Configure/i }).first().click();

    // Modal title
    await expect(page.getByText('Configure Discovery (Domain Generation)')).toBeVisible();

    // Fill discovery form fields
    // Character Set
    await page.getByLabel(/Character Set/i).fill('abc');
    // Constant String
    await page.getByLabel(/Constant String/i).fill('brand');
    // Prefix variable length (default pattern is Prefix)
    await page.getByLabel(/Prefix Variable Length/i).fill('2');
    // TLDs: type "com" (frontend normalizes to ".com") and press Enter
    const tldInput = page.getByPlaceholder(/Enter TLD/);
    await tldInput.fill('com');
    await tldInput.press('Enter');
    // Number of domains
    await page.getByLabel(/Number of Domains to Generate/i).fill('5');

    // Save configuration
    await page.getByRole('button', { name: /Save Discovery/i }).click();
    // Modal closes
    await expect(page.getByText('Configure Discovery (Domain Generation)')).toHaveCount(0);

    // Start Discovery phase from the card
    // Use the first Start/Resume button available in the Discovery card section
    await page.getByRole('button', { name: /(Start|Resume)/i }).first().click();

    // Wait until at least one domain row is rendered in the Generated Domains table
    await expect.poll(async () => {
      const rows = await page.locator('table').locator('tbody tr').count();
      return rows;
    }, { timeout: 90_000, message: 'Expected at least one generated domain row' }).toBeGreaterThan(0);

    // Basic assertion: table shows some domain-like string ending with .com
    const cellText = await page.locator('table tbody tr td').first().innerText();
    expect(cellText).toMatch(/\.com$/);
  });
});
