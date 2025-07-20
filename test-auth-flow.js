import { chromium } from 'playwright';

async function testAuthenticationFlow() {
  console.log('🚀 Starting Authentication Flow Test...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000     // Slow down actions to see what happens
  });
  
  const context = await browser.newContext({
    // Disable any browser cache to get fresh state
    storageState: undefined
  });
  
  const page = await context.newPage();
  
  // Capture all console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type().toUpperCase()}] ${text}`);
    console.log(`📋 CONSOLE: [${msg.type().toUpperCase()}] ${text}`);
  });

  // Capture network requests
  const networkLogs = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkLogs.push(`→ REQUEST: ${request.method()} ${request.url()}`);
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      networkLogs.push(`← RESPONSE: ${response.status()} ${response.url()}`);
      console.log(`🌐 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('\n🔍 Step 1: Navigate to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any initial authentication checks
    await page.waitForTimeout(2000);
    
    console.log('\n🔍 Step 2: Fill login form...');
    await page.fill('input[name="email"], input[type="email"]', 'admin@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    
    console.log('\n🔍 Step 3: Submit login...');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for navigation and authentication
    console.log('\n🔍 Step 4: Waiting for authentication and navigation...');
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    // Check if we're on dashboard or still on login
    if (currentUrl.includes('/login')) {
      console.log('❌ ISSUE: Still on login page - checking for any error messages...');
      
      const errorMessages = await page.locator('.error, .alert-error, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('🚨 Error messages found:', errorMessages);
      }
      
      // Check if we need to refresh the page
      console.log('\n🔄 Testing manual page refresh...');
      await page.reload();
      await page.waitForTimeout(2000);
      
      const urlAfterRefresh = page.url();
      console.log(`📍 URL after refresh: ${urlAfterRefresh}`);
    }
    
    // Wait for any potential redirects
    await page.waitForTimeout(2000);
    
    console.log('\n🔍 Step 5: Check authentication state and user display...');
    
    // Look for user email in the sidebar/header
    const userEmailSelectors = [
      'text=/.*@.*/', // Any text containing @ (email pattern)
      '[data-testid="user-email"]',
      '.sidebar footer span:first-child',
      '.user-info',
      '.user-display'
    ];
    
    let userEmailFound = null;
    for (const selector of userEmailSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          const text = await element.first().textContent();
          if (text && text.includes('@')) {
            userEmailFound = text;
            console.log(`✅ User email found: "${text}"`);
            break;
          } else if (text) {
            console.log(`📝 Text found but not email: "${text}"`);
          }
        }
      } catch (e) {
        // Selector might not exist, continue
      }
    }
    
    if (!userEmailFound) {
      console.log('❌ User email not found - checking for "User Authenticated" text...');
      const userAuthText = await page.locator('text="User Authenticated"').count();
      if (userAuthText > 0) {
        console.log('🔍 Found "User Authenticated" - email display not working');
      }
    }
    
    console.log('\n🔍 Step 6: Final URL and state check...');
    const finalUrl = page.url();
    const isOnDashboard = finalUrl.includes('/dashboard') || finalUrl === 'http://localhost:3000/';
    const isOnLogin = finalUrl.includes('/login');
    
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`✅ On Dashboard: ${isOnDashboard}`);
    console.log(`❌ On Login: ${isOnLogin}`);
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'auth-test-final-state.png', fullPage: true });
    console.log('📸 Screenshot saved: auth-test-final-state.png');
    
    console.log('\n📋 SUMMARY REPORT:');
    console.log('==================');
    console.log(`Authentication successful: ${!isOnLogin}`);
    console.log(`Redirected to dashboard: ${isOnDashboard}`);
    console.log(`User email displayed: ${userEmailFound ? 'YES' : 'NO'}`);
    console.log(`Final URL: ${finalUrl}`);
    
    console.log('\n🔍 DETAILED CONSOLE LOGS:');
    console.log('=========================');
    consoleLogs
      .filter(log => log.includes('[useCachedAuth]') || log.includes('[AdvancedConditionalLayout]') || log.includes('[AppSidebar]'))
      .forEach(log => console.log(log));
    
    console.log('\n🌐 API NETWORK LOGS:');
    console.log('===================');
    networkLogs.forEach(log => console.log(log));
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
  }
}

// Run the test
testAuthenticationFlow().catch(console.error);