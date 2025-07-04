#!/usr/bin/env node

/**
 * Real Browser Session Persistence Test
 * 
 * This script uses Puppeteer to simulate real human behavior:
 * 1. Opens a real browser
 * 2. Navigates to the login page like a user would
 * 3. Fills the form and submits like a human
 * 4. Reloads the page to test session persistence
 * 5. Verifies the user stays authenticated
 */

const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

let browser = null;
let page = null;

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  switch(level) {
    case 'SUCCESS':
      console.log(`\x1b[32m${prefix} ✅ ${message}\x1b[0m`);
      break;
    case 'ERROR':
      console.log(`\x1b[31m${prefix} ❌ ${message}\x1b[0m`);
      break;
    case 'WARNING':
      console.log(`\x1b[33m${prefix} ⚠️  ${message}\x1b[0m`);
      break;
    case 'DEBUG':
      console.log(`\x1b[90m${prefix} 🔍 ${message}\x1b[0m`);
      break;
    case 'INFO':
    default:
      console.log(`\x1b[36m${prefix} ℹ️  ${message}\x1b[0m`);
      break;
  }
}

async function setupBrowser() {
  log('Launching browser...');
  
  browser = await puppeteer.launch({
    headless: false, // Keep visible so we can see what's happening
    slowMo: 100, // Slow down actions to simulate human behavior
    defaultViewport: {
      width: 1280,
      height: 720
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  page = await browser.newPage();
  
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('localhost')) {
      log(`REQUEST: ${request.method()} ${request.url()}`, 'DEBUG');
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('localhost')) {
      log(`RESPONSE: ${response.status()} ${response.url()}`, 'DEBUG');
    }
  });

  // Log console messages from the page
  page.on('console', msg => {
    log(`BROWSER CONSOLE: ${msg.text()}`, 'DEBUG');
  });

  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  log('Browser launched successfully', 'SUCCESS');
  return true;
}

async function navigateToLogin() {
  log('Navigating to frontend...');
  
  try {
    await page.goto(FRONTEND_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    log(`Navigated to: ${page.url()}`, 'SUCCESS');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 10000
    });
    
    log('Login form is visible', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to navigate to login: ${error.message}`, 'ERROR');
    return false;
  }
}

async function fillLoginForm() {
  log('Filling login form like a human...');
  
  try {
    // Find email input - try multiple selectors
    let emailInput = null;
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      '#email',
      '[data-testid="email"]',
      'input[placeholder*="email" i]'
    ];
    
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          log(`Found email input with selector: ${selector}`, 'DEBUG');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!emailInput) {
      log('Could not find email input field', 'ERROR');
      return false;
    }
    
    // Clear and type email slowly like a human
    await emailInput.click();
    await emailInput.click({ clickCount: 3 }); // Select all
    await page.keyboard.type(TEST_EMAIL, { delay: 100 });
    
    log(`Entered email: ${TEST_EMAIL}`, 'SUCCESS');
    
    // Find password input
    let passwordInput = null;
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      '#password',
      '[data-testid="password"]'
    ];
    
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.$(selector);
        if (passwordInput) {
          log(`Found password input with selector: ${selector}`, 'DEBUG');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!passwordInput) {
      log('Could not find password input field', 'ERROR');
      return false;
    }
    
    // Clear and type password slowly like a human
    await passwordInput.click();
    await passwordInput.click({ clickCount: 3 }); // Select all
    await page.keyboard.type(TEST_PASSWORD, { delay: 100 });
    
    log('Entered password', 'SUCCESS');
    
    return true;
  } catch (error) {
    log(`Failed to fill form: ${error.message}`, 'ERROR');
    return false;
  }
}

async function submitLogin() {
  log('Submitting login form...');
  
  try {
    // Find submit button
    let submitButton = null;
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      '[data-testid="login-button"]',
      'form button',
      '.login-button'
    ];
    
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          log(`Found submit button with selector: ${selector}`, 'DEBUG');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!submitButton) {
      // Try to submit via Enter key
      log('No submit button found, trying Enter key', 'DEBUG');
      await page.keyboard.press('Enter');
    } else {
      // Click submit button
      await submitButton.click();
    }
    
    log('Login form submitted', 'SUCCESS');
    
    // Wait for navigation or response
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 }),
      page.waitForSelector('.dashboard', { timeout: 10000 }),
      page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 })
    ]);
    
    const currentUrl = page.url();
    log(`After login, current URL: ${currentUrl}`, 'DEBUG');
    
    // Check if we're still on login page (failed login)
    if (currentUrl.includes('/login')) {
      // Look for error messages
      const errorElements = await page.$$('*');
      for (const element of errorElements) {
        const text = await page.evaluate(el => el.textContent, element);
        if (text && (text.includes('error') || text.includes('invalid') || text.includes('incorrect'))) {
          log(`Login error detected: ${text}`, 'ERROR');
          return false;
        }
      }
      log('Still on login page after submit - login may have failed', 'WARNING');
      return false;
    }
    
    log('Login appears successful - redirected away from login page', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to submit login: ${error.message}`, 'ERROR');
    return false;
  }
}

