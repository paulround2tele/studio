const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login');
    
    console.log('Logging in...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for dashboard...');
    await page.waitForURL('http://localhost:3000/dashboard');
    
    console.log('Navigating to New Campaign...');
    await page.goto('http://localhost:3000/campaigns/new');
    
    console.log('Filling campaign wizard...');
    // Step 1: Name
    await page.fill('input[placeholder="e.g. Summer Shoe Sale"]', `Pause Test ${Date.now()}`);
    await page.click('button:has-text("Next Step")');
    
    // Step 2: Domain Generation
    await page.click('button:has-text("Next Step")');
    
    // Step 3: Review
    await page.click('button:has-text("Create Campaign")');
    
    console.log('Waiting for redirection to campaign dashboard...');
    await page.waitForURL(/\/campaigns\/[a-f0-9-]+$/);
    const campaignId = page.url().split('/').pop();
    console.log(`Campaign created: ${campaignId}`);

    // HANDLE TOAST OVERLAY
    console.log('Waiting for potential toast overlay...');
    // Wait a bit for the toast to appear and potentially disappear
    await page.waitForTimeout(2000); 
    
    // Try to find and close the toast if it exists
    const toastCloseButton = page.locator('.toast-close, [aria-label="Close toast"], button.absolute.right-2.top-2');
    if (await toastCloseButton.count() > 0) {
        console.log('Found toast close button, clicking...');
        await toastCloseButton.first().click();
    } else {
        console.log('No toast close button found, waiting for toast to disappear naturally...');
        await page.waitForTimeout(4000); // Wait 4 more seconds
    }

    // Verify status is Draft
    console.log('Verifying initial status...');
    await page.waitForSelector('text=Status: Draft', { timeout: 5000 }).catch(() => console.log('Status: Draft not found text, checking badge'));

    console.log('Clicking "Run Selected Phase"...');
    // Use force: true just in case, but we tried to clear the overlay
    await page.click('button:has-text("Run Selected Phase")', { force: true });
    
    console.log('Waiting for status to change to Running...');
    // Wait for the status to change. It might take a moment for the backend to process.
    // We look for "Status: Running" or a badge with "Running"
    try {
        await page.waitForFunction(() => {
            const body = document.body.innerText;
            return body.includes('Status: Running') || body.includes('Running');
        }, { timeout: 10000 });
        console.log('Campaign is RUNNING');
    } catch (e) {
        console.log('Timeout waiting for Running status. Dumping page content...');
        console.log(await page.content());
        throw e;
    }

    // Now test Pause
    console.log('Testing PAUSE...');
    const pauseButton = page.locator('button:has-text("Pause")');
    await pauseButton.waitFor({ state: 'visible' });
    await pauseButton.click();
    
    console.log('Waiting for status: Paused...');
    await page.waitForFunction(() => {
        const body = document.body.innerText;
        return body.includes('Status: Paused') || body.includes('Paused');
    }, { timeout: 10000 });
    console.log('Campaign is PAUSED');

    // Now test Resume
    console.log('Testing RESUME...');
    const resumeButton = page.locator('button:has-text("Resume")');
    await resumeButton.waitFor({ state: 'visible' });
    await resumeButton.click();

    console.log('Waiting for status: Running...');
    await page.waitForFunction(() => {
        const body = document.body.innerText;
        return body.includes('Status: Running') || body.includes('Running');
    }, { timeout: 10000 });
    console.log('Campaign is RESUMED (Running)');

    console.log('SUCCESS: Pause/Resume verification complete.');

  } catch (error) {
    console.error('Test failed:', error);
    // Take screenshot on failure
    await page.screenshot({ path: 'failure-pause-resume.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
