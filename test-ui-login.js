// test-ui-login.js - Test actual login flow through the UI
const { chromium } = require('playwright');

async function testLoginFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages and network requests for debugging
  page.on('console', msg => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', error => console.log(`[BROWSER ERROR]:`, error.message));
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`[API RESPONSE]: ${response.status()} ${response.url()}`);
      if (response.url().includes('/auth/login')) {
        try {
          const responseBody = await response.text();
          console.log(`[LOGIN RESPONSE BODY]:`, responseBody.substring(0, 500));
        } catch (e) {
          console.log('[LOGIN RESPONSE]: Could not read response body');
        }
      }
    }
  });

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    // Wait for the form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('Login form loaded');

    // Fill in the email field
    console.log('Filling email field...');
    await page.fill('#email', 'admin@domainflow.com');
    
    // Fill in the password field
    console.log('Filling password field...');
    await page.fill('#password', 'AdminPassword123!');
    
    // Click the submit button
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error message
    console.log('Waiting for response...');
    
    // Wait up to 10 seconds for either a redirect or an error
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 10000 }).then(() => {
        console.log('SUCCESS: Redirected to dashboard!');
        return 'success';
      }),
      page.waitForSelector('.error', { timeout: 10000 }).then(() => {
        console.log('ERROR: Error message appeared');
        return 'error';
      }),
      page.waitForTimeout(10000).then(() => {
        console.log('TIMEOUT: No clear result after 10 seconds');
        return 'timeout';
      })
    ]).then(async (result) => {
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      if (result === 'success' || currentUrl.includes('dashboard')) {
        console.log('✅ LOGIN SUCCESSFUL - User is now authenticated!');
        
        // Take screenshot of dashboard
        await page.screenshot({ path: '/tmp/dashboard_screenshot.png' });
        console.log('Screenshot saved to /tmp/dashboard_screenshot.png');
        
        return true;
      } else {
        console.log('❌ LOGIN FAILED');
        
        // Check for any error messages
        const errorElements = await page.$$eval('[data-testid*="error"], .error, .alert-error', 
          elements => elements.map(el => el.textContent));
        if (errorElements.length > 0) {
          console.log('Error messages found:', errorElements);
        }
        
        // Take screenshot for debugging
        await page.screenshot({ path: '/tmp/login_error_screenshot.png' });
        console.log('Error screenshot saved to /tmp/login_error_screenshot.png');
        
        return false;
      }
    });

  } catch (error) {
    console.error('Test failed with error:', error);
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/test_error_screenshot.png' });
    console.log('Error screenshot saved to /tmp/test_error_screenshot.png');
    
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testLoginFlow().then(success => {
  console.log('\n=== FINAL RESULT ===');
  if (success) {
    console.log('🎉 Login flow test PASSED - Authentication is working!');
    process.exit(0);
  } else {
    console.log('💥 Login flow test FAILED - Authentication issue detected');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
