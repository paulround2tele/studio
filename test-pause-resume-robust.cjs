
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to campaign page...');
    await page.goto('http://localhost:3000/campaigns/d54c25c4-6358-486f-8d02-fcdc0cf877a8');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('Page loaded.');

    // Helper to remove toasts
    const removeToasts = async () => {
      await page.evaluate(() => {
        const toasts = document.querySelectorAll('.pointer-events-auto.fixed');
        toasts.forEach(t => t.remove());
        // Also remove any other potential overlays
        const overlays = document.querySelectorAll('[role="status"]');
        overlays.forEach(o => o.remove());
      });
    };

    // Helper to get status
    const getStatus = async () => {
      // Try to find the status badge
      // It usually has classes like "bg-green-100" or "bg-yellow-100" or text "Running", "Paused"
      // Let's look for the text content of the badge
      const statusText = await page.evaluate(() => {
        const badges = Array.from(document.querySelectorAll('span'));
        const statusBadge = badges.find(el => 
          el.textContent.trim() === 'Running' || 
          el.textContent.trim() === 'Paused' || 
          el.textContent.trim() === 'In Progress'
        );
        return statusBadge ? statusBadge.textContent.trim() : 'Unknown';
      });
      return statusText;
    };

    // 1. Check Initial Status
    let status = await getStatus();
    console.log(`Initial Status: ${status}`);

    // If it's not Running, we can't test Pause. But we can test Resume if it's Paused.
    if (status === 'Paused') {
        console.log('Campaign is Paused. Attempting to Resume first...');
        await removeToasts();
        await page.click('button:has-text("Resume")', { force: true });
        await page.waitForTimeout(2000);
        status = await getStatus();
        console.log(`Status after Resume: ${status}`);
    }

    if (status !== 'Running' && status !== 'In Progress') {
        console.log('Campaign is not running. Cannot test Pause.');
        // Try to start it?
        // Assuming there is a Start button if it's New?
        // For now, let's assume we want to test Pause -> Resume -> Pause
    }

    // 2. Click Pause
    console.log('Clicking Pause...');
    await removeToasts();
    
    // Wait for Pause button to be visible and enabled
    const pauseBtn = page.locator('button:has-text("Pause")');
    if (await pauseBtn.isVisible()) {
        await pauseBtn.click({ force: true });
        console.log('Pause clicked.');
        
        // Wait for status to change to Paused
        // This is the core verification - does the UI update?
        await page.waitForFunction(() => {
            const badges = Array.from(document.querySelectorAll('span'));
            return badges.some(el => el.textContent.trim() === 'Paused');
        }, null, { timeout: 5000 }).catch(() => console.log('Timeout waiting for Paused status in UI'));
        
        status = await getStatus();
        console.log(`Status after Pause: ${status}`);
        
        if (status !== 'Paused') {
            console.error('FAILURE: Status did not change to Paused.');
            await page.screenshot({ path: 'failure_pause.png' });
        } else {
            console.log('SUCCESS: Status changed to Paused.');
        }
    } else {
        console.log('Pause button not found or not visible.');
    }

    // 3. Click Resume
    console.log('Clicking Resume...');
    await removeToasts();
    const resumeBtn = page.locator('button:has-text("Resume")');
    
    // Wait a bit for the button to swap
    await page.waitForTimeout(1000);
    
    if (await resumeBtn.isVisible()) {
        await resumeBtn.click({ force: true });
        console.log('Resume clicked.');
        
        await page.waitForTimeout(2000);
        status = await getStatus();
        console.log(`Status after Resume: ${status}`);
        
        if (status !== 'Running' && status !== 'In Progress') {
             console.error('FAILURE: Status did not change to Running/In Progress.');
             await page.screenshot({ path: 'failure_resume.png' });
        } else {
            console.log('SUCCESS: Status changed to Running.');
        }
    } else {
        console.log('Resume button not found.');
        await page.screenshot({ path: 'debug_no_resume.png' });
    }

    // 4. Click Pause again to leave it in a clean state
    console.log('Clicking Pause (cleanup)...');
    await removeToasts();
    if (await pauseBtn.isVisible()) {
        await pauseBtn.click({ force: true });
        await page.waitForTimeout(2000);
        status = await getStatus();
        console.log(`Final Status: ${status}`);
    }

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'error_state.png' });
  } finally {
    await browser.close();
  }
})();
