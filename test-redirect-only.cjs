const { chromium } = require('playwright');

/**
 * Focused test for campaign redirect issue
 * Goes directly to campaign creation form to test redirect logic
 */

class RedirectTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
  }

  async init() {
    console.log('🚀 Starting Campaign Redirect Test');
    
    this.browser = await chromium.launch({
      headless: false,
      devtools: false,
      slowMo: 100
    });

    this.page = await this.browser.newPage();
    
    // Enable console logging to capture diagnostic logs
    this.page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[BROWSER] ${msg.text()}`);
      }
    });

    // Monitor network requests
    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') || url.includes(':8080') || url.includes(':3000')) {
        console.log(`[API CALL] ${request.method()} ${url}`);
      }
    });

    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async testRedirectDirect() {
    console.log('\n📍 Testing Direct Campaign Creation Redirect');
    
    // Go directly to login first
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForSelector('input[id="email"]', { timeout: 5000 });
    
    // Quick login
    await this.page.fill('input[id="email"]', 'test@example.com');
    await this.page.fill('input[id="password"]', 'password123');
    await this.page.click('button[type="submit"]:has-text("Sign in Securely")');
    await this.page.waitForTimeout(3000);
    
    // Go directly to campaign creation form
    await this.page.goto(`${this.baseUrl}/campaigns/new`);
    await this.page.waitForLoadState('networkidle');
    
    // Wait for form to load
    await this.page.waitForSelector('text=Campaign Configuration', { timeout: 10000 });
    console.log('✅ Campaign form loaded');

    // Fill out the form quickly
    console.log('📝 Filling campaign form...');
    
    // Select domain generation
    await this.page.click('[role="combobox"]');
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.click('[role="option"]:has-text("domain_generation")');
    
    // Wait for generation pattern field
    await this.page.waitForSelector('text=Generation Pattern', { timeout: 5000 });
    
    // Fill basic campaign info
    const campaignName = `Redirect-Test-${Date.now()}`;
    await this.page.fill('input[placeholder="e.g., Q3 Tech Outreach"]', campaignName);
    
    // Configure domain generation - more robust dropdown handling
    await this.page.click('text=Generation Pattern');
    await this.page.waitForTimeout(500); // Wait for dropdown animation
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    
    // Find and click the option more reliably
    const option = await this.page.locator('[role="option"]').filter({ hasText: 'Prefix + Variable Characters' }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ force: true });
    
    await this.page.fill('input[name="constantPart"], input[placeholder*="constant"]', 'redirecttest');
    await this.page.fill('input[name="allowedCharSet"], input[placeholder*="character"]', 'abcdefghijklmnopqrstuvwxyz0123456789');
    await this.page.fill('input[name="prefixVariableLength"], input[type="number"]', '3');
    await this.page.fill('input[name="tldsInput"], input[placeholder*=".com"]', '.com');
    await this.page.fill('input[name="maxDomainsToGenerate"], input[placeholder="1000"]', '50');
    
    console.log('✅ Form filled, about to test redirect...');
    
    // Track URLs for redirect verification
    const beforeSubmitUrl = this.page.url();
    console.log(`🔍 [REDIRECT_TEST] URL before submit: ${beforeSubmitUrl}`);
    
    // Submit the form and monitor redirect
    await this.page.click('button[type="submit"]:has-text("Create Campaign")');
    console.log('🔍 [REDIRECT_TEST] Form submitted, monitoring for redirect...');
    
    // Wait for success toast
    try {
      await this.page.waitForSelector('text=Campaign Created Successfully', { timeout: 15000 });
      console.log('✅ [REDIRECT_TEST] Success toast appeared');
      
      // Monitor URL changes for 10 seconds
      for (let i = 0; i < 10; i++) {
        await this.page.waitForTimeout(1000);
        const currentUrl = this.page.url();
        console.log(`🔍 [REDIRECT_TEST] URL after ${i+1}s: ${currentUrl}`);
        
        // Check if redirected to campaign details
        if (currentUrl.includes('/campaigns/') && !currentUrl.includes('/new')) {
          console.log(`✅ [REDIRECT_TEST] REDIRECT SUCCESSFUL! Redirected to: ${currentUrl}`);
          return true;
        }
      }
      
      console.log('❌ [REDIRECT_TEST] REDIRECT FAILED - Still on form page after 10 seconds');
      return false;
      
    } catch (error) {
      console.log('❌ [REDIRECT_TEST] Campaign creation failed or no success toast');
      console.error(error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.init();
      const success = await this.testRedirectDirect();
      
      if (success) {
        console.log('\n🎉 REDIRECT TEST PASSED!');
        console.log('✅ Campaign creation and redirect working correctly');
      } else {
        console.log('\n❌ REDIRECT TEST FAILED!');
        console.log('❌ Redirect is not working - fix needed');
      }
      
      return success;
    } catch (error) {
      console.error('\n💥 TEST ERROR:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute the test
async function main() {
  console.log('🧪 Campaign Redirect Test Runner');
  console.log('===================================');
  
  const test = new RedirectTest();
  const success = await test.run();
  
  process.exit(success ? 0 : 1);
}

main();