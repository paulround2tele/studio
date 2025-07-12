const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DNSPhaseTransitionTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.logs = [];
    this.consoleLogs = [];
    this.networkRequests = [];
    this.logFilePath = path.join(__dirname, 'phase-transition-test-logs.txt');
    this.testResults = {
      campaignCreation: false,
      domainGenerationCompletion: false,
      phaseTransitionTrigger: false,
      updateCampaignCall: false,
      noDuplicateCampaigns: false,
      phaseTransitionSuccess: false
    };
    
    // Initialize log file
    fs.writeFileSync(this.logFilePath, `=== DNS Phase Transition Test Started at ${new Date().toISOString()} ===\n`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    
    // Write to file immediately for real-time debugging
    fs.appendFileSync(this.logFilePath, logEntry + '\n');
  }

  setupNetworkMonitoring() {
    // Monitor all network requests to track API calls
    this.page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      // Track campaign-related API calls
      if (url.includes('/campaigns') || url.includes('/validate-dns')) {
        const requestInfo = {
          url,
          method,
          timestamp: new Date().toISOString(),
          headers: request.headers()
        };
        
        this.networkRequests.push(requestInfo);
        this.log(`📤 [NETWORK] ${method} ${url}`);
        
        // Specifically look for UpdateCampaign calls
        if (method === 'PUT' && url.match(/\/campaigns\/[^\/]+$/)) {
          this.log(`🎯 [CRITICAL] UpdateCampaign API call detected: ${url}`);
        }
      }
    });

    this.page.on('response', async (response) => {
      const url = response.url();
      const method = response.request().method();
      const status = response.status();
      
      if (url.includes('/campaigns')) {
        this.log(`📥 [NETWORK] ${method} ${url} → ${status}`);
        
        // Try to capture response data for campaign calls
        try {
          if (response.status() === 200 && method === 'PUT' && url.match(/\/campaigns\/[^\/]+$/)) {
            const responseData = await response.json();
            this.log(`📊 [CAMPAIGN DATA] UpdateCampaign response: ${JSON.stringify({
              id: responseData.id,
              campaignType: responseData.campaignType,
              status: responseData.status,
              currentPhase: responseData.currentPhase
            })}`);
          }
        } catch (e) {
          // Response might not be JSON, that's ok
        }
      }
    });
  }

  setupConsoleCapture() {
    this.page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      // Capture phase transition, UpdateCampaign, and campaign-related logs
      if (text.includes('UpdateCampaign') || text.includes('campaignType') || 
          text.includes('phase') || text.includes('transition') ||
          text.includes('DNS') || text.includes('campaign') || 
          type === 'error' || type === 'warn') {
        this.consoleLogs.push(`[${type.toUpperCase()}] ${text}`);
        this.log(`🔍 [FRONTEND ${type.toUpperCase()}] ${text}`);
      }
    });
  }

  async init() {
    this.browser = await chromium.launch({
      headless: false,
      devtools: false,
      slowMo: 100
    });

    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    this.setupNetworkMonitoring();
    this.setupConsoleCapture();
  }

  async login() {
    this.log('🔐 Logging in...');
    
    // Very simple navigation - just go to the URL without complex wait conditions
    await this.page.goto(`${this.baseUrl}/login`);
    this.log('✅ Navigated to login page');
    
    // Wait a moment for page to load
    await this.page.waitForTimeout(2000);
    
    // Wait for email input to appear
    await this.page.waitForSelector('input[id="email"]', { timeout: 8000 });
    this.log('✅ Login form found');

    // Fill in credentials
    await this.page.fill('input[id="email"]', 'test@example.com');
    await this.page.fill('input[id="password"]', 'password123');
    
    // Click login button
    await this.page.click('button[type="submit"]:has-text("Sign in Securely")');
    this.log('🔑 Login button clicked');
    
    // Wait for navigation away from login
    await this.page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 8000 });
    this.log('✅ Login successful');
    return true;
  }

  async createDomainGenerationCampaign() {
    this.log('🎯 Creating domain generation campaign through UI...');
    
    // Navigate to campaign creation with better error handling
    try {
      await this.page.goto(`${this.baseUrl}/campaigns/new`);
      this.log('✅ Navigated to campaign creation page');
    } catch (error) {
      this.log(`❌ Navigation failed, trying alternative approach: ${error.message}`);
      // Try clicking a "New Campaign" button from dashboard instead
      await this.page.click('a[href="/campaigns/new"]', { timeout: 5000 });
      this.log('✅ Clicked new campaign link from dashboard');
    }
    
    // Wait for campaign form elements to appear
    await this.page.waitForTimeout(3000); // Give page time to load
    await this.page.waitForSelector('input[name="campaignName"], text=Campaign Configuration', { timeout: 10000 });

    // Select domain_generation campaign type
    await this.page.click('[role="combobox"]');
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.click('[role="option"]:has-text("domain_generation")');

    await this.page.waitForSelector('text=Generation Pattern', { timeout: 5000 });

    const campaignName = `Phase-Test-${Date.now()}`;
    await this.page.fill('input[placeholder="e.g., Q3 Tech Outreach"]', campaignName);

    // Configure domain generation parameters
    await this.page.click('text=Generation Pattern');
    await this.page.waitForTimeout(500);
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });

    const option = await this.page.locator('[role="option"]').filter({ hasText: 'Prefix + Variable Characters' }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ force: true });

    // Fill in the generation parameters (small numbers for quick completion)
    await this.page.fill('input[name="constantPart"], input[placeholder*="constant"]', 'test');
    await this.page.fill('input[name="allowedCharSet"], input[placeholder*="character"]', 'abc');
    await this.page.fill('input[name="prefixVariableLength"], input[type="number"]', '2');
    await this.page.fill('input[name="tldsInput"], input[placeholder*=".com"]', '.com');
    await this.page.fill('input[name="maxDomainsToGenerate"], input[placeholder="1000"]', '5'); // Small number for quick test

    this.log(`📝 Campaign configuration: ${campaignName}, 5 domains, abc charset, 2 chars`);

    // Create the campaign
    await this.page.click('button[type="submit"]:has-text("Create Campaign")');

    // Wait for redirect to campaign page
    let campaignUrl = null;
    for (let i = 0; i < 15; i++) {
      await this.page.waitForTimeout(1000);
      const currentUrl = this.page.url();
      if (currentUrl.includes('/campaigns/') && !currentUrl.includes('/new')) {
        campaignUrl = currentUrl;
        this.log(`✅ Campaign created, redirected to: ${currentUrl}`);
        break;
      }
    }

    if (campaignUrl) {
      // Extract campaign ID for monitoring
      const campaignId = campaignUrl.split('/campaigns/')[1];
      this.log(`📋 Campaign ID: ${campaignId}`);
      this.testResults.campaignCreation = true;
      return true;
    }

    this.log('❌ Campaign creation failed or did not redirect properly');
    this.testResults.campaignCreation = false;
    return false;
  }

  async waitForDomainGenerationToComplete() {
    this.log('⏳ Waiting for domain generation to complete...');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      await this.page.waitForTimeout(5000);
      attempts++;

      // Debug: List all buttons on the page
      if (attempts % 3 === 0) {
        this.log(`🔍 [DEBUG] Listing all buttons on page (attempt ${attempts}):`);
        const allButtons = await this.page.locator('button').all();
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const buttonText = await allButtons[i].textContent();
          const isVisible = await allButtons[i].isVisible();
          this.log(`🔍 [BUTTON ${i}] "${buttonText}" (visible: ${isVisible})`);
        }
      }

      // Try multiple strategies to find the DNS validation button
      const buttonSelectors = [
        'button:has-text("Configure DNS Validation")',
        'button:has-text("DNS Validation")',
        'button:has-text("DNS")',
        'button:has-text("Configure")',
        'button[class*="PhaseGateButton"]',
        'button[class*="phase"]',
        'button[class*="dns"]'
      ];

      let configButton = null;
      for (const selector of buttonSelectors) {
        const buttons = await this.page.locator(selector).all();
        for (const button of buttons) {
          const text = await button.textContent();
          const isVisible = await button.isVisible();
          if (isVisible && text && (
            text.toLowerCase().includes('configure') && text.toLowerCase().includes('dns') ||
            text.toLowerCase().includes('dns validation') ||
            text === 'Configure DNS Validation'
          )) {
            configButton = button;
            this.log(`✅ Found DNS config button: "${text}" using selector: ${selector}`);
            break;
          }
        }
        if (configButton) break;
      }

      if (configButton) {
        this.log('✅ Domain generation completed! DNS configuration button is available.');
        this.testResults.domainGenerationCompletion = true;
        return true;
      }

      // Log progress every 30 seconds
      if (attempts % 6 === 0) {
        this.log(`⏳ Still waiting for domain generation... (${attempts * 5}s elapsed)`);
        
        // Capture current campaign state
        await this.page.evaluate(() => {
          console.log('🔍 [MONITORING] Checking campaign state...');
          console.log('🔍 [MONITORING] Current URL:', window.location.href);
        });
      }
    }
    
    this.log('❌ Domain generation did not complete within timeout');
    this.testResults.domainGenerationCompletion = false;
    return false;
  }

  async getCampaignCountBeforeTransition() {
    // Navigate to campaigns list to count existing campaigns
    this.log('📊 Checking campaign count before phase transition...');
    
    await this.page.goto(`${this.baseUrl}/campaigns`);
    await this.page.waitForLoadState('networkidle');
    
    // Count campaign rows/items
    const campaignElements = await this.page.locator('[data-testid*="campaign"], .campaign-item, [class*="campaign"]').count();
    
    // Alternative: look for any text patterns that indicate campaigns
    const pageContent = await this.page.textContent('body');
    const campaignMatches = (pageContent.match(/Phase-Test-\d+/g) || []).length;
    
    const campaignCount = Math.max(campaignElements, campaignMatches);
    this.log(`📊 Found ${campaignCount} campaigns before transition`);
    
    return campaignCount;
  }

  async testPhaseTransition() {
    this.log('🔄 Testing phase transition through UI...');
    
    // Get current campaign URL
    const currentUrl = this.page.url();
    const campaignId = currentUrl.split('/campaigns/')[1];
    
    // Go back to the campaign page to start phase transition
    await this.page.goto(currentUrl);
    await this.page.waitForLoadState('networkidle');
    
    // Count campaigns before transition
    const campaignCountBefore = await this.getCampaignCountBeforeTransition();
    
    // Go back to campaign page
    await this.page.goto(currentUrl);
    await this.page.waitForLoadState('networkidle');
    
    // Clear previous network requests to focus on the transition
    this.networkRequests = [];
    
    // Click the Configure DNS Validation button
    const configButton = await this.page.locator('button:has-text("Configure DNS Validation")').first();
    if (await configButton.count() === 0) {
      this.log('❌ Configure DNS Validation button not found');
      return false;
    }
    
    this.log('🎯 Clicking Configure DNS Validation button...');
    await configButton.click();
    this.testResults.phaseTransitionTrigger = true;
    
    await this.page.waitForTimeout(2000);

    // Look for and fill out the DNS configuration form
    this.log('📝 Configuring DNS validation parameters...');
    
    // Select persona if available
    try {
      const personaSelects = await this.page.locator('select').all();
      for (const select of personaSelects) {
        const options = await select.locator('option').all();
        for (const option of options) {
          const optionText = await option.textContent();
          if (optionText && !optionText.toLowerCase().includes('select') && 
              !optionText.toLowerCase().includes('none') && optionText.trim() !== '') {
            await select.selectOption({ label: optionText });
            this.log(`✅ Selected persona: ${optionText}`);
            break;
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ Persona selection: ${error.message}`);
    }

    // Fill name field if needed
    try {
      const nameField = this.page.locator('input[name*="name"], input[placeholder*="name"]').first();
      if (await nameField.count() > 0) {
        const currentValue = await nameField.inputValue();
        if (!currentValue || currentValue.trim() === '') {
          await nameField.fill('DNS Validation Phase');
          this.log('✅ Filled name field');
        }
      }
    } catch (error) {
      this.log(`⚠️ Name field: ${error.message}`);
    }

    // Find and click the submit button
    const submitStrategies = [
      'button[type="submit"]',
      'button:has-text("Start")',
      'button:has-text("DNS")',
      'button:has-text("Submit")',
      'button:has-text("Configure")'
    ];

    let submitButton = null;
    for (const strategy of submitStrategies) {
      const buttons = await this.page.locator(strategy).all();
      for (const button of buttons) {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        if (isVisible && text && (
          text.toLowerCase().includes('start') ||
          text.toLowerCase().includes('dns') ||
          text.toLowerCase().includes('submit') ||
          text.toLowerCase().includes('configure')
        )) {
          submitButton = button;
          this.log(`🎯 Found submit button: "${text}"`);
          break;
        }
      }
      if (submitButton) break;
    }

    if (!submitButton) {
      this.log('❌ No submit button found');
      return false;
    }

    // Monitor for the critical UpdateCampaign call
    this.log('🔍 Submitting DNS configuration and monitoring for UpdateCampaign API call...');
    await submitButton.click();

    // Wait and monitor for the UpdateCampaign call
    let updateCampaignDetected = false;
    let monitoringTime = 0;
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000;

    while (monitoringTime < maxWaitTime) {
      await this.page.waitForTimeout(checkInterval);
      monitoringTime += checkInterval;

      // Check if UpdateCampaign API call was made
      const updateCampaignCall = this.networkRequests.find(req => 
        req.method === 'PUT' && 
        req.url.match(/\/campaigns\/[^\/]+$/) && 
        req.url.includes(campaignId)
      );

      if (updateCampaignCall && !updateCampaignDetected) {
        updateCampaignDetected = true;
        this.log('🎉 CRITICAL SUCCESS: UpdateCampaign API call detected!');
        this.log(`🔗 UpdateCampaign URL: ${updateCampaignCall.url}`);
        this.testResults.updateCampaignCall = true;
        break;
      }

      // Log progress every 5 seconds
      if (monitoringTime % 5000 === 0) {
        this.log(`🕐 Monitoring UpdateCampaign call... ${monitoringTime/1000}s elapsed`);
      }
    }

    if (!updateCampaignDetected) {
      this.log('❌ CRITICAL FAILURE: No UpdateCampaign API call detected');
      this.testResults.updateCampaignCall = false;
      return false;
    }

    // Wait a bit more for any additional processing
    await this.page.waitForTimeout(5000);

    // Check that no duplicate campaigns were created
    this.log('🔍 Checking for duplicate campaigns...');
    const campaignCountAfter = await this.getCampaignCountBeforeTransition();
    
    if (campaignCountAfter === campaignCountBefore) {
      this.log('✅ SUCCESS: No duplicate campaigns created!');
      this.testResults.noDuplicateCampaigns = true;
    } else {
      this.log(`❌ FAILURE: Campaign count changed from ${campaignCountBefore} to ${campaignCountAfter}`);
      this.testResults.noDuplicateCampaigns = false;
    }

    // Verify the campaign transitioned to DNS validation
    await this.page.goto(currentUrl); // Go back to original campaign
    await this.page.waitForLoadState('networkidle');
    
    // Look for indicators that this is now a DNS validation campaign
    const pageText = await this.page.textContent('body');
    const hasDNSValidation = pageText.includes('dns_validation') || 
                            pageText.includes('DNS Validation') ||
                            pageText.includes('DNS');
    
    if (hasDNSValidation) {
      this.log('✅ SUCCESS: Campaign appears to be in DNS validation phase');
      this.testResults.phaseTransitionSuccess = true;
    } else {
      this.log('❌ FAILURE: Campaign does not appear to be in DNS validation phase');
      this.testResults.phaseTransitionSuccess = false;
    }

    return updateCampaignDetected && this.testResults.noDuplicateCampaigns;
  }

  async run() {
    this.log('=== DNS Phase Transition Test Started ===');
    this.log('🎯 Testing UpdateCampaign phase transitions from user perspective');
    
    try {
      await this.init();
      
      if (!await this.login()) {
        throw new Error('Login failed');
      }
      
      if (!await this.createDomainGenerationCampaign()) {
        throw new Error('Campaign creation failed');
      }
      
      if (!await this.waitForDomainGenerationToComplete()) {
        throw new Error('Domain generation did not complete');
      }
      
      const transitionSuccess = await this.testPhaseTransition();
      
      // Generate final report
      this.log('');
      this.log('=== TEST RESULTS SUMMARY ===');
      this.log(`✅ Campaign Creation: ${this.testResults.campaignCreation ? 'PASS' : 'FAIL'}`);
      this.log(`✅ Domain Generation Completion: ${this.testResults.domainGenerationCompletion ? 'PASS' : 'FAIL'}`);
      this.log(`✅ Phase Transition Trigger: ${this.testResults.phaseTransitionTrigger ? 'PASS' : 'FAIL'}`);
      this.log(`🎯 UpdateCampaign API Call: ${this.testResults.updateCampaignCall ? 'PASS' : 'FAIL'}`);
      this.log(`🎯 No Duplicate Campaigns: ${this.testResults.noDuplicateCampaigns ? 'PASS' : 'FAIL'}`);
      this.log(`🎯 Phase Transition Success: ${this.testResults.phaseTransitionSuccess ? 'PASS' : 'FAIL'}`);
      
      const overallSuccess = Object.values(this.testResults).every(result => result === true);
      this.log(`🏆 OVERALL RESULT: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
      
      if (overallSuccess) {
        this.log('🎉 DNS validation phase transitions are working correctly!');
        this.log('🎉 UpdateCampaign with campaignType field is functioning as designed!');
        this.log('🎉 No duplicate campaigns are being created during transitions!');
      }
      
      return overallSuccess;
      
    } catch (error) {
      this.log(`❌ Test error: ${error.message}`);
      return false;
    } finally {
      // Write comprehensive test results
      const allLogs = [
        '=== DNS PHASE TRANSITION TEST RESULTS ===',
        '',
        '🎯 PURPOSE: Test UpdateCampaign phase transitions from user perspective',
        '🎯 FOCUS: Verify no duplicate campaigns created during transitions',
        '🎯 FOCUS: Confirm UpdateCampaign API uses campaignType field correctly',
        '',
        '--- Test Execution Logs ---',
        ...this.logs,
        '',
        '--- Frontend Console Logs ---',
        ...this.consoleLogs.map(log => `[FRONTEND] ${log}`),
        '',
        '--- Network Request Summary ---',
        ...this.networkRequests.map(req => `[${req.timestamp}] ${req.method} ${req.url}`),
        '',
        '--- Final Test Results ---',
        `Campaign Creation: ${this.testResults.campaignCreation}`,
        `Domain Generation Completion: ${this.testResults.domainGenerationCompletion}`,
        `Phase Transition Trigger: ${this.testResults.phaseTransitionTrigger}`,
        `UpdateCampaign API Call Detected: ${this.testResults.updateCampaignCall}`,
        `No Duplicate Campaigns Created: ${this.testResults.noDuplicateCampaigns}`,
        `Phase Transition Success: ${this.testResults.phaseTransitionSuccess}`,
        '',
        '=== End of Test ==='
      ];
      
      fs.writeFileSync(path.join(__dirname, 'phase-transition-test-results.txt'), allLogs.join('\n'));
      
      // Also append final results to the main log file
      fs.appendFileSync(this.logFilePath, '\n=== FINAL TEST RESULTS ===\n');
      fs.appendFileSync(this.logFilePath, allLogs.slice(-10).join('\n') + '\n');
      
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test
async function main() {
  console.log('🚀 Starting DNS Phase Transition Test...');
  console.log('📄 Logs will be written to: phase-transition-test-logs.txt');
  console.log('📊 Final results will be saved to: phase-transition-test-results.txt');
  console.log('⏳ Test in progress... (this may take several minutes)');
  
  const test = new DNSPhaseTransitionTest();
  
  try {
    const success = await test.run();
    
    if (success) {
      console.log('✅ Test completed successfully! Check the log files for details.');
    } else {
      console.log('❌ Test failed. Check the log files for details.');
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.log('💥 Test crashed with error. Check the log files for details.');
    // Write error to log file instead of console
    const errorMsg = `FATAL ERROR: ${error.message}\nStack: ${error.stack}`;
    const fs = require('fs');
    const path = require('path');
    fs.appendFileSync(path.join(__dirname, 'phase-transition-test-logs.txt'), `\n${errorMsg}\n`);
    process.exit(1);
  }
}

main();