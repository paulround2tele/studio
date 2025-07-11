const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DNSValidationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.logs = [];
    this.consoleLogs = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
  }

  setupConsoleCapture() {
    this.page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      // Only capture DNS/WebSocket/validation related logs
      if (text.includes('DNS') || text.includes('WebSocket') || text.includes('validation') ||
          text.includes('campaign_progress') || text.includes('validate-dns') ||
          text.includes('WEBSOCKET') || type === 'error') {
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
    this.page.setViewportSize({ width: 1280, height: 720 });
    this.setupConsoleCapture();
  }

  async login() {
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForSelector('input[id="email"]', { timeout: 5000 });

    await this.page.fill('input[id="email"]', 'test@example.com');
    await this.page.fill('input[id="password"]', 'password123');
    await this.page.click('button[type="submit"]:has-text("Sign in Securely")');
    
    // Wait for redirect away from login page
    await this.page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    this.log('✅ Login successful - redirected away from login page');
    return true;
  }

  async createCampaign() {
    this.log('Creating new campaign...');
    await this.page.goto(`${this.baseUrl}/campaigns/new`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('text=Campaign Configuration', { timeout: 10000 });

    await this.page.click('[role="combobox"]');
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.click('[role="option"]:has-text("domain_generation")');

    await this.page.waitForSelector('text=Generation Pattern', { timeout: 5000 });

    const campaignName = `DNS-Test-${Date.now()}`;
    await this.page.fill('input[placeholder="e.g., Q3 Tech Outreach"]', campaignName);

    await this.page.click('text=Generation Pattern');
    await this.page.waitForTimeout(500);
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });

    const option = await this.page.locator('[role="option"]').filter({ hasText: 'Prefix + Variable Characters' }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ force: true });

    await this.page.fill('input[name="constantPart"], input[placeholder*="constant"]', 'test');
    await this.page.fill('input[name="allowedCharSet"], input[placeholder*="character"]', 'abcdefghijklmnopqrstuvwxyz0123456789');
    await this.page.fill('input[name="prefixVariableLength"], input[type="number"]', '3');
    await this.page.fill('input[name="tldsInput"], input[placeholder*=".com"]', '.com');
    await this.page.fill('input[name="maxDomainsToGenerate"], input[placeholder="1000"]', '10');

    await this.page.click('button[type="submit"]:has-text("Create Campaign")');

    // Wait for redirect to campaign page
    for (let i = 0; i < 15; i++) {
      await this.page.waitForTimeout(1000);
      const currentUrl = this.page.url();
      if (currentUrl.includes('/campaigns/') && !currentUrl.includes('/new')) {
        this.log(`Campaign created, redirected to: ${currentUrl}`);
        return true;
      }
    }
    return false;
  }

  async waitForDomainGeneration() {
    this.log('Waiting for domain generation to complete...');
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await this.page.waitForTimeout(5000);
      attempts++;

      const configButton = await this.page.locator('button').filter({ hasText: /Configure.*DNS.*Validation/i }).first();
      if (await configButton.count() > 0) {
        this.log('Domain generation completed! DNS config button found.');
        return true;
      }
    }
    
    this.log('Domain generation did not complete within timeout');
    return false;
  }

  async testDNSValidation() {
    this.log('Starting DNS validation test...');
    
    // Test frontend console capture
    this.log('Testing frontend console capture...');
    await this.page.evaluate(() => {
      console.log('🔥 FRONTEND TEST: Console capture working!');
      console.log('📋 FRONTEND TEST: Current URL:', window.location.href);
      console.log('🔌 FRONTEND TEST: WebSocket available:', typeof window.WebSocket);
    });
    await this.page.waitForTimeout(1000);

    // Click Configure DNS Validation
    const configButton = await this.page.locator('button').filter({ hasText: /Configure.*DNS.*Validation/i }).first();
    if (await configButton.count() === 0) {
      this.log('❌ Configure DNS Validation button not found');
      return false;
    }
    
    await configButton.click();
    this.log('✅ Clicked Configure DNS Validation button');
    await this.page.waitForTimeout(2000);

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
      this.log(`⚠️ Persona selection error: ${error.message}`);
    }

    // Fill name field if needed
    try {
      const nameField = this.page.locator('input[name*="name"], input[placeholder*="name"]').first();
      if (await nameField.count() > 0) {
        const currentValue = await nameField.inputValue();
        if (!currentValue || currentValue.trim() === '') {
          await nameField.fill('DNS Test');
          this.log('✅ Filled name field');
        }
      }
    } catch (error) {
      this.log(`⚠️ Name field error: ${error.message}`);
    }

    // Find and click submit button
    const buttonStrategies = [
      'button[type="submit"]',
      'button:has-text("Start")',
      'button:has-text("DNS")',
      'button:has-text("Submit")'
    ];

    let submitButton = null;
    for (const strategy of buttonStrategies) {
      const buttons = await this.page.locator(strategy).all();
      for (const button of buttons) {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        if (isVisible && text && (
          text.toLowerCase().includes('start') ||
          text.toLowerCase().includes('dns') ||
          text.toLowerCase().includes('submit')
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

    // Monitor network requests for DNS validation
    const networkRequests = [];
    this.page.on('request', (request) => {
      if (request.url().includes('/validate-dns')) {
        networkRequests.push({
          url: request.url(),
          method: request.method()
        });
        this.log(`📤 DNS Validation API call: ${request.method()} ${request.url()}`);
      }
    });

    // Click submit and monitor for success
    await submitButton.click();
    this.log('✅ Clicked DNS validation submit button');

    // Extended monitoring period to capture WebSocket messages and backend processing
    this.log('🔍 Monitoring for DNS validation API call and WebSocket messages...');
    
    let apiCallDetected = false;
    let monitoringTime = 0;
    const maxWaitTime = 45000; // 45 seconds
    const checkInterval = 2000; // Check every 2 seconds

    while (monitoringTime < maxWaitTime) {
      await this.page.waitForTimeout(checkInterval);
      monitoringTime += checkInterval;

      // Check for API call
      const dnsValidationSuccess = networkRequests.some(req =>
        req.url.includes('/validate-dns') && req.method === 'POST'
      );

      if (dnsValidationSuccess && !apiCallDetected) {
        apiCallDetected = true;
        this.log('✅ DNS validation API call detected!');
      }

      // Log current state every 10 seconds
      if (monitoringTime % 10000 === 0) {
        this.log(`🕐 Monitoring progress: ${monitoringTime/1000}s elapsed...`);
        
        // Capture current frontend state
        await this.page.evaluate(() => {
          console.log(`🔍 [FRONTEND LOG] 🕐 [MONITORING] Time: ${new Date().toISOString()}`);
          console.log(`🔍 [FRONTEND LOG] 📍 [MONITORING] Current URL: ${window.location.href}`);
          
          // Try to get campaign state if available
          if (window.sessionStorage) {
            const storeKeys = Object.keys(sessionStorage);
            storeKeys.forEach(key => {
              if (key.includes('campaign') || key.includes('zustand')) {
                const value = sessionStorage.getItem(key);
                try {
                  const parsed = JSON.parse(value);
                  if (parsed.state && parsed.state.campaign) {
                    console.log(`🔍 [FRONTEND LOG] 📊 [CAMPAIGN STATE] ${key}:`, {
                      status: parsed.state.campaign.status,
                      currentPhase: parsed.state.campaign.currentPhase,
                      campaignType: parsed.state.campaign.campaignType
                    });
                  }
                } catch (e) {
                  // Not JSON or no campaign data
                }
              }
            });
          }
        });
      }
    }

    this.log(`🏁 Monitoring completed after ${monitoringTime/1000} seconds`);
    
    if (apiCallDetected) {
      this.log('✅ DNS validation request detected - SUCCESS!');
      return true;
    } else {
      this.log('❌ No DNS validation API call detected during monitoring period');
      return false;
    }
  }

  async run() {
    this.log('=== DNS Validation Test Started ===');
    
    try {
      await this.init();
      
      if (!await this.login()) {
        throw new Error('Login failed');
      }
      
      if (!await this.createCampaign()) {
        throw new Error('Campaign creation failed');
      }
      
      if (!await this.waitForDomainGeneration()) {
        throw new Error('Domain generation timeout');
      }
      
      const result = await this.testDNSValidation();
      
      this.log(`=== Test ${result ? 'PASSED' : 'FAILED'} ===`);
      return result;
      
    } catch (error) {
      this.log(`❌ Test error: ${error.message}`);
      return false;
    } finally {
      // Write logs to file
      const allLogs = [
        '=== DNS VALIDATION TEST RESULTS ===',
        '',
        '--- Test Execution Logs ---',
        ...this.logs,
        '',
        '--- Frontend Console Logs ---',
        ...this.consoleLogs.map(log => `[FRONTEND] ${log}`),
        '',
        '=== End of Test ==='
      ];
      
      fs.writeFileSync(path.join(__dirname, 'test-output.txt'), allLogs.join('\n'));
      
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test
async function main() {
  const test = new DNSValidationTest();
  const success = await test.run();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);