    // Enhanced test to catch the map error with browser console monitoring
const { chromium } = require('playwright');

async function captureMapError() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enhanced error monitoring
  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, text);
    if (text.includes('map') || text.includes('undefined') || text.includes('Cannot read properties')) {
      errors.push({
        type: 'console',
        level: msg.type(),
        message: text,
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]:`, error.message);
    console.log(`[ERROR STACK]:`, error.stack);
    errors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  page.on('response', response => {
    if (!response.ok() && response.url().includes('api')) {
      console.log(`[API ERROR]: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('=== Starting Enhanced Error Monitoring ===');
    
    // Navigate to login
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    console.log('Login page loaded');

    // Fill and submit login
    console.log('2. Filling login form...');
    await page.fill('#email', 'admin@domainflow.com');
    await page.fill('#password', 'AdminPassword123!');
    
    console.log('3. Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for navigation with longer timeout
    console.log('4. Waiting for navigation...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('dashboard')) {
      console.log('5. Reached dashboard, monitoring for errors...');
      
      // Stay on dashboard and monitor for errors
      await page.waitForTimeout(10000); // Wait 10 seconds to capture any late errors
      
      // Try to interact with the sidebar or other components that might trigger the error
      console.log('6. Testing sidebar interactions...');
      try {
        await page.click('[data-sidebar="trigger"]', { timeout: 3000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('Sidebar trigger not found or clickable');
      }

      // Try clicking on navigation items
      try {
        const navItems = await page.$$('a[href*="/"]');
        if (navItems.length > 0) {
          console.log(`Found ${navItems.length} navigation items, testing first few...`);
          for (let i = 0; i < Math.min(3, navItems.length); i++) {
            try {
              await navItems[i].hover();
              await page.waitForTimeout(1000);
            } catch (e) {
              console.log(`Error hovering nav item ${i}:`, e.message);
            }
          }
        }
      } catch (e) {
        console.log('Error testing navigation items:', e.message);
      }

      // Monitor for a bit longer
      console.log('7. Final monitoring period...');
      await page.waitForTimeout(5000);
      
      // Take final screenshot
      await page.screenshot({ path: '/tmp/dashboard_final.png', fullPage: true });
      console.log('Final screenshot saved');
      
    } else {
      console.log('❌ Did not reach dashboard');
      await page.screenshot({ path: '/tmp/login_error.png' });
    }

    // Report all errors found
    console.log('\n=== ERROR SUMMARY ===');
    if (errors.length > 0) {
      console.log(`Found ${errors.length} potential errors:`);
      errors.forEach((error, index) => {
        console.log(`\nError ${index + 1}:`);
        console.log(`  Type: ${error.type}`);
        console.log(`  Time: ${error.timestamp}`);
        console.log(`  Message: ${error.message}`);
        if (error.stack) {
          console.log(`  Stack: ${error.stack}`);
        }
      });
    } else {
      console.log('No errors detected during monitoring period');
    }

  } catch (error) {
    console.error('Test execution error:', error);
    await page.screenshot({ path: '/tmp/test_execution_error.png' });
  } finally {
    console.log('\n=== Keeping browser open for manual inspection ===');
    console.log('Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

captureMapError().catch(console.error);
