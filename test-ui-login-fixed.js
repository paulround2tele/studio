const { chromium } = require('playwright');

(async () => {
  console.log('Navigating to login page...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR]: ${msg.text()}`);
    } else {
      console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
    }
  });

  // Listen for API responses
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`[API RESPONSE]: ${response.status()} ${response.url()}`);
      
      // Log login response body
      if (response.url().includes('/api/v2/auth/login') && response.status() === 200) {
        response.text().then(body => {
          console.log(`[LOGIN RESPONSE BODY]: ${body}`);
        });
      }
    }
  });

  try {
    await page.goto('http://localhost:3000/login');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    console.log('Login form loaded');
    
    // Fill out the login form with correct password
    console.log('Filling email field...');
    await page.fill('input[type="email"]', 'admin@domainflow.com');
    
    console.log('Filling password field...');
    await page.fill('input[type="password"]', 'AdminPassword123!');
    
    // Submit the form
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for response...');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check if we're redirected to dashboard
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('SUCCESS: Redirected to dashboard!');
      console.log('✅ LOGIN SUCCESSFUL - User is now authenticated!');
      
      // Take screenshot
      await page.screenshot({ path: '/tmp/dashboard_screenshot.png' });
      console.log('Screenshot saved to /tmp/dashboard_screenshot.png');
      
      // Wait a bit more to see if any errors occur after login
      await page.waitForTimeout(3000);
      
      console.log('\n=== FINAL RESULT ===');
      console.log('✅ Login flow test PASSED - No authentication issues detected');
    } else {
      console.log('❌ FAILED: Not redirected to dashboard');
      console.log('Current URL:', currentUrl);
      
      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/failed_login_screenshot.png' });
      console.log('Screenshot saved to /tmp/failed_login_screenshot.png');
      
      console.log('\n=== FINAL RESULT ===');
      console.log('💥 Login flow test FAILED - Authentication issue detected');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/error_screenshot.png' });
    console.log('Screenshot saved to /tmp/error_screenshot.png');
    
    console.log('\n=== FINAL RESULT ===');
    console.log('💥 Login flow test FAILED - Authentication issue detected');
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
