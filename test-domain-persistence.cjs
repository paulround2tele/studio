const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DomainPersistenceTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.logs = [];
    this.consoleLogs = [];
    this.networkRequests = [];
    this.websocketMessages = [];
    this.domainCounts = {
      beforeDNS: 0,
      duringDNS: 0,
      afterDNS: 0
    };
    this.logFilePath = path.join(__dirname, 'domain-persistence-test-logs.txt');
    this.testResults = {
      campaignCreation: false,
      domainGenerationCompletion: false,
      domainTablePopulated: false,
      phaseTransitionTrigger: false,
      domainsPersistDuringDNS: false,
      realTimeDNSUpdates: false,
      websocketStreaming: false,
      overallSuccess: false
    };
    
    // Initialize log file
    fs.writeFileSync(this.logFilePath, `=== Domain Table Persistence Test Started at ${new Date().toISOString()} ===\n`);
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
      
      // Track campaign-related and domain-related API calls
      if (url.includes('/campaigns') || url.includes('/domains') || url.includes('/validate-dns')) {
        const requestInfo = {
          url,
          method,
          timestamp: new Date().toISOString(),
          headers: request.headers()
        };
        
        this.networkRequests.push(requestInfo);
        this.log(`📤 [NETWORK] ${method} ${url}`);
        
        // Track specific API calls for domain loading
        if (url.includes('/generated-domains')) {
          this.log(`🔍 [DOMAIN_API] Generated domains API call: ${url}`);
        }
        if (url.includes('/dns-campaign-items')) {
          this.log(`🔍 [DNS_API] DNS campaign items API call: ${url}`);
        }
      }
    });

    this.page.on('response', async (response) => {
      const url = response.url();
      const method = response.request().method();
      const status = response.status();
      
      if (url.includes('/campaigns') || url.includes('/domains')) {
        this.log(`📥 [NETWORK] ${method} ${url} → ${status}`);
        
        // Capture domain count from API responses
        try {
          if (response.status() === 200 && url.includes('/generated-domains')) {
            const responseData = await response.json();
            const domainCount = responseData.data?.length || 0;
            this.log(`📊 [DOMAIN_COUNT] Generated domains API returned ${domainCount} domains`);
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
      
      // Enhanced console capturing for domain persistence and WebSocket messages
      const isRelevantLog = text.includes('domain') ||
                           text.includes('DNS') ||
                           text.includes('WebSocket') ||
                           text.includes('streaming') ||
                           text.includes('persistence') ||
                           text.includes('phase') ||
                           text.includes('transition') ||
                           text.includes('CAMPAIGN') ||
                           text.includes('DOMAIN_GENERATED') ||
                           text.includes('VALIDATION_PROGRESS') ||
                           type === 'error' ||
                           type === 'warn';
      
      if (isRelevantLog) {
        this.consoleLogs.push(`[${type.toUpperCase()}] ${text}`);
        this.log(`🔍 [FRONTEND ${type.toUpperCase()}] ${text}`);
        
        // Track WebSocket messages specifically
        if (text.includes('WebSocket') || text.includes('domain.generated') || text.includes('dns.validation')) {
          this.websocketMessages.push({
            timestamp: new Date().toISOString(),
            message: text,
            type: type
          });
          this.log(`⚡ [WEBSOCKET] ${text}`);
        }
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
    
    await this.page.goto(`${this.baseUrl}/login`);
    this.log('✅ Navigated to login page');
    
    await this.page.waitForTimeout(2000);
    await this.page.waitForSelector('input[id="email"]', { timeout: 8000 });
    this.log('✅ Login form found');

    await this.page.fill('input[id="email"]', 'test@example.com');
    await this.page.fill('input[id="password"]', 'password123');
    
    await this.page.click('button[type="submit"]:has-text("Sign in Securely")');
    this.log('🔑 Login button clicked');
    
    await this.page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 8000 });
    this.log('✅ Login successful');
    return true;
  }

  async createDomainGenerationCampaign() {
    this.log('🎯 Creating domain generation campaign...');
    
    try {
      await this.page.goto(`${this.baseUrl}/campaigns/new`);
      this.log('✅ Navigated to campaign creation page');
    } catch (error) {
      this.log(`❌ Navigation failed: ${error.message}`);
      return false;
    }
    
    // Wait for campaign form elements to appear
    await this.page.waitForTimeout(3000); // Give page time to load
    try {
      await this.page.waitForSelector('input[name="campaignName"]', { timeout: 8000 });
      this.log('✅ Campaign name input found');
    } catch (error) {
      this.log('⚠️ Campaign name input not found, trying alternative selectors...');
      await this.page.waitForSelector('text=Campaign Configuration', { timeout: 5000 });
      this.log('✅ Campaign form loaded');
    }

    // Select domain_generation campaign type
    await this.page.click('[role="combobox"]');
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.click('[role="option"]:has-text("domain_generation")');

    await this.page.waitForSelector('text=Generation Pattern', { timeout: 5000 });

    // Create unique campaign name for this test
    const campaignName = `DomainPersistence-Test-${Date.now()}`;
    await this.page.fill('input[placeholder="e.g., Q3 Tech Outreach"]', campaignName);

    // Configure domain generation parameters for quick testing
    await this.page.click('text=Generation Pattern');
    await this.page.waitForTimeout(500);
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });

    const option = await this.page.locator('[role="option"]').filter({ hasText: 'Prefix + Variable Characters' }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ force: true });

    // Use unique pattern to ensure fresh domains for testing
    const timestamp = Date.now();
    const uniqueConstant = `persist${timestamp.toString().slice(-6)}`;
    const uniqueCharset = 'abc123';
    const variableLength = 2; // Small for quick generation
    const uniqueTld = '.test';
    
    await this.page.fill('input[name="constantPart"], input[placeholder*="constant"]', uniqueConstant);
    await this.page.fill('input[name="allowedCharSet"], input[placeholder*="character"]', uniqueCharset);
    await this.page.fill('input[name="prefixVariableLength"], input[type="number"]', variableLength.toString());
    await this.page.fill('input[name="tldsInput"], input[placeholder*=".com"]', uniqueTld);
    await this.page.fill('input[name="maxDomainsToGenerate"], input[placeholder="1000"]', '8'); // Small number for quick test

    this.log(`📝 Campaign configured: ${campaignName}, 8 domains, pattern: ${uniqueConstant}[${uniqueCharset}]${uniqueTld}`);

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
      const campaignId = campaignUrl.split('/campaigns/')[1].split('?')[0];
      this.log(`📋 Campaign ID: ${campaignId}`);
      this.testResults.campaignCreation = true;
      return campaignId;
    }

    this.log('❌ Campaign creation failed or did not redirect properly');
    this.testResults.campaignCreation = false;
    return false;
  }

  async waitForDomainGenerationAndCountDomains() {
    this.log('⏳ Waiting for domain generation to complete and counting domains...');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    const checkInterval = 5000; // 5 seconds

    while (attempts < maxAttempts) {
      await this.page.waitForTimeout(checkInterval);
      attempts++;

      // Try multiple strategies to find the DNS validation button (from working test)
      const buttonSelectors = [
        'button:has-text("Configure DNS Validation")',
        'button:has-text("Start DNS Validation")',
        'button:has-text("DNS Validation")',
        'button:has-text("Next Phase")',
        'button:has-text("DNS")',
        'button:has-text("Configure")',
        'button[class*="PhaseGateButton"]',
        'button[class*="phase"]',
        'button[class*="dns"]',
        'button[class*="transition"]',
        'button[aria-label*="DNS"]',
        'button[data-testid*="dns"]'
      ];

      let configButton = null;
      for (const selector of buttonSelectors) {
        try {
          const buttons = await this.page.locator(selector).all();
          for (const button of buttons) {
            const text = await button.textContent();
            const isVisible = await button.isVisible();
            const isEnabled = await button.isEnabled();
            
            if (isVisible && isEnabled && text && (
              (text.toLowerCase().includes('configure') && text.toLowerCase().includes('dns')) ||
              (text.toLowerCase().includes('start') && text.toLowerCase().includes('dns')) ||
              text.toLowerCase().includes('dns validation') ||
              text === 'Configure DNS Validation' ||
              text === 'Start DNS Validation' ||
              (text.toLowerCase().includes('next') && text.toLowerCase().includes('phase'))
            )) {
              configButton = button;
              this.log(`✅ Found DNS config button: "${text}" using selector: ${selector}`);
              break;
            }
          }
          if (configButton) break;
        } catch (error) {
          // Selector might not exist, continue to next one
        }
      }

      if (configButton) {
        this.log('✅ Domain generation completed! DNS configuration button is available.');
        
        // Count domains in the table
        const domainCount = await this.countDomainsInTable();
        this.domainCounts.beforeDNS = domainCount;
        this.log(`📊 [CRITICAL] Domain count BEFORE DNS validation: ${domainCount}`);
        
        if (domainCount > 0) {
          this.testResults.domainGenerationCompletion = true;
          this.testResults.domainTablePopulated = true;
          
          // Additional verification - ensure the button is clickable
          try {
            await configButton.hover();
            this.log('✅ DNS button is hoverable and ready for interaction.');
            return true;
          } catch (error) {
            this.log(`⚠️ DNS button found but not interactive: ${error.message}`);
            // Continue waiting
          }
        } else {
          this.log('❌ Domain generation completed but no domains visible in table');
          return false;
        }
      }

      if (attempts % 6 === 0) {
        this.log(`⏳ Still waiting for domain generation... (${(attempts * checkInterval) / 1000}s elapsed)`);
        
        // Periodic domain count during generation
        const currentDomainCount = await this.countDomainsInTable();
        if (currentDomainCount > 0) {
          this.log(`📊 [PROGRESS] Current domain count: ${currentDomainCount}`);
        }
      }
    }
    
    this.log('❌ Domain generation did not complete within timeout');
    this.testResults.domainGenerationCompletion = false;
    this.testResults.domainTablePopulated = false;
    return false;
  }

  async countDomainsInTable() {
    try {
      // Multiple strategies to count domains in the table
      const strategies = [
        'tbody tr',
        '[data-testid*="domain"]',
        '.domain-row',
        'tr:has(td)',
        'table tr:not(:first-child)' // Exclude header row
      ];

      let maxCount = 0;
      for (const selector of strategies) {
        try {
          const elements = await this.page.locator(selector);
          const count = await elements.count();
          if (count > maxCount) {
            maxCount = count;
          }
        } catch (e) {
          // Selector might not exist, continue
        }
      }

      // Also check page content for domain patterns
      const pageContent = await this.page.textContent('body');
      const domainMatches = (pageContent.match(/persist\d+[a-c0-9]{2}\.test/g) || []).length;
      
      const finalCount = Math.max(maxCount, domainMatches);
      this.log(`🔍 [DOMAIN_COUNT_DEBUG] Table rows: ${maxCount}, Pattern matches: ${domainMatches}, Final count: ${finalCount}`);
      
      return finalCount;
    } catch (error) {
      this.log(`⚠️ Error counting domains: ${error.message}`);
      return 0;
    }
  }

  async transitionToDNSValidation() {
    this.log('🔄 Transitioning to DNS validation phase...');
    
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

    // Configure DNS validation parameters
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
        await nameField.fill('DNS Persistence Test');
        this.log('✅ Filled name field');
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

    // Submit DNS configuration
    this.log('🔍 Submitting DNS configuration...');
    await submitButton.click();

    // CRITICAL TEST: Count domains immediately after transition
    await this.page.waitForTimeout(3000);
    const domainCountDuringTransition = await this.countDomainsInTable();
    this.domainCounts.duringDNS = domainCountDuringTransition;
    this.log(`📊 [CRITICAL] Domain count DURING DNS validation: ${domainCountDuringTransition}`);
    
    // Check if domains persisted (this was the main bug)
    if (domainCountDuringTransition >= this.domainCounts.beforeDNS) {
      this.log('✅ [SUCCESS] Domains persisted through DNS validation transition!');
      this.testResults.domainsPersistDuringDNS = true;
    } else {
      this.log(`❌ [FAILURE] Domains disappeared during DNS validation! Before: ${this.domainCounts.beforeDNS}, During: ${domainCountDuringTransition}`);
      this.testResults.domainsPersistDuringDNS = false;
    }

    return true;
  }

  async monitorRealTimeDNSUpdates() {
    this.log('⚡ Monitoring real-time DNS validation updates...');
    
    let monitoringTime = 0;
    const maxMonitorTime = 60000; // 1 minute
    const checkInterval = 5000; // 5 seconds
    let detectedRealTimeUpdates = false;
    let initialDNSValidationMessageCount = this.websocketMessages.filter(m => 
      m.message.includes('dns.validation') || m.message.includes('DNS')
    ).length;

    while (monitoringTime < maxMonitorTime) {
      await this.page.waitForTimeout(checkInterval);
      monitoringTime += checkInterval;

      // Check for new WebSocket messages related to DNS validation
      const currentDNSMessages = this.websocketMessages.filter(m => 
        m.message.includes('dns.validation') || m.message.includes('DNS')
      ).length;

      if (currentDNSMessages > initialDNSValidationMessageCount) {
        this.log(`⚡ [SUCCESS] Real-time DNS validation updates detected! Message count: ${currentDNSMessages}`);
        detectedRealTimeUpdates = true;
        this.testResults.realTimeDNSUpdates = true;
        break;
      }

      // Check for domain status updates in the table
      const currentDomainCount = await this.countDomainsInTable();
      this.domainCounts.afterDNS = currentDomainCount;
      
      if (monitoringTime % 15000 === 0) { // Log every 15 seconds
        this.log(`⏳ Monitoring DNS updates... ${monitoringTime/1000}s elapsed, current domains: ${currentDomainCount}`);
      }
    }

    if (!detectedRealTimeUpdates) {
      this.log('⚠️ No real-time DNS validation updates detected within timeout');
      this.testResults.realTimeDNSUpdates = false;
    }

    // Final domain count after monitoring period
    const finalDomainCount = await this.countDomainsInTable();
    this.domainCounts.afterDNS = finalDomainCount;
    this.log(`📊 [FINAL] Domain count AFTER DNS validation monitoring: ${finalDomainCount}`);

    return detectedRealTimeUpdates;
  }

  async verifyWebSocketStreaming() {
    this.log('🔌 Verifying WebSocket streaming functionality...');
    
    const relevantWebSocketMessages = this.websocketMessages.filter(m => 
      m.message.includes('domain') || 
      m.message.includes('DNS') || 
      m.message.includes('validation') ||
      m.message.includes('WebSocket')
    );

    this.log(`📊 Total relevant WebSocket messages captured: ${relevantWebSocketMessages.length}`);
    
    if (relevantWebSocketMessages.length > 0) {
      this.log('✅ WebSocket streaming is working!');
      this.testResults.websocketStreaming = true;
      
      // Log some example messages
      relevantWebSocketMessages.slice(0, 3).forEach((msg, index) => {
        this.log(`📧 [WEBSOCKET_SAMPLE_${index + 1}] ${msg.message}`);
      });
    } else {
      this.log('❌ No WebSocket streaming detected');
      this.testResults.websocketStreaming = false;
    }

    return this.testResults.websocketStreaming;
  }

  async run() {
    this.log('=== Domain Table Persistence Test Started ===');
    this.log('🎯 Testing domain table persistence during DNS validation phase transitions');
    this.log('🎯 CRITICAL: Verifying domains do NOT disappear during DNS validation');
    
    try {
      await this.init();
      
      if (!await this.login()) {
        throw new Error('Login failed');
      }
      
      const campaignId = await this.createDomainGenerationCampaign();
      if (!campaignId) {
        throw new Error('Campaign creation failed');
      }
      
      if (!await this.waitForDomainGenerationAndCountDomains()) {
        throw new Error('Domain generation did not complete or no domains generated');
      }
      
      if (!await this.transitionToDNSValidation()) {
        throw new Error('DNS validation transition failed');
      }
      
      await this.monitorRealTimeDNSUpdates();
      await this.verifyWebSocketStreaming();
      
      // Calculate overall success
      const criticalTestsPassed = this.testResults.domainTablePopulated && 
                                 this.testResults.domainsPersistDuringDNS;
      
      this.testResults.overallSuccess = Object.values(this.testResults).every(result => 
        typeof result === 'boolean' ? result : true
      ) && criticalTestsPassed;
      
      // Generate final report
      this.log('');
      this.log('=== DOMAIN PERSISTENCE TEST RESULTS ===');
      this.log(`✅ Campaign Creation: ${this.testResults.campaignCreation ? 'PASS' : 'FAIL'}`);
      this.log(`✅ Domain Generation Completion: ${this.testResults.domainGenerationCompletion ? 'PASS' : 'FAIL'}`);
      this.log(`📊 Domain Table Populated: ${this.testResults.domainTablePopulated ? 'PASS' : 'FAIL'}`);
      this.log(`🔄 Phase Transition Trigger: ${this.testResults.phaseTransitionTrigger ? 'PASS' : 'FAIL'}`);
      this.log(`🔥 CRITICAL - Domains Persist During DNS: ${this.testResults.domainsPersistDuringDNS ? 'PASS' : 'FAIL'}`);
      this.log(`⚡ Real-time DNS Updates: ${this.testResults.realTimeDNSUpdates ? 'PASS' : 'FAIL'}`);
      this.log(`🔌 WebSocket Streaming: ${this.testResults.websocketStreaming ? 'PASS' : 'FAIL'}`);
      
      this.log('');
      this.log('=== DOMAIN COUNT SUMMARY ===');
      this.log(`📊 Before DNS validation: ${this.domainCounts.beforeDNS} domains`);
      this.log(`📊 During DNS validation: ${this.domainCounts.duringDNS} domains`);
      this.log(`📊 After DNS validation: ${this.domainCounts.afterDNS} domains`);
      
      const overallSuccess = this.testResults.overallSuccess;
      this.log(`🏆 OVERALL RESULT: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
      
      if (overallSuccess) {
        this.log('🎉 Domain table persistence is working correctly!');
        this.log('🎉 The critical bug where domains disappeared during DNS validation has been FIXED!');
        this.log('🎉 Real-time WebSocket streaming is functioning properly!');
      } else {
        this.log('❌ Domain persistence test failed - critical issues remain');
        if (!this.testResults.domainsPersistDuringDNS) {
          this.log('❌ CRITICAL: Domains still disappear during DNS validation transition');
        }
      }
      
      return overallSuccess;
      
    } catch (error) {
      this.log(`❌ Test error: ${error.message}`);
      return false;
    } finally {
      // Write comprehensive test results
      const allLogs = [
        '=== DOMAIN TABLE PERSISTENCE TEST RESULTS ===',
        '',
        '🎯 PURPOSE: Test domain table persistence during DNS validation transitions',
        '🎯 CRITICAL: Verify domains do NOT disappear during DNS validation',
        '🎯 FOCUS: Confirm phase-aware domain loading and WebSocket streaming work correctly',
        '',
        '--- Test Execution Logs ---',
        ...this.logs,
        '',
        '--- Frontend Console Logs ---',
        ...this.consoleLogs.map(log => `[FRONTEND] ${log}`),
        '',
        '--- WebSocket Messages Summary ---',
        ...this.websocketMessages.map(msg => `[${msg.timestamp}] ${msg.message}`),
        '',
        '--- Network Request Summary ---',
        ...this.networkRequests.map(req => `[${req.timestamp}] ${req.method} ${req.url}`),
        '',
        '--- Final Test Results ---',
        `Campaign Creation: ${this.testResults.campaignCreation}`,
        `Domain Generation Completion: ${this.testResults.domainGenerationCompletion}`,
        `Domain Table Populated: ${this.testResults.domainTablePopulated}`,
        `Phase Transition Trigger: ${this.testResults.phaseTransitionTrigger}`,
        `CRITICAL - Domains Persist During DNS: ${this.testResults.domainsPersistDuringDNS}`,
        `Real-time DNS Updates: ${this.testResults.realTimeDNSUpdates}`,
        `WebSocket Streaming: ${this.testResults.websocketStreaming}`,
        `Overall Success: ${this.testResults.overallSuccess}`,
        '',
        '--- Domain Count Analysis ---',
        `Before DNS validation: ${this.domainCounts.beforeDNS} domains`,
        `During DNS validation: ${this.domainCounts.duringDNS} domains`,
        `After DNS validation: ${this.domainCounts.afterDNS} domains`,
        `Domain Persistence Status: ${this.domainCounts.duringDNS >= this.domainCounts.beforeDNS ? 'SUCCESS' : 'FAILURE'}`,
        '',
        '=== End of Test ==='
      ];
      
      fs.writeFileSync(path.join(__dirname, 'domain-persistence-test-results.txt'), allLogs.join('\n'));
      
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test
async function main() {
  
  const test = new DomainPersistenceTest();
  
  try {
    const success = await test.run();
    
    if (success) {
      console.log('✅ Domain persistence test completed successfully!');
      console.log('🎉 CRITICAL BUG FIX VERIFIED: Domains persist through DNS validation!');
    } else {
      console.log('❌ Domain persistence test failed - issues remain.');
    }
    
    console.log('📄 Check domain-persistence-test-results.txt for detailed results');
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.log('💥 Test crashed with error. Check the log files for details.');
    const errorMsg = `FATAL ERROR: ${error.message}\nStack: ${error.stack}`;
    fs.appendFileSync(path.join(__dirname, 'domain-persistence-test-logs.txt'), `\n${errorMsg}\n`);
    process.exit(1);
  }
}

main();