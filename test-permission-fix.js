// Enhanced error capture script with specific focus on the permission error fix
const { chromium } = require('playwright');

async function testFixedLoginFlow() {
  console.log('🚀 Starting enhanced authentication flow test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Comprehensive error monitoring
  const errors = [];
  const warnings = [];
  const logs = [];
  
  // Monitor all console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
    
    if (msg.type() === 'error') {
      errors.push({
        type: 'console.error',
        message: text,
        timestamp: new Date().toISOString()
      });
    } else if (msg.type() === 'warning') {
      warnings.push({
        type: 'console.warning', 
        message: text,
        timestamp: new Date().toISOString()
      });
    } else {
      logs.push({
        type: msg.type(),
        message: text,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Monitor page errors
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
    console.error('Stack:', error.stack);
    errors.push({
      type: 'page.error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  // Monitor network failures
  page.on('response', response => {
    if (!response.ok()) {
      console.warn(`⚠️  HTTP ${response.status()}: ${response.url()}`);
      warnings.push({
        type: 'network.error',
        status: response.status(),
        url: response.url(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    console.log('📍 Step 2: Filling login form...');
    await page.fill('input[name="email"]', 'admin@domainflow.com');
    await page.fill('input[name="password"]', 'admin123');
    
    await page.waitForTimeout(1000);
    
    console.log('📍 Step 3: Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    console.log('📍 Step 4: Checking current URL and page state...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Wait for any auth context to settle
    await page.waitForTimeout(2000);
    
    // Check if we're logged in by looking for user-specific elements
    console.log('📍 Step 5: Checking authentication state...');
    
    try {
      // Look for navigation or user indicators
      const hasNav = await page.locator('nav').isVisible({ timeout: 5000 });
      const hasUserMenu = await page.locator('[data-testid="user-menu"], .user-menu, [role="menu"]').isVisible({ timeout: 5000 });
      const hasLogoutBtn = await page.locator('text=logout, text=sign out, button:has-text("logout")', { options: { ignoreCase: true } }).isVisible({ timeout: 5000 });
      
      console.log(`Navigation visible: ${hasNav}`);
      console.log(`User menu visible: ${hasUserMenu}`);
      console.log(`Logout button visible: ${hasLogoutBtn}`);
      
      if (hasNav || hasUserMenu || hasLogoutBtn) {
        console.log('✅ Login appears successful - user interface elements detected');
      } else {
        console.log('❓ Login state unclear - no clear user interface elements found');
      }
    } catch (e) {
      console.log('❓ Could not determine auth state from UI elements');
    }
    
    console.log('📍 Step 6: Testing navigation and permission checks...');
    
    // Try to navigate to dashboard or other authenticated pages
    try {
      await page.goto('http://localhost:3000/dashboard', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      await page.waitForTimeout(3000);
      console.log(`Dashboard navigation result: ${page.url()}`);
    } catch (e) {
      console.log(`Dashboard navigation failed: ${e.message}`);
    }
    
    // Try campaigns page
    try {
      await page.goto('http://localhost:3000/campaigns', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      await page.waitForTimeout(3000);
      console.log(`Campaigns navigation result: ${page.url()}`);
    } catch (e) {
      console.log(`Campaigns navigation failed: ${e.message}`);
    }
    
    console.log('📍 Step 7: Final state check...');
    await page.waitForTimeout(2000);
    
    // Take a final screenshot
    await page.screenshot({ path: 'final-auth-test.png', fullPage: true });
    console.log('📸 Final screenshot saved as final-auth-test.png');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    errors.push({
      type: 'test.error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'error-auth-test.png', fullPage: true });
      console.log('📸 Error screenshot saved as error-auth-test.png');
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError.message);
    }
  }
  
  // Report summary
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Total Errors: ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}`);
  console.log(`Total Logs: ${logs.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS DETECTED:');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.type}] ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n')[0]}`);
      }
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. [${warning.type}] ${warning.message}`);
    });
  }
  
  // Check specifically for the permission error we fixed
  const permissionErrors = errors.filter(e => 
    e.message.includes('Cannot read properties of undefined (reading \'some\')') ||
    e.message.includes('hasPermission') ||
    e.message.includes('permissions.some')
  );
  
  if (permissionErrors.length === 0) {
    console.log('✅ No permission-related errors detected - fix appears successful!');
  } else {
    console.log('❌ Permission-related errors still detected:');
    permissionErrors.forEach(error => console.log(`   - ${error.message}`));
  }
  
  console.log('\n🏁 Test completed. Keeping browser open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('🔒 Browser closed.');
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
    logs
  };
}

testFixedLoginFlow().catch(console.error);
