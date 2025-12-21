const { chromium } = require('playwright');

(async () => {
  const campaignId = process.argv[2];
  if (!campaignId) {
    console.error('Please provide campaign ID');
    process.exit(1);
  }

  console.log(`Starting verification for campaign: ${campaignId}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Login
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/auth/signin');
    
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
        console.log('Logging in...');
        await emailInput.fill('test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
        console.log('Logged in.');
    } else {
        console.log('Already logged in or different page structure.');
    }

    // 2. Go to Campaign
    console.log(`Navigating to campaign ${campaignId}...`);
    await page.goto(`http://localhost:3000/campaigns/${campaignId}`);
    await page.waitForLoadState('networkidle');

    // Helper to get status
    const getStatus = async () => {
        // Try to find the status badge in the Configuration section
        // Based on snapshot: status [ref=e316]: Draft
        // It's near "Status" label.
        // We can look for text "Status" and then the next sibling or nearby element.
        // Or just look for the badge text directly if we know what to expect.
        const statusText = await page.locator('div:has-text("Status") + div [role="status"]').textContent();
        return statusText;
    };

    console.log('Initial Status:', await getStatus());

    // 3. Start Phase
    console.log('Clicking "Run Selected Phase"...');
    await page.getByRole('button', { name: 'Run Selected Phase' }).click();
    
    // Wait for status to change to Running or In Progress
    console.log('Waiting for status change...');
    await page.waitForTimeout(2000); // Give it a moment
    console.log('Status after start:', await getStatus());

    // 4. Pause
    console.log('Clicking "Pause Phase"...');
    await page.getByRole('button', { name: 'Pause Phase' }).click();
    
    // 5. Verify Paused
    console.log('Verifying Paused state...');
    await page.waitForTimeout(2000);
    const pausedStatus = await getStatus();
    console.log('Status after pause:', pausedStatus);
    
    if (pausedStatus !== 'Paused') {
        console.error('❌ Failed to pause! Status is:', pausedStatus);
    } else {
        console.log('✅ Successfully paused.');
    }

    // 6. Resume
    console.log('Clicking "Resume Selected Phase" (or Run)...');
    // Check if button text changed
    const resumeBtn = page.getByRole('button', { name: 'Resume Selected Phase' });
    if (await resumeBtn.isVisible()) {
        await resumeBtn.click();
    } else {
        console.log('Resume button not found, trying "Run Selected Phase"...');
        await page.getByRole('button', { name: 'Run Selected Phase' }).click();
    }

    // 7. Verify In Progress
    console.log('Verifying Resumed state...');
    await page.waitForTimeout(2000);
    const resumedStatus = await getStatus();
    console.log('Status after resume:', resumedStatus);

    if (resumedStatus === 'Paused') {
        console.error('❌ Failed to resume! Status is still Paused.');
    } else {
        console.log('✅ Successfully resumed.');
    }

    // 8. Pause Again
    console.log('Clicking "Pause Phase" again...');
    await page.getByRole('button', { name: 'Pause Phase' }).click();
    
    // 9. Final Verify
    console.log('Final verification of Paused state...');
    await page.waitForTimeout(2000);
    const finalStatus = await getStatus();
    console.log('Final Status:', finalStatus);

    if (finalStatus !== 'Paused') {
        console.error('❌ Failed to pause again! Status is:', finalStatus);
    } else {
        console.log('✅ Successfully paused again. State is sticky.');
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
