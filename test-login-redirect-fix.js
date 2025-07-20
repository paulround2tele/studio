#!/usr/bin/env node

/**
 * Test Login Redirect Fix
 * Tests the navigation conflict fix with correct credentials
 */

import { chromium } from 'playwright';

async function testLoginRedirectFix() {
  console.log('🧪 Testing Login Redirect Fix...');
  console.log('✅ Using CORRECT credentials: test@example.com / password123');
  console.log('✅ Testing navigation conflict fix (no dual navigation)');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Faster for testing
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Track key events
  const events = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('LOGIN_FORM') || text.includes('AdvancedConditionalLayout') || text.includes('useCachedAuth')) {
      events.push(`📋 ${msg.type().toUpperCase()}: ${text}`);
      console.log(`📋 ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  try {
    console.log('\n🔍 Step 1: Navigate to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    console.log('\n🔍 Step 2: Fill login form with CORRECT credentials...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    console.log('\n🔍 Step 3: Submit login and track navigation...');
    const initialUrl = page.url();
    console.log(`Initial URL: ${initialUrl}`);
    
    // Submit and wait for any URL change
    await page.click('button[type="submit"]');
    console.log('Login submitted, waiting for navigation...');
    
    // Wait for either success redirect or error
    try {
      await page.waitForURL(url => url !== initialUrl, { timeout: 10000 });
      const newUrl = page.url();
      console.log(`✅ URL CHANGED: ${newUrl}`);
      
      // Additional wait for full page load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const finalUrl = page.url();
      console.log(`📍 Final URL: ${finalUrl}`);
      
      // Check if we successfully reached dashboard
      if (finalUrl.includes('/dashboard') || finalUrl === 'http://localhost:3000/') {
        console.log('🎉 SUCCESS: Login redirect working! Reached dashboard.');
        
        // Check for user email display
        try {
          const userEmail = await page.locator('text=/test@example.com/').first().textContent({ timeout: 3000 });
          if (userEmail) {
            console.log(`✅ User email displayed: ${userEmail}`);
          }
        } catch (e) {
          console.log('📝 User email not visible (checking layout)');
        }
        
      } else {
        console.log(`⚠️  Redirected to unexpected page: ${finalUrl}`);
      }
      
    } catch (timeoutError) {
      console.log('❌ No redirect detected within 10 seconds');
      
      // Check for errors on the login page
      const errorElements = await page.locator('.error, .alert-error, [role="alert"]').allTextContents();
      if (errorElements.length > 0) {
        console.log('🚨 Error messages found:');
        errorElements.forEach((error, index) => {
          console.log(`  ${index + 1}. "${error}"`);
        });
      } else {
        console.log('🔍 No error messages found - may be a different issue');
      }
    }
    
    await page.screenshot({ path: 'login-redirect-test-final.png', fullPage: true });
    console.log('📸 Screenshot saved: login-redirect-test-final.png');
    
    console.log('\n📋 Key Events Captured:');
    events.forEach(event => console.log(event));
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    await page.screenshot({ path: 'login-redirect-test-error.png', fullPage: true });
  }

  console.log('\n🏁 Closing browser...');
  await browser.close();
}

testLoginRedirectFix().catch(console.error);