async function testSessionPersistence() {
  log('Testing session persistence by reloading page...');
  
  try {
    const urlBeforeReload = page.url();
    log(`URL before reload: ${urlBeforeReload}`, 'DEBUG');
    
    // Get cookies before reload
    const cookiesBefore = await page.cookies();
    const sessionCookie = cookiesBefore.find(cookie => cookie.name === 'domainflow_session');
    
    if (sessionCookie) {
      log(`Session cookie found: ${sessionCookie.name}=${sessionCookie.value.substring(0, 20)}...`, 'DEBUG');
    } else {
      log('No session cookie found before reload', 'WARNING');
    }
    
    // Reload the page
    await page.reload({ waitUntil: 'networkidle2' });
    
    const urlAfterReload = page.url();
    log(`URL after reload: ${urlAfterReload}`, 'DEBUG');
    
    // Check if we got redirected back to login
    if (urlAfterReload.includes('/login')) {
      log('❌ SESSION PERSISTENCE FAILED - Redirected back to login after reload', 'ERROR');
      return false;
    }
    
    // Check if we're still on the same authenticated page
    if (urlAfterReload === urlBeforeReload || (!urlAfterReload.includes('/login'))) {
      log('✅ SESSION PERSISTENCE SUCCESS - Still on authenticated page after reload', 'SUCCESS');
      
      // Get cookies after reload
      const cookiesAfter = await page.cookies();
      const sessionCookieAfter = cookiesAfter.find(cookie => cookie.name === 'domainflow_session');
      
      if (sessionCookieAfter) {
        log(`Session cookie still present after reload: ${sessionCookieAfter.name}=${sessionCookieAfter.value.substring(0, 20)}...`, 'SUCCESS');
      }
      
      return true;
    }
    
    log('Unexpected behavior after reload', 'WARNING');
    return false;
  } catch (error) {
    log(`Failed to test session persistence: ${error.message}`, 'ERROR');
    return false;
  }
}

async function takeScreenshot(filename) {
  try {
    await page.screenshot({
      path: `test-videos/${filename}`,
      fullPage: true
    });
    log(`Screenshot saved: ${filename}`, 'DEBUG');
  } catch (error) {
    log(`Failed to take screenshot: ${error.message}`, 'DEBUG');
  }
}

async function cleanup() {
  if (browser) {
    log('Closing browser...');
    await browser.close();
    log('Browser closed', 'SUCCESS');
  }
}

async function runBrowserTest() {
  console.log('\n🤖 Real Browser Session Persistence Test\n');
  console.log('='*60);
  
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // Test 1: Setup Browser
    totalTests++;
    log('\n--- Test 1: Browser Setup ---');
    if (await setupBrowser()) {
      testsPassed++;
      await takeScreenshot('01-browser-launched.png');
    } else {
      throw new Error('Browser setup failed');
    }
    
    // Test 2: Navigate to Login
    totalTests++;
    log('\n--- Test 2: Navigate to Login ---');
    if (await navigateToLogin()) {
      testsPassed++;
      await takeScreenshot('02-login-page.png');
    } else {
      throw new Error('Navigation to login failed');
    }
    
    // Test 3: Fill Login Form
    totalTests++;
    log('\n--- Test 3: Fill Login Form ---');
    if (await fillLoginForm()) {
      testsPassed++;
      await takeScreenshot('03-form-filled.png');
    } else {
      throw new Error('Form filling failed');
    }
    
    // Test 4: Submit Login
    totalTests++;
    log('\n--- Test 4: Submit Login ---');
    if (await submitLogin()) {
      testsPassed++;
      await takeScreenshot('04-after-login.png');
    } else {
      throw new Error('Login submission failed');
    }
    
    // Test 5: Session Persistence
    totalTests++;
    log('\n--- Test 5: Session Persistence (Reload Test) ---');
    if (await testSessionPersistence()) {
      testsPassed++;
      await takeScreenshot('05-after-reload.png');
    } else {
      await takeScreenshot('05-failed-reload.png');
    }
    
  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'ERROR');
    await takeScreenshot('error-state.png');
  } finally {
    await cleanup();
  }
  
  // Final Results
  console.log('\n' + '='*60);
  log(`Tests completed: ${testsPassed}/${totalTests} passed`, 'INFO');
  
  if (testsPassed === totalTests) {
    log('🎉 ALL BROWSER TESTS PASSED - Session persistence works in real browser!', 'SUCCESS');
    return true;
  } else {
    log(`💥 ${totalTests - testsPassed} BROWSER TESTS FAILED - Session persistence issues detected`, 'ERROR');
    return false;
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  log('Received SIGINT, cleaning up...', 'WARNING');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, cleaning up...', 'WARNING');
  await cleanup();
  process.exit(0);
});

// Run the test
runBrowserTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Unexpected error: ${error.message}`, 'ERROR');
  console.error(error);
  cleanup().finally(() => process.exit(1));
});