// Quick test script to verify auth flow after fixing the map error
const { chromium } = require('playwright');

async function quickAuthTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing login flow after fixing map error...');
    
    // Navigate to login
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('#email');

    // Fill and submit login form
    await page.fill('#email', 'admin@domainflow.com');
    await page.fill('#password', 'AdminPassword123!');
    await page.click('button[type="submit"]');

    // Wait for either dashboard or error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL after login attempt:', currentUrl);
    
    if (currentUrl.includes('dashboard')) {
      console.log('✅ SUCCESS: Login working and reached dashboard');
      // Wait a bit to see if the page loads properly
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/dashboard_success.png' });
      return true;
    } else {
      console.log('❌ FAILED: Still on login page or redirected elsewhere');
      await page.screenshot({ path: '/tmp/login_failed.png' });
      return false;
    }
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: '/tmp/test_error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

quickAuthTest().then(success => {
  process.exit(success ? 0 : 1);
});
