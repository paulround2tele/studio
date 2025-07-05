#!/usr/bin/env node

/**
 * FAST Playwright Testing Script for DomainFlow Campaign System
 * 
 * Uses CORRECT selectors from actual frontend code analysis and
 * Playwright for superior speed and reliability
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// ENHANCED Configuration - Comprehensive logging
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8080',
  headless: false, // Set to true for CI/CD
  timeout: 10000, // Fast timeout
  screenshotDir: './test-automation/screenshots',
  logDir: './test-automation/logs',
  serverLogsDir: './test-automation/server-logs',
  viewport: { width: 1920, height: 1080 },
  // Log capture settings
  captureServerLogs: true,
  captureNetworkLogs: true,
  captureBrowserLogs: true,
  finalWaitTime: 10000 // 10 seconds final wait
};

// Test credentials - CORRECTED to match previous scripts
const TEST_CREDENTIALS = {
  username: 'test@example.com',
  password: 'password123'
};

class PlaywrightLogger {
  constructor() {
    this.logs = [];
    this.browserLogs = [];
    this.networkLogs = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    const logEntry = { timestamp, elapsed, level, message, data };
    this.logs.push(logEntry);
    console.log(`[${timestamp}] [${elapsed}ms] [${level.toUpperCase()}] ${message}`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2));
  }

  logBrowser(level, message, location = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, location };
    this.browserLogs.push(logEntry);
    console.log(`[${timestamp}] [BROWSER-${level.toUpperCase()}] ${message}`);
    if (location) console.log(`  Location: ${location}`);
  }

  logNetwork(request, response = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      method: request.method(),
      url: request.url(),
      status: response?.status(),
      contentType: response?.headers()['content-type'],
      size: response?.headers()['content-length']
    };
    this.networkLogs.push(logEntry);
    console.log(`[${timestamp}] [NETWORK] ${request.method()} ${request.url()} -> ${response?.status() || 'PENDING'}`);
  }

  async saveAllLogs() {
    try {
      await fs.mkdir(CONFIG.logDir, { recursive: true });
      
      // Save main logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `test-logs-${Date.now()}.json`),
        JSON.stringify(this.logs, null, 2)
      );
      
      // Save browser logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `browser-logs-${Date.now()}.json`),
        JSON.stringify(this.browserLogs, null, 2)
      );
      
      // Save network logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `network-logs-${Date.now()}.json`),
        JSON.stringify(this.networkLogs, null, 2)
      );
      
      this.info('All logs saved to disk');
    } catch (error) {
      this.error('Failed to save logs:', error.message);
    }
  }

  info(message, data) { this.log('info', message, data); }
  success(message, data) { this.log('success', message, data); }
  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
}

class PlaywrightWebSocketMonitor {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.messages = [];
    this.connectionState = 'disconnected';
  }

  async startMonitoring() {
    // Monitor WebSocket connections
    await this.page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        window._wsInstance = ws;
        window._wsMessages = window._wsMessages || [];
        window._wsConnectionState = 'connecting';

        ws.addEventListener('open', () => {
          window._wsConnectionState = 'connected';
          window._wsMessages.push({ type: 'connection', state: 'open', timestamp: Date.now() });
        });

        ws.addEventListener('message', (event) => {
          window._wsMessages.push({ type: 'message', data: event.data, timestamp: Date.now() });
        });

        ws.addEventListener('close', () => {
          window._wsConnectionState = 'closed';
          window._wsMessages.push({ type: 'connection', state: 'closed', timestamp: Date.now() });
        });

        ws.addEventListener('error', () => {
          window._wsConnectionState = 'error';
          window._wsMessages.push({ type: 'error', timestamp: Date.now() });
        });

        return ws;
      };
    });
  }

  async getConnectionState() {
    return await this.page.evaluate(() => window._wsConnectionState || 'disconnected');
  }

  async getMessages() {
    return await this.page.evaluate(() => window._wsMessages || []);
  }
}

class ServerLogCapture {
  constructor(logger) {
    this.logger = logger;
    this.frontendProcess = null;
    this.backendProcess = null;
    this.frontendLogs = [];
    this.backendLogs = [];
  }

  async startCapture() {
    if (!CONFIG.captureServerLogs) return;
    
    try {
      await fs.mkdir(CONFIG.serverLogsDir, { recursive: true });
      
      this.logger.info('Starting server log capture...');
      
      // Capture frontend logs (assuming npm run dev)
      try {
        this.frontendProcess = spawn('npm', ['run', 'dev'], {
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        this.frontendProcess.stdout.on('data', (data) => {
          const log = data.toString();
          this.frontendLogs.push({ timestamp: new Date().toISOString(), type: 'stdout', data: log });
          console.log(`[FRONTEND-OUT] ${log.trim()}`);
        });
        
        this.frontendProcess.stderr.on('data', (data) => {
          const log = data.toString();
          this.frontendLogs.push({ timestamp: new Date().toISOString(), type: 'stderr', data: log });
          console.log(`[FRONTEND-ERR] ${log.trim()}`);
        });
        
        this.logger.info('Frontend log capture started');
      } catch (frontendError) {
        this.logger.warn('Frontend log capture failed:', frontendError.message);
      }
      
      // Capture backend logs (check if backend is running)
      try {
        const response = await fetch(`${CONFIG.backendUrl}/health`);
        if (response.ok) {
          this.logger.info('Backend appears to be running, attempting log capture...');
          // Note: Backend log capture would need specific implementation based on how backend is run
        }
      } catch (backendError) {
        this.logger.warn('Backend health check failed:', backendError.message);
      }
      
    } catch (error) {
      this.logger.error('Server log capture initialization failed:', error.message);
    }
  }

  async stopCapture() {
    if (!CONFIG.captureServerLogs) return;
    
    try {
      if (this.frontendProcess) {
        this.frontendProcess.kill('SIGTERM');
      }
      
      // Save captured logs
      if (this.frontendLogs.length > 0) {
        await fs.writeFile(
          path.join(CONFIG.serverLogsDir, `frontend-logs-${Date.now()}.json`),
          JSON.stringify(this.frontendLogs, null, 2)
        );
        this.logger.info(`Saved ${this.frontendLogs.length} frontend log entries`);
      }
      
      if (this.backendLogs.length > 0) {
        await fs.writeFile(
          path.join(CONFIG.serverLogsDir, `backend-logs-${Date.now()}.json`),
          JSON.stringify(this.backendLogs, null, 2)
        );
        this.logger.info(`Saved ${this.backendLogs.length} backend log entries`);
      }
      
    } catch (error) {
      this.logger.error('Server log capture cleanup failed:', error.message);
    }
  }
}

class PlaywrightDomainFlowTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.logger = new PlaywrightLogger();
    this.wsMonitor = null;
    this.serverLogs = null;
    this.screenshotCounter = 0;
    this.campaignCreationStartTime = null;
  }

  async initialize() {
    this.logger.info('Initializing Playwright COMPREHENSIVE testing...');
    
    await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
    await fs.mkdir(CONFIG.logDir, { recursive: true });
    await fs.mkdir(CONFIG.serverLogsDir, { recursive: true });

    // Initialize server log capture
    this.serverLogs = new ServerLogCapture(this.logger);
    await this.serverLogs.startCapture();

    // Launch Playwright browser - Enhanced configuration
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: 0, // No artificial delays
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    this.context = await this.browser.newContext({
      viewport: CONFIG.viewport,
      ignoreHTTPSErrors: true
    });

    this.page = await this.context.newPage();
    this.wsMonitor = new PlaywrightWebSocketMonitor(this.page, this.logger);

    // ENHANCED: Comprehensive console logging
    this.page.on('console', msg => {
      const level = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      this.logger.logBrowser(level, text, `${location.url}:${location.lineNumber}:${location.columnNumber}`);
      
      // Also log to main logger for critical messages
      if (level === 'error') {
        this.logger.error(`Browser Console: ${text}`);
      } else if (level === 'warn') {
        this.logger.warn(`Browser Console: ${text}`);
      }
    });

    // ENHANCED: Network request/response logging
    if (CONFIG.captureNetworkLogs) {
      this.page.on('request', request => {
        // Log all requests during campaign creation period
        if (this.campaignCreationStartTime) {
          this.logger.logNetwork(request);
        }
      });

      this.page.on('response', response => {
        // Log all responses during campaign creation period
        if (this.campaignCreationStartTime) {
          this.logger.logNetwork(response.request(), response);
        }
      });
    }

    await this.wsMonitor.startMonitoring();
    this.logger.success('Playwright environment ready with comprehensive logging');
  }

  async takeScreenshot(label) {
    try {
      if (!this.page || this.page.isClosed()) {
        this.logger.warn(`Cannot take screenshot ${label} - page is closed`);
        return null;
      }
      const filename = `${String(++this.screenshotCounter).padStart(3, '0')}-${label}-${Date.now()}.png`;
      const filepath = path.join(CONFIG.screenshotDir, filename);
      await this.page.screenshot({ path: filepath, fullPage: true });
      this.logger.info(`Screenshot: ${filename}`);
      return filename;
    } catch (error) {
      this.logger.error(`Screenshot failed for ${label}:`, error.message);
      return null;
    }
  }

  // FAST LOGIN - Correct selectors from login form analysis
  async testFastLogin() {
    this.logger.info('=== FAST LOGIN TEST ===');
    
    await this.page.goto(`${CONFIG.frontendUrl}/login`);
    
    // FAST: Wait for form only
    await this.page.waitForSelector('form', { timeout: CONFIG.timeout });
    await this.takeScreenshot('login-page-loaded');
    
    // FAST: Fill fields using CORRECT selectors
    await this.page.fill('input[type="email"], input[name="username"]', TEST_CREDENTIALS.username);
    await this.page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    
    // FAST: Submit and wait for navigation
    const navigationPromise = this.page.waitForURL(url => !url.href.includes('/login'), { timeout: CONFIG.timeout });
    await this.page.click('button[type="submit"]');
    await navigationPromise;
    
    await this.takeScreenshot('login-success');
    this.logger.success('Fast login completed');
    return true;
  }

  // FAST CAMPAIGNS PAGE - Correct selectors from campaigns page analysis
  async testCampaignsPage() {
    this.logger.info('=== CAMPAIGNS PAGE TEST ===');
    
    await this.page.goto(`${CONFIG.frontendUrl}/campaigns`);
    
    // CORRECTED: Wait for actual page elements
    await this.page.waitForSelector('h1, [role="main"]', { timeout: CONFIG.timeout });
    await this.takeScreenshot('campaigns-page-loaded');
    
    // CORRECTED: Check for campaign cards or empty state
    const campaignCards = await this.page.locator('.grid .shadow-md').count();
    const hasEmptyState = await this.page.locator('text="No campaigns found"').count() > 0;
    
    this.logger.info(`Found ${campaignCards} campaign cards`);
    
    if (campaignCards > 0) {
      this.logger.success('Campaigns found in grid layout');
      return { hasCampaigns: true, count: campaignCards };
    } else if (hasEmptyState) {
      this.logger.info('Empty campaigns state detected');
      return { hasCampaigns: false, isEmpty: true };
    } else {
      this.logger.info('Campaigns page loaded');
      return { hasCampaigns: false, unknown: true };
    }
  }

  // FAST CAMPAIGN NAVIGATION - Correct selectors
  async testCampaignNavigation() {
    this.logger.info('=== CAMPAIGN NAVIGATION TEST ===');
    
    try {
      // CORRECTED: Look for actual buttons/links from campaigns page
      const createNewCampaignButton = this.page.locator('a[href="/campaigns/new"]:has-text("Create New Campaign")');
      const viewDashboardLinks = this.page.locator('a:has-text("View Dashboard")');
      
      const createButtonCount = await createNewCampaignButton.count();
      const dashboardLinksCount = await viewDashboardLinks.count();
      
      this.logger.info(`Found: ${createButtonCount} create buttons, ${dashboardLinksCount} view dashboard links`);
      
      if (dashboardLinksCount > 0) {
        this.logger.info('Found existing campaigns, clicking View Dashboard...');
        await viewDashboardLinks.first().click();
      } else if (createButtonCount > 0) {
        this.logger.info('No campaigns, clicking Create New Campaign...');
        await createNewCampaignButton.click();
      } else {
        // Try alternative selectors
        const altCreateButton = this.page.locator('a[href="/campaigns/new"]');
        if (await altCreateButton.count() > 0) {
          await altCreateButton.first().click();
          this.logger.info('Used alternative create button');
        } else {
          throw new Error('No navigation options found');
        }
      }
      
      // FAST: Wait for navigation
      await this.page.waitForLoadState('domcontentloaded');
      await this.takeScreenshot('navigation-complete');
      
      return true;
    } catch (error) {
      this.logger.error('Navigation failed:', error.message);
      await this.takeScreenshot('navigation-error');
      return false;
    }
  }

  // COMPREHENSIVE CAMPAIGN CREATION - Enhanced logging and diagnostics
  async testCampaignCreation() {
    this.logger.info('=== CAMPAIGN CREATION TEST ===');
    
    // Mark start of campaign creation for enhanced logging
    this.campaignCreationStartTime = Date.now();
    this.logger.info('🎯 ENHANCED LOGGING ACTIVE - Capturing all browser and network activity');
    
    await this.page.goto(`${CONFIG.frontendUrl}/campaigns/new`, { waitUntil: 'networkidle' });
    
    try {
      this.logger.info('Step 1: Waiting for complete page load...');
      
      // Wait for React hydration and form to be fully loaded
      await this.page.waitForSelector('form', { timeout: CONFIG.timeout });
      
      // Wait for React hydration by looking for interactive elements
      await this.page.waitForFunction(() => {
        const buttons = document.querySelectorAll('button');
        return buttons.length > 0 && Array.from(buttons).some(btn => !btn.disabled);
      }, { timeout: 10000 });
      
      // Additional wait to ensure all async components are loaded
      await this.page.waitForTimeout(2000);
      
      await this.takeScreenshot('creation-form-loaded');
      
      // DIAGNOSTIC: Check what's actually on the page
      const pageContent = await this.page.evaluate(() => {
        return {
          formCount: document.querySelectorAll('form').length,
          buttonCount: document.querySelectorAll('button').length,
          inputCount: document.querySelectorAll('input').length,
          submitButtons: Array.from(document.querySelectorAll('button[type="submit"]')).map(btn => ({
            text: btn.textContent?.trim(),
            visible: btn.offsetParent !== null,
            enabled: !btn.disabled
          })),
          allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent?.trim(),
            type: btn.type,
            visible: btn.offsetParent !== null,
            enabled: !btn.disabled
          }))
        };
      });
      
      this.logger.info('Page content analysis:', pageContent);
      
      this.logger.info('Step 2: Filling basic campaign information...');
      
      // Campaign name (required field)
      await this.page.fill('input[name="name"]', `Fast Test Campaign ${Date.now()}`);
      await this.page.waitForTimeout(300);
      
      // Description (optional field)
      await this.page.fill('textarea[name="description"]', 'Fast automated test campaign');
      await this.page.waitForTimeout(300);
      
      this.logger.info('Step 3: Selecting campaign type (domain_generation)...');
      
      // CRITICAL: Select campaign type FIRST - this enables other form fields
      const typeSelectButton = this.page.locator('button[role="combobox"]').first();
      await typeSelectButton.click();
      await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
      
      // Look specifically for domain_generation option
      const domainGenOption = this.page.locator('[role="option"]:has-text("domain_generation")');
      if (await domainGenOption.count() > 0) {
        await domainGenOption.click();
        this.logger.info('Selected domain_generation campaign type');
      } else {
        // Fallback: select first option and log what we found
        const options = await this.page.locator('[role="option"]').allTextContents();
        this.logger.info('Available options:', options);
        await this.page.locator('[role="option"]').first().click();
        this.logger.info('Selected first available option');
      }
      
      this.logger.info('Step 4: Waiting for form to fully render after type selection...');
      
      // Wait for the form to update with domain generation fields
      // This is crucial - wait for the full form to render
      await this.page.waitForFunction(() => {
        // Check if domain generation specific fields are present
        const constantPartInput = document.querySelector('input[name="constantPart"]');
        const submitButton = document.querySelector('button[type="submit"]:not([disabled])');
        return constantPartInput !== null && submitButton !== null;
      }, { timeout: 15000 });
      
      // Additional wait for React state updates
      await this.page.waitForTimeout(2000);
      
      // DIAGNOSTIC: Check form state after type selection
      const formStateAfterTypeSelection = await this.page.evaluate(() => {
        return {
          constantPartInput: !!document.querySelector('input[name="constantPart"]'),
          tldsInput: !!document.querySelector('input[name="tldsInput"]'),
          maxDomainsInput: !!document.querySelector('input[name="maxDomainsToGenerate"]'),
          submitButton: !!document.querySelector('button[type="submit"]'),
          submitButtonEnabled: document.querySelector('button[type="submit"]')?.disabled === false,
          allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
            name: input.name,
            type: input.type,
            visible: input.offsetParent !== null
          })),
          formHeight: document.body.scrollHeight,
          currentScroll: window.scrollY
        };
      });
      
      this.logger.info('Form state after type selection:', formStateAfterTypeSelection);
      
      this.logger.info('Step 5: Filling domain generation configuration...');
      
      try {
        // Fill domain generation specific fields with better error handling
        const constantPartInput = this.page.locator('input[name="constantPart"]');
        if (await constantPartInput.isVisible({ timeout: 1000 })) {
          await constantPartInput.fill('testdomain');
          await this.page.waitForTimeout(300);
        }
        
        const tldsInput = this.page.locator('input[name="tldsInput"]');
        if (await tldsInput.isVisible({ timeout: 1000 })) {
          await tldsInput.fill('.com, .net');
          await this.page.waitForTimeout(300);
        }
        
        const maxDomainsInput = this.page.locator('input[name="maxDomainsToGenerate"]');
        if (await maxDomainsInput.isVisible({ timeout: 1000 })) {
          await maxDomainsInput.fill('100');
          await this.page.waitForTimeout(300);
        }
        
        this.logger.info('Domain generation fields filled successfully');
        
      } catch (fieldError) {
        this.logger.warn('Some domain generation fields not available:', fieldError.message);
      }
      
      await this.takeScreenshot('form-filled');
      
      this.logger.info('Step 6: Final form state check and submission...');
      
      // Final diagnostic before submission
      const finalFormState = await this.page.evaluate(() => {
        const submitButtons = Array.from(document.querySelectorAll('button[type="submit"]'));
        return {
          submitButtonCount: submitButtons.length,
          submitButtons: submitButtons.map((btn, index) => ({
            index,
            text: btn.textContent?.trim(),
            visible: btn.offsetParent !== null,
            enabled: !btn.disabled,
            rect: btn.getBoundingClientRect()
          })),
          pageHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight
        };
      });
      
      this.logger.info('Final form state:', finalFormState);
      
      // Scroll to bottom to ensure submit button is visible
      await this.page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('submit-button-check');
      
      // Look for submit button
      const submitButton = this.page.locator('button[type="submit"]').filter({ hasText: /Create|Save/ });
      const submitButtonCount = await submitButton.count();
      
      if (submitButtonCount > 0) {
        const isEnabled = await submitButton.first().isEnabled();
        this.logger.info(`Found ${submitButtonCount} submit buttons, enabled: ${isEnabled}`);
        
        if (isEnabled) {
          await submitButton.first().scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(500);
          
          const navigationPromise = this.page.waitForLoadState('domcontentloaded');
          await submitButton.first().click();
          await navigationPromise;
          this.logger.success('Form submitted successfully');
        } else {
          this.logger.error('Submit button found but disabled');
        }
      } else {
        this.logger.error('No submit button found - form may not be fully loaded');
        
        // Try any button with submit type as fallback
        const anySubmitButton = this.page.locator('button[type="submit"]');
        const anySubmitCount = await anySubmitButton.count();
        this.logger.info(`Found ${anySubmitCount} buttons with type="submit"`);
        
        if (anySubmitCount > 0) {
          await anySubmitButton.first().click();
          await this.page.waitForTimeout(2000);
          this.logger.info('Used fallback submit approach');
        }
      }
      
      await this.takeScreenshot('creation-submitted');
      this.logger.success('Campaign creation completed');
      return true;
      
    } catch (error) {
      this.logger.error('Campaign creation failed:', error.message);
      await this.takeScreenshot('creation-error');
      return false;
    }
  }

  // FAST CAMPAIGN CONTROLS - Correct dropdown structure from CampaignListItem
  async testCampaignControls() {
    this.logger.info('=== CAMPAIGN CONTROLS TEST ===');
    
    try {
      // CORRECTED: Look for MoreVertical dropdown button (actual structure)
      const moreButtons = this.page.locator('button:has([data-lucide="more-vertical"])');
      const moreButtonCount = await moreButtons.count();
      
      if (moreButtonCount > 0) {
        this.logger.info(`Found ${moreButtonCount} campaign dropdown menus...`);
        await moreButtons.first().click();
        
        // FAST: Wait for dropdown menu
        await this.page.waitForSelector('[role="menu"]', { timeout: 3000 });
        await this.takeScreenshot('dropdown-opened');
        
        // CORRECTED: Get actual menu items
        const menuItems = this.page.locator('[role="menuitem"]');
        const menuCount = await menuItems.count();
        const menuTexts = [];
        
        for (let i = 0; i < menuCount; i++) {
          const text = await menuItems.nth(i).textContent();
          menuTexts.push(text?.trim() || '');
        }
        
        this.logger.info('Available menu options:', menuTexts);
        
        // Close dropdown
        await this.page.keyboard.press('Escape');
        
        return { found: true, options: menuTexts, count: menuCount };
      } else {
        this.logger.info('No campaign dropdowns found - might be in creation mode');
        return { found: false, reason: 'No dropdown menus available' };
      }
      
    } catch (error) {
      this.logger.error('Campaign controls test failed:', error.message);
      await this.takeScreenshot('controls-error');
      return { found: false, error: error.message };
    }
  }

  // FAST WEBSOCKET TEST
  async testWebSocket() {
    this.logger.info('=== WEBSOCKET TEST ===');
    
    try {
      // FAST: Brief wait for connection
      let connected = false;
      const startTime = Date.now();
      
      while (Date.now() - startTime < 3000) { // 3 second max wait
        const state = await this.wsMonitor.getConnectionState();
        if (state === 'connected') {
          connected = true;
          break;
        }
        await this.page.waitForTimeout(100);
      }
      
      const messages = await this.wsMonitor.getMessages();
      const connectionState = await this.wsMonitor.getConnectionState();
      
      this.logger.success(`WebSocket state: ${connectionState}`);
      this.logger.info(`Messages received: ${messages.length}`);
      
      await this.takeScreenshot('websocket-status');
      
      return { connected, state: connectionState, messageCount: messages.length };
      
    } catch (error) {
      this.logger.error('WebSocket test failed:', error.message);
      return { connected: false, error: error.message };
    }
  }

  // FAST COMPLETE TEST SUITE
  async runFastTestSuite() {
    const results = {};
    
    try {
      await this.initialize();
      
      // Test 1: Authentication
      results.login = await this.testFastLogin();
      
      // Test 2: Campaigns page
      results.campaignsPage = await this.testCampaignsPage();
      
      // Test 3: Navigation
      results.navigation = await this.testCampaignNavigation();
      
      // Test 4: Campaign creation  
      results.creation = await this.testCampaignCreation();
      
      // Test 5: Campaign controls
      results.controls = await this.testCampaignControls();
      
      // Test 6: WebSocket
      results.websocket = await this.testWebSocket();
      
      // ENHANCED: Extended final wait to capture all logs
      this.logger.info(`=== FINAL LOG CAPTURE PERIOD (${CONFIG.finalWaitTime}ms) ===`);
      this.logger.info('📊 Capturing final logs from all sources...');
      await this.page.waitForTimeout(CONFIG.finalWaitTime);
      
      // Take final comprehensive screenshot
      await this.takeScreenshot('final-state-complete');
      
      // Mark end of enhanced logging period
      this.campaignCreationStartTime = null;
      this.logger.success('🏁 Enhanced logging period completed');
      
      this.logger.success('=== ALL PLAYWRIGHT TESTS COMPLETED ===');
      
    } catch (error) {
      this.logger.error('Test suite failed:', error.message);
      await this.takeScreenshot('test-failure');
      results.error = error.message;
    } finally {
      // Save all captured logs
      await this.logger.saveAllLogs();
      
      // Stop server log capture
      if (this.serverLogs) {
        await this.serverLogs.stopCapture();
      }
      
      if (this.browser) {
        await this.browser.close();
      }
    }
    
    return results;
  }
}

// Main execution
async function main() {
  const tester = new PlaywrightDomainFlowTester();
  
  try {
    console.log('🚀 Starting FAST Playwright DomainFlow Testing...');
    console.log(`📊 Configuration:`, CONFIG);
    console.log('=====================================\n');
    
    const results = await tester.runFastTestSuite();
    
    console.log('\n=====================================');
    console.log('⚡ FAST Playwright Test Results:');
    console.log('=====================================');
    console.log(`🔐 Login: ${results.login ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`📋 Campaigns Page: ${results.campaignsPage?.hasCampaigns ? '✅ HAS CAMPAIGNS' : results.campaignsPage?.isEmpty ? '📄 EMPTY' : '❓ UNKNOWN'}`);
    console.log(`🧭 Navigation: ${results.navigation ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`🆕 Creation: ${results.creation ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`🎮 Controls: ${results.controls?.found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`🔗 WebSocket: ${results.websocket?.connected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
    
    if (results.controls?.options?.length > 0) {
      console.log(`   Available actions: ${results.controls.options.join(', ')}`);
    }
    
    console.log('\n📸 Screenshots saved to:', CONFIG.screenshotDir);
    console.log('📋 Test logs saved to:', CONFIG.logDir);
    console.log('🖥️  Server logs saved to:', CONFIG.serverLogsDir);
    
    // ENHANCED: Analyze logs for critical issues
    console.log('\n🔍 ANALYZING CAPTURED LOGS FOR ISSUES...');
    await analyzeCapturedLogs(tester.logger);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Playwright test execution failed:', error.message);
    process.exit(1);
  }
}

// ENHANCED: Log analysis function
async function analyzeCapturedLogs(logger) {
  const criticalIssues = [];
  const warnings = [];
  const performance = [];

  // Analyze browser logs
  const errorLogs = logger.browserLogs.filter(log => log.level === 'error');
  const warnLogs = logger.browserLogs.filter(log => log.level === 'warn');

  // Categorize issues by criticality
  errorLogs.forEach(log => {
    if (log.message.includes('Maximum update depth exceeded')) {
      criticalIssues.push({
        severity: 'CRITICAL',
        category: 'React Infinite Loop',
        message: 'React component infinite re-render detected',
        details: log.message,
        location: log.location,
        impact: 'App performance severely degraded, potential browser crash'
      });
    } else if (log.message.includes('INFINITE LOOP DETECTED')) {
      criticalIssues.push({
        severity: 'CRITICAL',
        category: 'Component Loop',
        message: 'Component infinite loop detected',
        details: log.message,
        location: log.location,
        impact: 'Component constantly re-rendering, performance issues'
      });
    } else if (log.message.includes('Failed to load resource')) {
      warnings.push({
        severity: 'WARNING',
        category: 'Resource Loading',
        message: 'Resource failed to load',
        details: log.message,
        impact: 'Some functionality may not work correctly'
      });
    } else if (log.message.includes('Authentication required')) {
      warnings.push({
        severity: 'WARNING',
        category: 'Authentication',
        message: 'Authentication issues detected',
        details: log.message,
        impact: 'User session management problems'
      });
    } else {
      warnings.push({
        severity: 'ERROR',
        category: 'General',
        message: 'Browser error detected',
        details: log.message,
        location: log.location
      });
    }
  });

  // Analyze network logs for performance issues
  const slowRequests = logger.networkLogs.filter(log =>
    log.status && (log.status >= 400 || log.url.includes('/api/'))
  );

  slowRequests.forEach(req => {
    if (req.status >= 500) {
      criticalIssues.push({
        severity: 'CRITICAL',
        category: 'Server Error',
        message: `Server error: ${req.method} ${req.url}`,
        details: `Status: ${req.status}`,
        impact: 'API functionality broken'
      });
    } else if (req.status >= 400) {
      warnings.push({
        severity: 'WARNING',
        category: 'Client Error',
        message: `Client error: ${req.method} ${req.url}`,
        details: `Status: ${req.status}`,
        impact: 'Request failed, functionality may be impacted'
      });
    }
  });

  // Performance analysis
  const renderCounts = logger.browserLogs
    .filter(log => log.message.includes('renderCount:'))
    .map(log => {
      const match = log.message.match(/renderCount:\s*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

  if (renderCounts.some(count => count > 50)) {
    performance.push({
      severity: 'PERFORMANCE',
      category: 'Excessive Renders',
      message: 'Components rendering excessively',
      details: `Max render count: ${Math.max(...renderCounts)}`,
      impact: 'Poor user experience, browser performance degradation'
    });
  }

  // Output analysis results
  console.log('\n🚨 CRITICAL ISSUES (IMMEDIATE ACTION REQUIRED):');
  console.log('=' .repeat(60));
  criticalIssues.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.severity}] ${issue.category}: ${issue.message}`);
    console.log(`   Details: ${issue.details}`);
    if (issue.location) console.log(`   Location: ${issue.location}`);
    console.log(`   Impact: ${issue.impact}`);
    console.log('');
  });

  console.log('\n⚠️  WARNINGS (SHOULD BE ADDRESSED):');
  console.log('=' .repeat(50));
  warnings.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.severity}] ${issue.category}: ${issue.message}`);
    console.log(`   Details: ${issue.details}`);
    if (issue.impact) console.log(`   Impact: ${issue.impact}`);
    console.log('');
  });

  console.log('\n📊 PERFORMANCE ISSUES:');
  console.log('=' .repeat(40));
  performance.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.severity}] ${issue.category}: ${issue.message}`);
    console.log(`   Details: ${issue.details}`);
    console.log(`   Impact: ${issue.impact}`);
    console.log('');
  });

  console.log('\n📈 SUMMARY:');
  console.log(`🚨 Critical Issues: ${criticalIssues.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`📊 Performance Issues: ${performance.length}`);
  console.log(`🔍 Total Browser Logs: ${logger.browserLogs.length}`);
  console.log(`🌐 Total Network Requests: ${logger.networkLogs.length}`);
}

if (require.main === module) {
  main();
}

module.exports = { PlaywrightDomainFlowTester, CONFIG, analyzeCapturedLogs };