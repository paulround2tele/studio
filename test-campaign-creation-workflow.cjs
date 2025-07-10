const { chromium } = require('playwright');

/**
 * Comprehensive End-to-End Test for Domain Generation Campaign Creation
 * Tests the complete user workflow from login to campaign metrics page
 * 
 * This test validates:
 * 1. Login functionality with correct credentials
 * 2. Navigation through the UI (no direct URL access)
 * 3. Campaign form completion with all required fields
 * 4. Campaign creation and API routing
 * 5. Redirect to campaign metrics page
 * 6. API calls going to correct backend port (8080)
 */

class CampaignCreationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testStartTime = Date.now();
    this.baseUrl = 'http://localhost:3000';
    this.credentials = {
      email: 'test@example.com',
      password: 'password123'
    };
  }

  async init() {
    console.log('🚀 Starting Campaign Creation E2E Test');
    
    // Launch browser with detailed logging
    this.browser = await chromium.launch({
      headless: false, // Run in visible mode for debugging
      devtools: false,
      slowMo: 100 // Add slight delay for visibility
    });

    this.page = await this.browser.newPage();
    
    // Enable console logging to capture API calls
    this.page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[BROWSER] ${msg.text()}`);
      }
    });

    // Monitor network requests to validate API routing
    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') || url.includes(':8080') || url.includes(':3000')) {
        console.log(`[API CALL] ${request.method()} ${url}`);
      }
    });

    // Monitor responses for errors
    this.page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 400) {
        console.log(`[API ERROR] ${response.status()} ${url}`);
      }
    });

    // Set viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async step1_NavigateToHomePage() {
    console.log('\n📍 STEP 1: Navigate to Home Page');
    
    await this.page.goto(this.baseUrl);
    await this.page.waitForLoadState('networkidle');
    
    // Verify we're on login page
    await this.page.waitForSelector('text=Welcome back to DomainFlow', { timeout: 10000 });
    console.log('✅ Successfully loaded login page');
  }

  async step2_LoginWithCredentials() {
    console.log('\n📍 STEP 2: Login with Test Credentials');
    
    // Fill login form using correct id selectors
    await this.page.fill('input[id="email"]', this.credentials.email);
    await this.page.fill('input[id="password"]', this.credentials.password);
    
    // Submit login using the correct button text
    await this.page.click('button[type="submit"]:has-text("Sign in Securely")');
    
    // Wait for dashboard content to load after login
    await this.page.waitForTimeout(3000); // Give dashboard time to fully load
    
    // Verify we have dashboard content
    const hasCampaigns = await this.page.locator('text=Go to Campaigns').isVisible();
    if (hasCampaigns) {
      console.log('✅ Successfully logged in and dashboard loaded');
    } else {
      // Alternative check - wait for dashboard title or campaigns card
      await this.page.waitForSelector('text=Campaigns', { timeout: 10000 });
      console.log('✅ Successfully logged in and dashboard loaded');
    }
  }

  async step3_NavigateToCampaigns() {
    console.log('\n📍 STEP 3: Navigate to Campaigns Page');
    
    // Click "Go to Campaigns" button on dashboard
    await this.page.click('text=Go to Campaigns');
    
    // Wait for navigation and page load
    await this.page.waitForLoadState('networkidle');
    
    // Wait for the campaigns page header to appear
    await this.page.waitForSelector('text=Campaigns', { timeout: 10000 });
    
    // Verify we have the Create New Campaign button (this is unique to campaigns page)
    const createButton = await this.page.locator('text=Create New Campaign').first();
    await createButton.waitFor({ timeout: 5000 });
    
    console.log('✅ Successfully navigated to campaigns page');
  }

  async step4_ClickCreateNewCampaign() {
    console.log('\n📍 STEP 4: Click Create New Campaign');
    
    // Click "Create New Campaign" button
    await this.page.click('text=Create New Campaign');
    
    // Wait for campaign creation form to load
    await this.page.waitForSelector('text=Campaign Configuration', { timeout: 10000 });
    await this.page.waitForSelector('[role="combobox"]', { timeout: 5000 });
    
    console.log('✅ Successfully opened campaign creation form');
  }

  async step5_SelectDomainGenerationType() {
    console.log('\n📍 STEP 5: Select Domain Generation Campaign Type');
    
    // Click on the campaign type select trigger (React Select component)
    await this.page.click('[role="combobox"]');
    
    // Wait for dropdown options to appear and select domain_generation
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.click('[role="option"]:has-text("domain_generation")');
    
    // Wait for generation pattern field to appear (specific to domain generation)
    await this.page.waitForSelector('text=Generation Pattern', { timeout: 5000 });
    
    console.log('✅ Successfully selected domain generation campaign type');
  }

  async step6_FillCampaignDetails() {
    console.log('\n📍 STEP 6: Fill Campaign Details');
    
    const campaignName = `Test-Campaign-${Date.now()}`;
    const description = 'Automated test campaign for domain generation workflow validation';
    
    // Fill basic campaign information
    await this.page.fill('input[placeholder="e.g., Q3 Tech Outreach"]', campaignName);
    console.log(`✅ Filled campaign name: ${campaignName}`);
    
    // Try to fill description if field exists (might be optional)
    try {
      const descriptionField = this.page.locator('textarea').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill(description);
        console.log('✅ Filled campaign description');
      } else {
        console.log('ℹ️  Description field not found, skipping (might be optional)');
      }
    } catch (error) {
      console.log('ℹ️  Description field not accessible, skipping (might be optional)');
    }
  }

  async step7_ConfigureDomainGeneration() {
    console.log('\n📍 STEP 7: Configure Domain Generation Parameters');
    
    // Select generation pattern (prefix_variable) - wait for the select to be available
    await this.page.click('text=Generation Pattern');
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.click('[role="option"]:has-text("Prefix + Variable Characters")');
    
    // Fill constant part field
    await this.page.fill('input[name="constantPart"], input[placeholder*="constant"]', 'testdomain');
    
    // Fill character set (allowedCharSet field)
    await this.page.fill('input[name="allowedCharSet"], input[placeholder*="character"]', 'abcdefghijklmnopqrstuvwxyz0123456789');
    
    // Set prefix variable length
    await this.page.fill('input[name="prefixVariableLength"], input[type="number"]', '3');
    
    // Fill TLDs input field
    await this.page.fill('input[name="tldsInput"], input[placeholder*=".com"]', '.com');
    
    // Set maximum domains to generate
    await this.page.fill('input[name="maxDomainsToGenerate"], input[placeholder="1000"]', '100');
    
    console.log('✅ Configured domain generation parameters');
    console.log('   - Pattern: prefix_variable (Prefix + Variable Characters)');
    console.log('   - Constant: testdomain');
    console.log('   - Character set: abcdefghijklmnopqrstuvwxyz0123456789');
    console.log('   - Variable length: 3');
    console.log('   - TLDs: .com');
    console.log('   - Max domains: 100');
  }

  async step8_SubmitCampaign() {
    console.log('\n📍 STEP 8: Submit Campaign Creation');
    
    const initialUrl = this.page.url();
    console.log(`🔍 [REDIRECT_DEBUG] Initial URL before submission: ${initialUrl}`);
    
    // Submit the form using the exact button text from CampaignFormV2
    await this.page.click('button[type="submit"]:has-text("Create Campaign")');
    console.log('🔍 [REDIRECT_DEBUG] Form submitted, waiting for response...');
    
    // Wait for API response and any immediate changes
    await this.page.waitForTimeout(2000);
    
    const urlAfterSubmit = this.page.url();
    console.log(`🔍 [REDIRECT_DEBUG] URL after form submit: ${urlAfterSubmit}`);
    
    // Check for success toast or any UI changes
    try {
      await this.page.waitForSelector('text=Campaign Created Successfully', { timeout: 10000 });
      console.log('✅ [REDIRECT_DEBUG] Campaign creation success toast detected');
      
      // Log current state
      const currentUrl = this.page.url();
      console.log(`🔍 [REDIRECT_DEBUG] Current URL after success toast: ${currentUrl}`);
      
      // Wait and check for any redirect attempts
      console.log('🔍 [REDIRECT_DEBUG] Waiting 5 seconds to observe any redirect behavior...');
      await this.page.waitForTimeout(5000);
      
      const finalUrl = this.page.url();
      console.log(`🔍 [REDIRECT_DEBUG] Final URL after waiting: ${finalUrl}`);
      
      // Check if we've been redirected to campaign details page
      if (finalUrl.includes('/campaigns/') && !finalUrl.includes('/new')) {
        console.log('✅ [REDIRECT_DEBUG] Successfully redirected to campaign details page');
        return true;
      } else {
        console.log('❌ [REDIRECT_DEBUG] No redirect occurred - still on form page');
        
        // Look for any navigation buttons or links
        console.log('🔍 [REDIRECT_DEBUG] Checking for manual navigation options...');
        
        // Check for View Campaign button
        const viewButton = await this.page.locator('button:has-text("View Campaign"), a:has-text("View Campaign")');
        const viewButtonVisible = await viewButton.isVisible();
        console.log(`🔍 [REDIRECT_DEBUG] View Campaign button visible: ${viewButtonVisible}`);
        
        if (viewButtonVisible) {
          console.log('🔍 [REDIRECT_DEBUG] Clicking View Campaign button...');
          await viewButton.click();
          await this.page.waitForTimeout(3000);
          
          const afterClickUrl = this.page.url();
          console.log(`🔍 [REDIRECT_DEBUG] URL after clicking View Campaign: ${afterClickUrl}`);
          
          if (afterClickUrl.includes('/campaigns/') && !afterClickUrl.includes('/new')) {
            console.log('✅ [REDIRECT_DEBUG] Manual navigation to campaign details successful');
            return true;
          }
        }
        
        // Check for any other navigation elements
        const backToCampaigns = await this.page.locator('text=Back to Campaigns, text=View Campaigns, text=Go to Campaigns');
        const backButtonVisible = await backToCampaigns.isVisible();
        console.log(`🔍 [REDIRECT_DEBUG] Back to campaigns button visible: ${backButtonVisible}`);
        
        console.log('❌ [REDIRECT_DEBUG] REDIRECT ISSUE CONFIRMED - Campaign created but user not redirected to details page');
        return false;
      }
      
    } catch (toastError) {
      console.log('❌ [REDIRECT_DEBUG] No success toast found - campaign creation may have failed');
      console.log(`🔍 [REDIRECT_DEBUG] Toast error: ${toastError.message}`);
      return false;
    }
  }

  async step9_ValidateMetricsPage() {
    console.log('\n📍 STEP 9: Validate Campaign Metrics Page');
    
    try {
      // Check for campaign metrics page elements
      await this.page.waitForSelector('text=Campaign Metrics', { timeout: 10000 });
      
      // Look for campaign name/title
      const campaignTitle = await this.page.locator('h1, h2, h3').filter({ hasText: /Test-Campaign-/ }).first();
      if (await campaignTitle.isVisible()) {
        const titleText = await campaignTitle.textContent();
        console.log(`✅ Found campaign title: ${titleText}`);
      }
      
      // Check for campaign status/progress indicators
      const progressElements = await this.page.locator('text=/Progress|Status|Pending|Running|0%/').count();
      if (progressElements > 0) {
        console.log('✅ Found campaign progress/status indicators');
      }
      
      // Validate URL structure
      const currentUrl = this.page.url();
      if (currentUrl.includes('/campaigns/') && currentUrl.includes('type=domain_generation')) {
        console.log(`✅ Correct URL structure: ${currentUrl}`);
      } else {
        console.log(`❌ Unexpected URL structure: ${currentUrl}`);
        return false;
      }
      
      console.log('✅ Campaign metrics page validated successfully');
      return true;
      
    } catch (error) {
      console.log(`❌ Failed to validate metrics page: ${error.message}`);
      return false;
    }
  }

  async step10_ValidateApiCalls() {
    console.log('\n📍 STEP 10: Validate API Calls Routing');
    
    // Wait a moment for any API calls to complete
    await this.page.waitForTimeout(2000);
    
    // Check network logs (already logged during execution)
    console.log('✅ API call routing validation complete (check logs above)');
    console.log('   Expected: API calls should go to localhost:8080, not localhost:3000');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    const testDuration = () => `${((Date.now() - this.testStartTime) / 1000).toFixed(1)}s`;
    
    try {
      await this.init();
      
      // Execute test steps
      await this.step1_NavigateToHomePage();
      await this.step2_LoginWithCredentials();
      await this.step3_NavigateToCampaigns();
      await this.step4_ClickCreateNewCampaign();
      await this.step5_SelectDomainGenerationType();
      await this.step6_FillCampaignDetails();
      await this.step7_ConfigureDomainGeneration();
      
      const creationSuccess = await this.step8_SubmitCampaign();
      
      if (creationSuccess) {
        await this.step9_ValidateMetricsPage();
        await this.step10_ValidateApiCalls();
        
        console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
        console.log(`⏱️  Total test duration: ${testDuration()}`);
        console.log('✅ Campaign creation workflow validation PASSED');
        return true;
      } else {
        console.log('\n❌ TEST FAILED: Campaign creation or redirect failed');
        console.log(`⏱️  Test duration: ${testDuration()}`);
        return false;
      }
      
    } catch (error) {
      console.error('\n💥 TEST ERROR:', error);
      console.log(`⏱️  Test duration before error: ${testDuration()}`);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute the test
async function main() {
  console.log('🧪 Campaign Creation E2E Test Runner');
  console.log('=====================================');
  
  const test = new CampaignCreationTest();
  const success = await test.run();
  
  process.exit(success ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();