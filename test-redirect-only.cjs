const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Focused test for campaign redirect issue
 * Goes directly to campaign creation form to test redirect logic
 */

class RedirectTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.logFile = path.join(__dirname, 'test-logs.txt');
    
    // Clear log file at start
    fs.writeFileSync(this.logFile, `=== DNS Validation Test Log - ${new Date().toISOString()} ===\n\n`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logLine);
    console.log(message); // Still show basic progress on console
  }

  async init() {
    this.browser = await chromium.launch({
      headless: false,
      devtools: false,
      slowMo: 100
    });

    this.page = await this.browser.newPage();
    
    // Monitor page errors
    this.page.on('pageerror', (error) => {
      // Only log errors after DNS validation button appears
    });

    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async testRedirectDirect() {
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

    // Fill out the form quickly (no logging)
    
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
    
    // Submit the form and monitor redirect
    await this.page.click('button[type="submit"]:has-text("Create Campaign")');
    
    // Monitor URL changes for redirect
    let redirectDetected = false;
    
    for (let i = 0; i < 15; i++) {
      await this.page.waitForTimeout(1000);
      const currentUrl = this.page.url();
      
      // Check if redirected to campaign details
      if (currentUrl.includes('/campaigns/') && !currentUrl.includes('/new')) {
        redirectDetected = true;
        
        // Continue to DNS validation testing after successful redirect
        try {
          const dnsResult = await this.testDNSValidationExtension();
          return dnsResult;
        } catch (error) {
          return false;
        }
      }
    }
    
    return redirectDetected;
  }

  async testDNSValidationExtension() {
    try {
      // Step 1: Wait for domain generation to complete (campaign status = "completed")
      let domainGenerationComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      while (!domainGenerationComplete && attempts < maxAttempts) {
        await this.page.waitForTimeout(5000); // Wait 5 seconds between checks
        attempts++;
        
        // Check for completion indicators
        const completionIndicators = await this.page.evaluate(() => {
          // Look for "Configure DNS Validation" button
          const configButton = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent && btn.textContent.toLowerCase().includes('configure') &&
            btn.textContent.toLowerCase().includes('dns')
          );
          // Look for "Campaign Completed" text
          const completedText = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.toLowerCase().includes('completed')
          );
          // Look for 100% progress
          const progressText = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.includes('100%')
          );
          
          return {
            hasConfigButton: !!configButton,
            hasCompletedText: !!completedText,
            hasProgressComplete: !!progressText,
            configButtonVisible: configButton ? configButton.offsetParent !== null : false
          };
        });
        
        if (completionIndicators.hasConfigButton && completionIndicators.configButtonVisible) {
          domainGenerationComplete = true;
          
          // NOW START COMPREHENSIVE LOGGING - Configure DNS Validation button appeared!
          this.log('\n🧬 [DNS_VALIDATION_EXTENSION] Configure DNS Validation button appeared - starting comprehensive logging...');
          this.log('✅ [DNS_VALIDATION_EXTENSION] Domain generation completed! Configure DNS Validation button found.');
          
          // Enable comprehensive logging for DNS validation
          this.setupDNSValidationLogging();
          break;
        }
      }
      
      if (!domainGenerationComplete) {
        return false;
      }
      
      // Step 2: Click "Configure DNS Validation" button
      this.log('🎯 [DNS_VALIDATION_EXTENSION] Looking for Configure DNS Validation button...');
      
      // Wait a bit more for UI to stabilize
      await this.page.waitForTimeout(2000);
      
      const configButton = await this.page.locator('button').filter({ hasText: /Configure.*DNS.*Validation/i }).first();
      if (await configButton.count() === 0) {
        // Try alternative selectors
        const altButton = await this.page.locator('[data-testid*="dns"], [aria-label*="DNS"], button[title*="DNS"]').first();
        if (await altButton.count() > 0) {
          await altButton.click();
          this.log('✅ [DNS_VALIDATION_EXTENSION] Clicked DNS configuration button (alternative selector)');
        } else {
          this.log('❌ [DNS_VALIDATION_EXTENSION] Configure DNS Validation button not found');
          return false;
        }
      } else {
        await configButton.click();
        this.log('✅ [DNS_VALIDATION_EXTENSION] Clicked Configure DNS Validation button');
      }
      
      // Step 3: Wait for side panel to open
      this.log('⏳ [DNS_VALIDATION_EXTENSION] Waiting for DNS configuration panel to open...');
      await this.page.waitForTimeout(2000);
      
      // Look for panel/dialog with DNS configuration
      const panelVisible = await this.page.evaluate(() => {
        // Look for panel indicators
        const panel = document.querySelector('[role="dialog"], [class*="panel"], [class*="sidebar"], [class*="drawer"]');
        const dnsText = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div')).find(el =>
          el.textContent && el.textContent.toLowerCase().includes('dns')
        );
        const personaSelect = document.querySelector('select[name*="persona"], select[name*="dns"], [data-testid*="persona"]');
        
        return {
          hasPanel: !!panel,
          hasDnsText: !!dnsText,
          hasPersonaSelect: !!personaSelect,
          panelVisible: panel ? panel.offsetParent !== null : false
        };
      });
      
      this.log('🔍 [DNS_VALIDATION_EXTENSION] Panel visibility check:', panelVisible);
      
      if (!panelVisible.hasPanel && !panelVisible.hasDnsText) {
        this.log('❌ [DNS_VALIDATION_EXTENSION] DNS configuration panel did not open');
        return false;
      }
      
      // Step 4: Select DNS persona with improved logic
      this.log('👤 [DNS_VALIDATION_EXTENSION] Step 4: Selecting DNS persona...');
      await this.page.waitForTimeout(1000);
      
      // Log all available form elements for debugging
      const formElements = await this.page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select')).map(s => ({
          name: s.name,
          id: s.id,
          options: Array.from(s.options).map(o => ({ value: o.value, text: o.textContent }))
        }));
        const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          value: i.value
        }));
        return { selects, inputs };
      });
      this.log('🔍 [DNS_VALIDATION_EXTENSION] Available form elements:', JSON.stringify(formElements, null, 2));
      
      let personaSelected = false;
      
      try {
        // Method 1: Look for select with DNS persona options
        const personaSelects = await this.page.locator('select').all();
        this.log(`🔍 [DNS_VALIDATION_EXTENSION] Found ${personaSelects.length} select elements`);
        
        for (let i = 0; i < personaSelects.length; i++) {
          const select = personaSelects[i];
          const options = await select.locator('option').all();
          this.log(`🔍 [DNS_VALIDATION_EXTENSION] Select ${i} has ${options.length} options`);
          
          // Check if this select has persona-like options
          for (let j = 0; j < options.length; j++) {
            const optionText = await options[j].textContent();
            this.log(`🔍 [DNS_VALIDATION_EXTENSION] Option ${j}: "${optionText}"`);
            
            if (optionText && !optionText.toLowerCase().includes('select') &&
                !optionText.toLowerCase().includes('none') && optionText.trim() !== '') {
              this.log(`🎯 [DNS_VALIDATION_EXTENSION] Attempting to select persona option: "${optionText}"`);
              
              try {
                await select.selectOption({ index: j });
                this.log(`✅ [DNS_VALIDATION_EXTENSION] Successfully selected persona: "${optionText}"`);
                personaSelected = true;
                break;
              } catch (err) {
                this.log(`⚠️ [DNS_VALIDATION_EXTENSION] Failed to select option ${j}: ${err.message}`);
              }
            }
          }
          
          if (personaSelected) break;
        }
        
        if (!personaSelected) {
          this.log('⚠️ [DNS_VALIDATION_EXTENSION] No suitable persona options found, continuing anyway...');
        }
        
      } catch (error) {
        this.log('⚠️ [DNS_VALIDATION_EXTENSION] Error during persona selection:', error.message);
      }
      
      // Step 5: Fill any required form fields
      this.log('📝 [DNS_VALIDATION_EXTENSION] Step 5: Checking for required form fields...');
      await this.page.waitForTimeout(500);
      
      // Look for and fill name field if present
      try {
        const nameField = this.page.locator('input[name*="name"], input[placeholder*="name"]').first();
        if (await nameField.count() > 0) {
          const currentValue = await nameField.inputValue();
          if (!currentValue || currentValue.trim() === '') {
            await nameField.fill('DNS Validation Test');
            this.log('✅ [DNS_VALIDATION_EXTENSION] Filled name field');
          }
        }
      } catch (error) {
        this.log('⚠️ [DNS_VALIDATION_EXTENSION] Error filling name field:', error.message);
      }
      
      // Step 6: Click "Start DNS Validation" button with comprehensive monitoring
      this.log('🚀 [DNS_VALIDATION_EXTENSION] Step 6: Looking for Start DNS Validation button...');
      await this.page.waitForTimeout(1000);
      
      // Set up comprehensive monitoring for errors and network requests
      let has500Error = false;
      let errorDetails = null;
      let networkRequests = [];
      let consoleErrors = [];
      let javascriptErrors = [];
      
      // Monitor console errors
      this.page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const error = `${msg.text()}`;
          consoleErrors.push(error);
          this.log(`🔴 [DNS_VALIDATION_EXTENSION] Console Error: ${error}`);
        }
      });
      
      // Monitor JavaScript errors
      this.page.on('pageerror', (error) => {
        const errorMessage = error.message;
        javascriptErrors.push(errorMessage);
        this.log(`💥 [DNS_VALIDATION_EXTENSION] JavaScript Error: ${errorMessage}`);
      });
      
      // Monitor network requests and responses
      this.page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/')) {
          this.log(`📤 [DNS_VALIDATION_EXTENSION] API Request Started: ${request.method()} ${url}`);
        }
      });
      
      this.page.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        
        // Log all API requests
        if (url.includes('/api/')) {
          networkRequests.push({
            url,
            status,
            method: response.request().method(),
            timestamp: new Date().toISOString()
          });
          this.log(`🌐 [DNS_VALIDATION_EXTENSION] API Response: ${response.request().method()} ${url} → ${status}`);
        }
        
        // Specifically watch for 500 errors
        if (status === 500) {
          has500Error = true;
          errorDetails = {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            method: response.request().method(),
            timestamp: new Date().toISOString()
          };
          this.log('🚨 [DNS_VALIDATION_EXTENSION] 500 ERROR DETECTED!', errorDetails);
        }
      });
      
      // Look for submit/start button with multiple strategies
      let submitButton = null;
      const buttonStrategies = [
        'button[type="submit"]',
        'button:has-text("Start")',
        'button:has-text("DNS")',
        'button:has-text("Begin")',
        'button:has-text("Create")',
        'button:has-text("Submit")',
        'input[type="submit"]',
        '[role="button"]'
      ];
      
      this.log('🔍 [DNS_VALIDATION_EXTENSION] Searching for submit button...');
      
      for (const strategy of buttonStrategies) {
        try {
          const buttons = await this.page.locator(strategy).all();
          this.log(`🔍 [DNS_VALIDATION_EXTENSION] Strategy "${strategy}" found ${buttons.length} buttons`);
          
          for (const button of buttons) {
            const text = await button.textContent();
            const isVisible = await button.isVisible();
            this.log(`🔍 [DNS_VALIDATION_EXTENSION] Button text: "${text}", visible: ${isVisible}`);
            
            if (isVisible && text && (
              text.toLowerCase().includes('start') ||
              text.toLowerCase().includes('dns') ||
              text.toLowerCase().includes('submit') ||
              text.toLowerCase().includes('create')
            )) {
              submitButton = button;
              this.log(`🎯 [DNS_VALIDATION_EXTENSION] Selected submit button: "${text}"`);
              break;
            }
          }
          
          if (submitButton) break;
        } catch (err) {
          this.log(`⚠️ [DNS_VALIDATION_EXTENSION] Strategy "${strategy}" failed: ${err.message}`);
        }
      }
      
      if (submitButton) {
        this.log('🎯 [DNS_VALIDATION_EXTENSION] Found suitable submit button, clicking...');
        
        try {
          await submitButton.click();
          this.log('✅ [DNS_VALIDATION_EXTENSION] Successfully clicked submit button');
          
          // Wait and monitor for server response and potential 500 error
          this.log('⏳ [DNS_VALIDATION_EXTENSION] Monitoring for DNS validation server response...');
          
          // Wait longer to catch the DNS validation request
          for (let i = 0; i < 15; i++) {
            await this.page.waitForTimeout(1000);
            this.log(`⏳ [DNS_VALIDATION_EXTENSION] Monitoring ${i+1}/15 seconds...`);
            
            if (has500Error) {
              this.log('🎯 [DNS_VALIDATION_EXTENSION] SUCCESS! 500 error reproduced during DNS validation:', errorDetails);
              this.log('📋 [DNS_VALIDATION_EXTENSION] All network requests:', networkRequests);
              return true; // Successfully reproduced the error
            }
          }
          
          this.log('ℹ️ [DNS_VALIDATION_EXTENSION] No 500 error detected after 15 seconds');
          this.log('📋 [DNS_VALIDATION_EXTENSION] All network requests captured:', networkRequests);
          this.log('🔴 [DNS_VALIDATION_EXTENSION] Console errors captured:', consoleErrors);
          this.log('💥 [DNS_VALIDATION_EXTENSION] JavaScript errors captured:', javascriptErrors);
          
          if (networkRequests.some(req => req.url.includes('dns') && req.status === 200)) {
            this.log('✅ [DNS_VALIDATION_EXTENSION] DNS validation appears to have started successfully (no 500 error)');
            return true;
          } else if (consoleErrors.length > 0 || javascriptErrors.length > 0) {
            this.log('🚨 [DNS_VALIDATION_EXTENSION] FRONTEND ERRORS DETECTED! This explains why no API calls were made.');
            this.log('🔍 [DNS_VALIDATION_EXTENSION] Root cause: Frontend JavaScript errors prevented form submission');
            return false;
          } else {
            this.log('⚠️ [DNS_VALIDATION_EXTENSION] No DNS-related API calls detected and no obvious errors');
            return false;
          }
          
        } catch (clickError) {
          this.log('❌ [DNS_VALIDATION_EXTENSION] Error clicking submit button:', clickError.message);
          return false;
        }
      } else {
        this.log('❌ [DNS_VALIDATION_EXTENSION] No suitable submit button found');
        
        // Log all buttons for debugging
        const allButtons = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]')).map(btn => ({
            tag: btn.tagName,
            type: btn.type,
            text: btn.textContent,
            visible: btn.offsetParent !== null,
            disabled: btn.disabled
          }));
        });
        this.log('🔍 [DNS_VALIDATION_EXTENSION] All available buttons:', JSON.stringify(allButtons, null, 2));
        return false;
      }
      
    } catch (error) {
      this.log('❌ [DNS_VALIDATION_EXTENSION] Error during DNS validation testing:', error.message);
      return false;
    }
  }

  setupDNSValidationLogging() {
    // Enable COMPREHENSIVE console logging to capture DNS validation diagnostic logs
    this.page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      // Log all DNS-related activities
      if (text.includes('DNS') || text.includes('dns') ||
          text.includes('PhaseConfigurationPanel') || text.includes('phaseConfiguration') ||
          text.includes('onSubmit') || text.includes('campaign') ||
          text.includes('validation') || text.includes('persona') ||
          text.includes('API') || text.includes('fetch') ||
          text.includes('POST') || text.includes('PUT') ||
          text.includes('Error') || text.includes('error') ||
          text.includes('Failed') || text.includes('failed') ||
          text.includes('Success') || text.includes('success')) {
        this.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }
      
      // Also log any errors regardless of content
      if (type === 'error' || type === 'warn') {
        this.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }
    });

    // Monitor network requests - COMPREHENSIVE logging for DNS validation debugging
    this.page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        const postData = request.postData();
        this.log(`[API REQUEST] ${request.method()} ${url}`);
        
        // DIAGNOSTIC: Identify DNS validation specific requests
        if (url.includes('dns') || url.includes('DNS') || url.includes('validate') || url.includes('campaign')) {
          this.log(`🔴 [DNS_DIAGNOSTIC] CRITICAL API REQUEST: ${request.method()} ${url}`);
          if (postData) {
            try {
              const parsed = JSON.parse(postData);
              this.log(`🔴 [DNS_DIAGNOSTIC] CRITICAL REQUEST BODY: ${JSON.stringify(parsed, null, 2)}`);
              
              // Check for signs of new campaign creation vs phase transition
              if (parsed.campaignType === 'dns_validation') {
                this.log(`🚨 [DNS_DIAGNOSTIC] SMOKING GUN: NEW DNS CAMPAIGN CREATION DETECTED!`);
                this.log(`🚨 [DNS_DIAGNOSTIC] Payload suggests new campaign creation, not phase transition`);
              }
              
              if (parsed.dnsValidationParams) {
                this.log(`🔍 [DNS_DIAGNOSTIC] DNS validation params found:`, JSON.stringify(parsed.dnsValidationParams, null, 2));
              }
              
              if (parsed.sourceCampaignId || parsed.sourceGenerationCampaignId) {
                this.log(`✅ [DNS_DIAGNOSTIC] Source campaign reference found - this should be phase transition`);
              }
              
            } catch (e) {
              this.log(`🔴 [DNS_DIAGNOSTIC] CRITICAL REQUEST BODY (unparsed): ${postData}`);
            }
          }
        }
        
        if (postData) {
          try {
            const parsed = JSON.parse(postData);
            this.log(`[API REQUEST BODY] ${JSON.stringify(parsed, null, 2)}`);
          } catch (e) {
            this.log(`[API REQUEST BODY] ${postData}`);
          }
        }
      }
    });

    // Monitor network responses - COMPREHENSIVE logging
    this.page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const status = response.status();
        const method = response.request().method();
        this.log(`[API RESPONSE] ${method} ${url} → ${status}`);
        
        // DIAGNOSTIC: Focus on DNS validation responses
        if (url.includes('dns') || url.includes('DNS') || url.includes('validate') || url.includes('campaign')) {
          this.log(`🔴 [DNS_DIAGNOSTIC] CRITICAL API RESPONSE: ${method} ${url} → ${status}`);
          
          if (status === 500) {
            this.log(`🚨 [DNS_DIAGNOSTIC] 500 ERROR DETECTED ON DNS ENDPOINT!`);
          }
          
          if (status >= 400) {
            this.log(`🔴 [DNS_DIAGNOSTIC] ERROR RESPONSE: ${status} - likely backend issue`);
          }
        }
        
        try {
          const responseBody = await response.text();
          
          // Enhanced logging for DNS-related responses
          if (url.includes('dns') || url.includes('DNS') || url.includes('validate') || url.includes('campaign')) {
            this.log(`🔴 [DNS_DIAGNOSTIC] CRITICAL RESPONSE BODY: ${responseBody}`);
            
            try {
              const parsed = JSON.parse(responseBody);
              
              // Check for campaign creation vs phase transition indicators
              if (parsed.data && parsed.data.id && parsed.data.campaignType === 'dns_validation') {
                this.log(`🚨 [DNS_DIAGNOSTIC] SMOKING GUN: RESPONSE INDICATES NEW DNS CAMPAIGN WAS CREATED!`);
                this.log(`🚨 [DNS_DIAGNOSTIC] Campaign ID: ${parsed.data.id}, Type: ${parsed.data.campaignType}`);
                
                if (parsed.data.sourceCampaignId || parsed.data.sourceGenerationCampaignId) {
                  this.log(`🔍 [DNS_DIAGNOSTIC] Source campaign reference found in response - confirming new campaign creation pattern`);
                }
              }
              
              if (parsed.message && parsed.message.includes('DNS validation started')) {
                this.log(`✅ [DNS_DIAGNOSTIC] SUCCESS MESSAGE: DNS validation started - but was it on existing campaign?`);
              }
              
              if (parsed.error || parsed.errors) {
                this.log(`❌ [DNS_DIAGNOSTIC] ERROR IN RESPONSE:`, parsed.error || parsed.errors);
              }
              
            } catch (parseErr) {
              this.log(`🔴 [DNS_DIAGNOSTIC] Could not parse response JSON:`, parseErr.message);
            }
          }
          
          if (responseBody && responseBody.length < 2000) { // Log if not too large
            this.log(`[API RESPONSE BODY] ${responseBody}`);
          } else if (responseBody) {
            this.log(`[API RESPONSE BODY] (Large response, ${responseBody.length} chars)`);
          }
        } catch (e) {
          this.log(`[API RESPONSE BODY] (Could not read response body: ${e.message})`);
        }
      }
    });
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async run() {
    try {
      await this.init();
      const success = await this.testRedirectDirect();
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
  const fs = require('fs');
  const path = require('path');
  
  const logFile = path.join(__dirname, 'test-logs.txt');
  function log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logLine);
    console.log(message);
  }
  
  log('🧪 Campaign Redirect Test Runner');
  log('===================================');
  
  const test = new RedirectTest();
  const success = await test.run();
  
  process.exit(success ? 0 : 1);
}

main();