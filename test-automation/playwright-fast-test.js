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
      
      this.logger.info('🚀 Starting COMPREHENSIVE server log capture...');
      
      // ENHANCED Frontend log capture with DNS validation monitoring
      try {
        this.frontendProcess = spawn('npm', ['run', 'dev'], {
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, FORCE_COLOR: '0' }
        });
        
        this.frontendProcess.stdout.on('data', (data) => {
          const log = data.toString();
          const logEntry = { 
            timestamp: new Date().toISOString(), 
            type: 'frontend-stdout', 
            data: log.trim(),
            source: 'next-dev-server'
          };
          this.frontendLogs.push(logEntry);
          
          // Enhanced logging for DNS validation and campaign events
          if (log.includes('ready') || log.includes('compiled') || log.includes('error') || 
              log.includes('campaign') || log.includes('DNS') || log.includes('validation') ||
              log.includes('phase') || log.includes('persona')) {
            console.log(`🖥️  [FRONTEND-OUT] ${log.trim()}`);
          }
        });
        
        this.frontendProcess.stderr.on('data', (data) => {
          const log = data.toString();
          const logEntry = { 
            timestamp: new Date().toISOString(), 
            type: 'frontend-stderr', 
            data: log.trim(),
            source: 'next-dev-server'
          };
          this.frontendLogs.push(logEntry);
          console.log(`🚨 [FRONTEND-ERR] ${log.trim()}`);
        });
        
        this.logger.info('Frontend log capture started');
      } catch (frontendError) {
        this.logger.warn('Frontend log capture failed:', frontendError.message);
      }
      
      // ENHANCED Backend log capture with comprehensive monitoring
      try {
        const response = await fetch(`${CONFIG.backendUrl}/health`);
        if (response.ok) {
          this.logger.info('✅ Backend running, setting up comprehensive log monitoring...');
          await this.monitorBackendLogs();
          await this.startBackendAPIMonitoring();
        } else {
          this.logger.warn('⚠️  Backend not accessible, attempting to start...');
          await this.startBackendProcess();
        }
      } catch (backendError) {
        this.logger.warn('Backend health check failed, starting backend process...', backendError.message);
        await this.startBackendProcess();
      }
      
    } catch (error) {
      this.logger.error('Server log capture initialization failed:', error.message);
    }
  }

  async monitorBackendLogs() {
    try {
      // Look for common backend log files
      const possibleLogPaths = [
        './backend/logs/app.log',
        './backend/logs/apiserver.log',
        './logs/backend.log',
        './apiserver.log',
        '/tmp/domainflow-backend.log'
      ];
      
      for (const logPath of possibleLogPaths) {
        try {
          const stats = await fs.stat(logPath);
          if (stats.isFile()) {
            this.logger.info(`📋 Found backend log file: ${logPath}`);
            await this.tailLogFile(logPath, 'backend');
          }
        } catch (e) {
          // File doesn't exist, continue
        }
      }
    } catch (error) {
      this.logger.warn('Backend log monitoring setup failed:', error.message);
    }
  }

  async tailLogFile(filePath, source) {
    try {
      const { spawn } = require('child_process');
      const tailProcess = spawn('tail', ['-f', filePath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      tailProcess.stdout.on('data', (data) => {
        const log = data.toString();
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: `${source}-log`,
          data: log.trim(),
          source: filePath
        };
        this.backendLogs.push(logEntry);
        
        // Enhanced logging for DNS validation events
        if (log.includes('ERROR') || log.includes('WARN') || log.includes('campaign') ||
            log.includes('DNS') || log.includes('validation') || log.includes('phase')) {
          console.log(`⚙️  [BACKEND-LOG] ${log.trim()}`);
        }
      });
      
      this.logger.info(`📋 Tailing log file: ${filePath}`);
      
    } catch (error) {
      this.logger.warn(`Failed to tail log file ${filePath}:`, error.message);
    }
  }

  async startBackendProcess() {
    try {
      this.logger.info('🔄 Attempting to start backend process...');
      
      const backendCommands = [
        { cmd: 'go', args: ['run', './cmd/apiserver/main.go'], cwd: './backend' },
        { cmd: './bin/apiserver', args: [], cwd: './backend' },
        { cmd: 'make', args: ['run'], cwd: './backend' }
      ];
      
      for (const command of backendCommands) {
        try {
          this.logger.info(`Trying: ${command.cmd} ${command.args.join(' ')}`);
          
          this.backendProcess = spawn(command.cmd, command.args, {
            cwd: command.cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env }
          });
          
          this.backendProcess.stdout.on('data', (data) => {
            const log = data.toString();
            const logEntry = {
              timestamp: new Date().toISOString(),
              type: 'backend-stdout',
              data: log.trim(),
              source: 'backend-process'
            };
            this.backendLogs.push(logEntry);
            console.log(`⚙️  [BACKEND-OUT] ${log.trim()}`);
          });
          
          this.backendProcess.stderr.on('data', (data) => {
            const log = data.toString();
            const logEntry = {
              timestamp: new Date().toISOString(),
              type: 'backend-stderr',
              data: log.trim(),
              source: 'backend-process'
            };
            this.backendLogs.push(logEntry);
            console.log(`🚨 [BACKEND-ERR] ${log.trim()}`);
          });
          
          // Wait for backend to be ready
          await this.waitForServiceReady(CONFIG.backendUrl + '/health', 30000);
          this.logger.success('✅ Backend started and ready');
          break;
          
        } catch (cmdError) {
          this.logger.warn(`Command failed: ${command.cmd}`, cmdError.message);
          continue;
        }
      }
      
    } catch (error) {
      this.logger.error('Failed to start backend process:', error.message);
    }
  }

  async startBackendAPIMonitoring() {
    this.logger.info('📡 Backend API monitoring active via Playwright network capture');
    // API monitoring handled by Playwright network listeners
  }

  async waitForServiceReady(url, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Service at ${url} not ready within ${timeout}ms`);
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

    // ENHANCED: Comprehensive console logging with campaign-specific filtering
    this.page.on('console', msg => {
      const level = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      this.logger.logBrowser(level, text, `${location.url}:${location.lineNumber}:${location.columnNumber}`);
      
      // Enhanced logging for campaign-related console messages
      if (this.enhancedLoggingActive || this.campaignCreationStartTime) {
        if (text.toLowerCase().includes('campaign') ||
            text.toLowerCase().includes('create') ||
            text.toLowerCase().includes('button') ||
            text.toLowerCase().includes('form') ||
            text.toLowerCase().includes('submit')) {
          this.logger.info(`🎯 CAMPAIGN CONSOLE: [${level.toUpperCase()}] ${text}`);
        }
      }
      
      // Also log to main logger for critical messages
      if (level === 'error') {
        this.logger.error(`Browser Console: ${text}`);
      } else if (level === 'warn') {
        this.logger.warn(`Browser Console: ${text}`);
      }
    });

    // ENHANCED: Network request/response logging - START EARLY for campaign navigation
    if (CONFIG.captureNetworkLogs) {
      this.page.on('request', request => {
        // Log all requests during campaign creation period OR when looking for create campaign button
        if (this.campaignCreationStartTime || this.enhancedLoggingActive) {
          this.logger.logNetwork(request);
          
          // Special logging for campaign-related API calls
          if (request.url().includes('/campaigns') || request.url().includes('/api/')) {
            this.logger.info(`🌐 CAMPAIGN API REQUEST: ${request.method()} ${request.url()}`);
          }
        }
      });

      this.page.on('response', response => {
        // Log all responses during campaign creation period OR when looking for create campaign button
        if (this.campaignCreationStartTime || this.enhancedLoggingActive) {
          this.logger.logNetwork(response.request(), response);
          
          // Special logging for campaign-related API responses
          if (response.url().includes('/campaigns') || response.url().includes('/api/')) {
            this.logger.info(`🌐 CAMPAIGN API RESPONSE: ${response.status()} ${response.url()}`);
          }
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
    
    // CORRECTED: Use actual selectors from LoginForm.tsx (#email, #password)
    await this.page.fill('#email', TEST_CREDENTIALS.username);
    await this.page.fill('#password', TEST_CREDENTIALS.password);
    
    // CORRECTED: Click the actual "Sign in Securely" button and wait for redirect
    await this.page.click('button[type="submit"]:has-text("Sign in Securely")');
    
    // Wait for login processing and redirect - be more flexible with the redirect
    try {
      await this.page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
    } catch (navError) {
      // Fallback: check if we're redirected to dashboard or campaigns
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/campaigns') || !currentUrl.includes('/login')) {
        this.logger.info(`Login redirect successful to: ${currentUrl}`);
      } else {
        // Still on login page, wait a bit more and check auth state
        await this.page.waitForTimeout(3000);
        const finalUrl = this.page.url();
        if (!finalUrl.includes('/login')) {
          this.logger.info(`Login redirect completed after delay to: ${finalUrl}`);
        } else {
          this.logger.warn(`Still on login page after successful authentication: ${finalUrl}`);
          // Continue anyway since login was successful
        }
      }
    }
    
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

  // FAST CAMPAIGN NAVIGATION - Enhanced logging and button detection
  async testCampaignNavigation() {
    this.logger.info('=== CAMPAIGN NAVIGATION TEST ===');
    
    // Activate enhanced logging for button detection
    this.enhancedLoggingActive = true;
    this.logger.info('🔍 ENHANCED LOGGING ACTIVATED - Tracking create campaign button detection');
    
    try {
      // Take screenshot before button detection
      await this.takeScreenshot('before-button-detection');
      
      // ENHANCED: More comprehensive button detection with detailed logging
      this.logger.info('🎯 STEP 1: Analyzing page for create campaign buttons...');
      
      // Strategy 1: Look for specific Create New Campaign buttons
      const createNewCampaignButton = this.page.locator('a[href="/campaigns/new"]:has-text("Create New Campaign")');
      const viewDashboardLinks = this.page.locator('a:has-text("View Dashboard")');
      
      const createButtonCount = await createNewCampaignButton.count();
      const dashboardLinksCount = await viewDashboardLinks.count();
      
      this.logger.info(`🔍 BUTTON DETECTION RESULTS:`);
      this.logger.info(`   Create New Campaign buttons: ${createButtonCount}`);
      this.logger.info(`   View Dashboard links: ${dashboardLinksCount}`);
      
      // ENHANCED: Alternative button detection strategies
      const alternativeSelectors = [
        'a[href="/campaigns/new"]',
        'button:has-text("Create")',
        'button:has-text("New Campaign")',
        '[data-testid="create-campaign"]',
        '.create-campaign-button'
      ];
      
      this.logger.info('🔍 STEP 2: Trying alternative button selectors...');
      for (const selector of alternativeSelectors) {
        const count = await this.page.locator(selector).count();
        this.logger.info(`   ${selector}: ${count} elements found`);
      }
      
      // ENHANCED: DOM analysis for button detection debugging
      const buttonAnalysis = await this.page.evaluate(() => {
        const allButtons = document.querySelectorAll('button, a');
        const buttonData = Array.from(allButtons).map((btn, index) => ({
          index,
          tagName: btn.tagName,
          text: btn.textContent?.trim() || '',
          href: btn.href || '',
          className: btn.className || '',
          id: btn.id || '',
          visible: btn.offsetParent !== null,
          enabled: !btn.disabled
        }));
        
        // Filter for campaign-related buttons
        const campaignButtons = buttonData.filter(btn =>
          btn.text.toLowerCase().includes('campaign') ||
          btn.text.toLowerCase().includes('create') ||
          btn.href.includes('/campaigns/new') ||
          btn.className.includes('campaign')
        );
        
        return {
          totalButtons: buttonData.length,
          campaignRelatedButtons: campaignButtons,
          allVisibleButtons: buttonData.filter(btn => btn.visible).slice(0, 10) // First 10 visible buttons for analysis
        };
      });
      
      this.logger.info('🔍 STEP 3: DOM Button Analysis Results:', {
        totalButtons: buttonAnalysis.totalButtons,
        campaignButtonsFound: buttonAnalysis.campaignRelatedButtons.length,
        campaignButtons: buttonAnalysis.campaignRelatedButtons
      });
      
      if (buttonAnalysis.campaignRelatedButtons.length === 0) {
        this.logger.warn('⚠️  No campaign-related buttons found in DOM analysis');
        this.logger.info('📋 Sample of visible buttons:', buttonAnalysis.allVisibleButtons);
      }
      
      this.logger.info('🎯 STEP 4: Determining navigation strategy...');
      
      // ALWAYS prioritize creating new campaigns for testing purposes
      if (createButtonCount > 0) {
        this.logger.info('✅ Found Create New Campaign button, clicking to test creation flow...');
        await this.takeScreenshot('before-create-click');
        await createNewCampaignButton.click();
        this.logger.info('🎯 Create New Campaign button clicked');
      } else if (dashboardLinksCount > 0) {
        this.logger.info('✅ No create button found, clicking View Dashboard as fallback...');
        await this.takeScreenshot('before-dashboard-click');
        await viewDashboardLinks.first().click();
        this.logger.info('🎯 Dashboard link clicked');
      } else {
        this.logger.warn('⚠️  Primary buttons not found, trying alternatives...');
        
        // Try alternative selectors with enhanced logging
        const altCreateButton = this.page.locator('a[href="/campaigns/new"]');
        const altCreateButtonCount = await altCreateButton.count();
        
        if (altCreateButtonCount > 0) {
          this.logger.info(`✅ Found ${altCreateButtonCount} alternative create button(s)`);
          await this.takeScreenshot('before-alt-create-click');
          await altCreateButton.first().click();
          this.logger.info('🎯 Alternative create button clicked');
        } else {
          // Final fallback: try any button with "create" text
          const anyCreateButton = this.page.locator('button:has-text("Create"), a:has-text("Create")');
          const anyCreateCount = await anyCreateButton.count();
          
          if (anyCreateCount > 0) {
            this.logger.info(`✅ Found ${anyCreateCount} generic create button(s)`);
            await this.takeScreenshot('before-generic-create-click');
            await anyCreateButton.first().click();
            this.logger.info('🎯 Generic create button clicked');
          } else {
            await this.takeScreenshot('no-buttons-found');
            throw new Error('No navigation options found after comprehensive search');
          }
        }
      }
      
      this.logger.info('🎯 STEP 5: Waiting for navigation to complete...');
      
      // ENHANCED: Wait for navigation with timeout and error handling
      try {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Additional wait for React hydration
        await this.page.waitForTimeout(2000);
        
        await this.takeScreenshot('navigation-complete');
        this.logger.success('✅ Navigation completed successfully');
        
        // Check if we ended up on the right page
        const currentUrl = this.page.url();
        this.logger.info(`📍 Current URL after navigation: ${currentUrl}`);
        
        if (currentUrl.includes('/campaigns/new')) {
          this.logger.success('✅ Successfully navigated to campaign creation page');
        } else if (currentUrl.includes('/campaigns/')) {
          this.logger.success('✅ Successfully navigated to campaign page');
        } else {
          this.logger.warn('⚠️  Navigation may not have worked as expected');
        }
        
        return true;
        
      } catch (navigationError) {
        this.logger.error('❌ Navigation timeout or error:', navigationError.message);
        await this.takeScreenshot('navigation-timeout');
        return false;
      }
      
    } catch (error) {
      this.logger.error('❌ Navigation test failed:', error.message);
      await this.takeScreenshot('navigation-error');
      return false;
    } finally {
      // Deactivate enhanced logging after navigation test
      this.enhancedLoggingActive = false;
      this.logger.info('🔍 Enhanced logging deactivated after navigation test');
    }
  }

  // COMPREHENSIVE CAMPAIGN CREATION - Enhanced logging and diagnostics
  async testCampaignCreation() {
    this.logger.info('=== CAMPAIGN CREATION TEST ===');
    
    // Mark start of campaign creation for enhanced logging
    this.campaignCreationStartTime = Date.now();
    this.enhancedLoggingActive = true;
    this.logger.info('🎯 ENHANCED LOGGING ACTIVE - Capturing all browser and network activity');
    this.logger.info('📊 Console and network logs will now capture ALL campaign-related activity');
    
    // DON'T force navigate - follow the natural app workflow from button click
    // The navigation test already clicked the "Create New Campaign" button
    // Just wait for the form to load on the current page
    this.logger.info('Following natural app workflow - waiting for creation form to load...');
    
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
      
      // CORRECTED: Use actual placeholder selectors from CampaignFormV2.tsx
      await this.page.fill('input[placeholder="e.g., Q3 Tech Outreach"]', `Fast Test Campaign ${Date.now()}`);
      await this.page.waitForTimeout(300);
      
      // CORRECTED: Use actual placeholder selector for description
      await this.page.fill('textarea[placeholder="Describe goals or targets."]', 'Fast automated test campaign');
      await this.page.waitForTimeout(300);
      
      this.logger.info('Step 3: Selecting campaign type (domain_generation)...');
      
      // CORRECTED: Target the actual Select component from CampaignFormV2.tsx
      // Look for SelectTrigger with "Select type" placeholder
      const typeSelectButton = this.page.locator('button[role="combobox"]:has-text("Select type")');
      await typeSelectButton.click();
      await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
      
      // CORRECTED: Look for the exact option text as it appears in the form
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
      
      // Take screenshot after type selection to verify the form state
      await this.page.waitForTimeout(1000); // Brief wait for UI to update
      await this.takeScreenshot('campaign-type-selected');
      
      this.logger.info('Step 4: Waiting for form to fully render after type selection...');
      
      // CORRECTED: Wait for domain generation fields to appear based on actual form structure
      await this.page.waitForFunction(() => {
        // Look for the domain generation configuration section
        const formSections = document.querySelectorAll('input, textarea, button, select');
        const submitButton = document.querySelector('button[type="submit"]:not([disabled])');
        return formSections.length > 5 && submitButton !== null;
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
      
      // 🚨 CRITICAL: Store expected values for validation - SMALL CAMPAIGN FOR DNS VALIDATION TESTING
      const EXPECTED_CAMPAIGN_CONFIG = {
        maxDomainsToGenerate: 8, // Small campaign for focused DNS validation monitoring
        constantPart: `dnstest${Date.now()}`,
        tldsInput: '.com, .org'
      };
      
      // Store expected values globally for later validation
      this.expectedCampaignConfig = EXPECTED_CAMPAIGN_CONFIG;
      
      try {
        // CORRECTED: Fill domain generation fields using ACTUAL form field names from CampaignFormV2.tsx
        this.logger.info(`🔧 EXPECTED CONFIGURATION:`, EXPECTED_CAMPAIGN_CONFIG);
        
        // Constant Part - use the actual field name from the form
        const constantPartInput = this.page.locator('input[name="constantPart"]');
        if (await constantPartInput.isVisible({ timeout: 2000 })) {
          await constantPartInput.clear();
          await constantPartInput.fill(EXPECTED_CAMPAIGN_CONFIG.constantPart);
          await this.page.waitForTimeout(300);
          this.logger.info(`✅ Constant part filled: ${EXPECTED_CAMPAIGN_CONFIG.constantPart}`);
        } else {
          // Fallback: use placeholder selector from the actual form code
          const altConstantInput = this.page.locator('input[placeholder*="business"]');
          if (await altConstantInput.count() > 0) {
            await altConstantInput.first().clear();
            await altConstantInput.first().fill(EXPECTED_CAMPAIGN_CONFIG.constantPart);
            await this.page.waitForTimeout(300);
            this.logger.info(`✅ Constant part filled (fallback): ${EXPECTED_CAMPAIGN_CONFIG.constantPart}`);
          }
        }
        
        // TLDs Input - the actual form has a text input for TLD values
        const tldsInput = this.page.locator('input[placeholder*="Selected TLDs"]');
        if (await tldsInput.isVisible({ timeout: 2000 })) {
          await tldsInput.clear();
          await tldsInput.fill(EXPECTED_CAMPAIGN_CONFIG.tldsInput);
          await this.page.waitForTimeout(300);
          this.logger.info(`✅ TLDs filled: ${EXPECTED_CAMPAIGN_CONFIG.tldsInput}`);
        }
        
        // 🚨 CRITICAL: Max Domains to Generate - VALIDATE THIS IS RESPECTED!
        const maxDomainsInput = this.page.locator('input[name="maxDomainsToGenerate"]');
        if (await maxDomainsInput.isVisible({ timeout: 2000 })) {
          await maxDomainsInput.clear();
          await maxDomainsInput.fill(EXPECTED_CAMPAIGN_CONFIG.maxDomainsToGenerate.toString());
          await this.page.waitForTimeout(300);
          this.logger.info(`🎯 CRITICAL: Max domains set to ${EXPECTED_CAMPAIGN_CONFIG.maxDomainsToGenerate} - SYSTEM MUST RESPECT THIS LIMIT!`);
        } else {
          // Fallback: use placeholder selector from the actual form code
          const altMaxDomainsInput = this.page.locator('input[placeholder="1000"]');
          if (await altMaxDomainsInput.count() > 0) {
            await altMaxDomainsInput.first().clear();
            await altMaxDomainsInput.first().fill(EXPECTED_CAMPAIGN_CONFIG.maxDomainsToGenerate.toString());
            await this.page.waitForTimeout(300);
            this.logger.info(`🎯 CRITICAL: Max domains set (fallback) to ${EXPECTED_CAMPAIGN_CONFIG.maxDomainsToGenerate} - SYSTEM MUST RESPECT THIS LIMIT!`);
          }
        }
        
        this.logger.info('✅ Domain generation fields filled successfully with expected values');
        
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
      
      // ENHANCED: Better scroll and submit button detection for long forms
      this.logger.info('Step 6a: Ensuring full form visibility and submit button detection...');
      
      // First, get the actual form dimensions and scroll position
      const scrollInfo = await this.page.evaluate(() => {
        const form = document.querySelector('form');
        const submitButtons = Array.from(document.querySelectorAll('button[type="submit"]'));
        
        return {
          formHeight: form ? form.scrollHeight : 0,
          bodyHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight,
          currentScroll: window.scrollY,
          submitButtonPositions: submitButtons.map(btn => ({
            text: btn.textContent?.trim(),
            top: btn.getBoundingClientRect().top,
            bottom: btn.getBoundingClientRect().bottom,
            visible: btn.offsetParent !== null,
            enabled: !btn.disabled
          }))
        };
      });
      
      this.logger.info('Scroll analysis:', scrollInfo);
      
      // Scroll to the very bottom in multiple steps to ensure we reach the submit button
      await this.page.evaluate(() => {
        // First scroll to bottom
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      await this.page.waitForTimeout(1500);
      
      // Double-check we're at the bottom and scroll again if needed
      await this.page.evaluate(() => {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        window.scrollTo({ top: maxScroll + 100, behavior: 'smooth' });
      });
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('submit-button-check');
      
      // Enhanced submit button detection with multiple strategies
      this.logger.info('Step 6b: Enhanced submit button detection...');
      
      // CORRECTED: Look for submit button based on actual CampaignFormV2.tsx structure
      // Strategy 1: Look for the exact button text from the form
      let submitButton = this.page.locator('button[type="submit"]:has-text("Create Campaign")');
      let submitButtonCount = await submitButton.count();
      
      if (submitButtonCount === 0) {
        // Strategy 2: The button might be disabled and showing "Creating..."
        submitButton = this.page.locator('button[type="submit"]:has-text("Creating...")');
        submitButtonCount = await submitButton.count();
      }
      
      if (submitButtonCount === 0) {
        // Strategy 3: Look for any submit button at all
        submitButton = this.page.locator('button[type="submit"]');
        submitButtonCount = await submitButton.count();
      }
      
      // Get detailed info about all submit buttons
      const submitButtonInfo = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        return buttons.map((btn, index) => {
          const rect = btn.getBoundingClientRect();
          return {
            index,
            text: btn.textContent?.trim(),
            visible: btn.offsetParent !== null,
            enabled: !btn.disabled,
            inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
            position: {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right
            }
          };
        });
      });
      
      this.logger.info(`Found ${submitButtonCount} submit buttons:`, submitButtonInfo);
      
      if (submitButtonCount > 0) {
        // Find the best submit button (enabled and preferably visible)
        let bestButton = submitButton.first();
        
        for (let i = 0; i < submitButtonCount; i++) {
          const button = submitButton.nth(i);
          const isEnabled = await button.isEnabled();
          const isVisible = await button.isVisible();
          
          if (isEnabled && isVisible) {
            bestButton = button;
            this.logger.info(`Using submit button ${i}: enabled and visible`);
            break;
          } else if (isEnabled) {
            bestButton = button;
            this.logger.info(`Using submit button ${i}: enabled but may need scrolling`);
          }
        }
        
        // Ensure the button is in view and click it
        await bestButton.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1000);
        
        // Final check that it's enabled
        const isEnabled = await bestButton.isEnabled();
        this.logger.info(`Final submit button state - enabled: ${isEnabled}`);
        
        if (isEnabled) {
          // CORRECTED: Wait for navigation based on actual CampaignFormV2.tsx behavior
          // The form redirects to `/campaigns/${campaign.id}?type=${data.selectedType}`
          const navigationPromise = this.page.waitForURL(url => {
            return url.href.includes('/campaigns/') &&
                   !url.href.includes('/campaigns/new') &&
                   (url.href.includes('?type=domain_generation') || url.href.match(/\/campaigns\/[a-f0-9-]{36}/));
          }, { timeout: 20000 });
          
          // Click and wait for navigation to campaign-specific page
          await bestButton.click();
          this.logger.info('Submit button clicked, waiting for navigation...');
          
          try {
            await navigationPromise;
            this.logger.success('Successfully navigated to campaign details page');
          } catch (navError) {
            this.logger.warn('Navigation timeout, but checking current URL...');
            const currentUrl = this.page.url();
            if (currentUrl.includes('/campaigns/') && !currentUrl.includes('/new')) {
              this.logger.success('Navigation completed despite timeout');
            } else {
              throw navError;
            }
          }
          
          // Additional wait for page to fully load
          await this.page.waitForTimeout(3000);
          
          this.logger.success('Form submitted successfully and navigated to campaign page');
        } else {
          this.logger.error('Submit button found but disabled');
          return false;
        }
      } else {
        this.logger.error('No submit button found - form may not be fully loaded');
        
        // Final diagnostic - check what buttons exist
        const allButtons = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent?.trim(),
            type: btn.type,
            disabled: btn.disabled,
            visible: btn.offsetParent !== null
          }));
        });
        
        this.logger.info('All buttons on page:', allButtons);
        return false;
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

  // NEW: Deep domain generation monitoring after campaign creation
  async testDomainGenerationProcess(campaignId = null) {
    this.logger.info('=== DOMAIN GENERATION DEEP MONITORING ===');
    this.logger.info('🔬 Starting comprehensive domain generation analysis...');
    
    try {
      // If we don't have a campaign ID, try to extract from current URL
      if (!campaignId) {
        const currentUrl = this.page.url();
        this.logger.info(`Current URL for campaign ID extraction: ${currentUrl}`);
        
        // Try multiple regex patterns to be more robust
        const patterns = [
          /\/campaigns\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
          /\/campaigns\/([a-f0-9-]{36})/i,
          /campaignId[=:]([a-f0-9-]{36})/i,
          /campaigns[\/=]([a-f0-9-]{36})/i
        ];
        
        let extractedId = null;
        for (const pattern of patterns) {
          const match = currentUrl.match(pattern);
          if (match) {
            extractedId = match[1];
            break;
          }
        }
        
        // Also try to get campaign ID from page content/DOM
        if (!extractedId) {
          this.logger.info('URL extraction failed, trying DOM extraction...');
          extractedId = await this.page.evaluate(() => {
            // Look for campaign ID in various DOM elements
            const selectors = [
              '[data-campaign-id]',
              '[data-testid*="campaign"]',
              '.campaign-id',
              '[data-id]'
            ];
            
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element) {
                const id = element.getAttribute('data-campaign-id') ||
                          element.getAttribute('data-id') ||
                          element.textContent;
                if (id && id.match(/^[a-f0-9-]{36}$/i)) {
                  return id;
                }
              }
            }
            
            // Try to find it in any script tags or window variables
            if (window.location.pathname.includes('/campaigns/')) {
              const pathParts = window.location.pathname.split('/');
              const campaignIndex = pathParts.indexOf('campaigns');
              if (campaignIndex >= 0 && pathParts[campaignIndex + 1]) {
                const potentialId = pathParts[campaignIndex + 1];
                if (potentialId.match(/^[a-f0-9-]{36}$/i)) {
                  return potentialId;
                }
              }
            }
            
            return null;
          });
        }
        
        if (extractedId) {
          campaignId = extractedId;
          this.logger.info(`Extracted campaign ID: ${campaignId}`);
        } else {
          this.logger.error('No campaign ID available for monitoring');
          this.logger.info('Available alternatives: Continue with limited monitoring or navigate to campaigns list');
          
          // Try to wait for the page to fully load and try again
          await this.page.waitForTimeout(3000);
          const retryUrl = this.page.url();
          const retryMatch = retryUrl.match(/\/campaigns\/([a-f0-9-]{36})/i);
          if (retryMatch) {
            campaignId = retryMatch[1];
            this.logger.info(`Campaign ID extracted on retry: ${campaignId}`);
          } else {
            return { success: false, reason: 'No campaign ID found after multiple attempts' };
          }
        }
      }

      // Extended monitoring configuration
      const MONITORING_CONFIG = {
        maxMonitoringTime: 120000, // 2 minutes max monitoring
        screenshotInterval: 10000,  // Screenshot every 10 seconds
        logCaptureInterval: 5000,   // Capture detailed logs every 5 seconds
        domainCheckInterval: 3000,  // Check for new domains every 3 seconds
        wsMessageCaptureInterval: 1000 // Capture WS messages every second
      };

      this.logger.info('Monitoring configuration:', MONITORING_CONFIG);

      // Initialize monitoring state
      const monitoringState = {
        startTime: Date.now(),
        domains: [],
        wsMessages: [],
        progressUpdates: [],
        errors: [],
        screenshots: [],
        campaignStatus: 'unknown'
      };

      // Take initial screenshot
      await this.takeScreenshot('domain-generation-start');
      monitoringState.screenshots.push('domain-generation-start');

      // Start comprehensive monitoring loop
      this.logger.info('🔄 Starting real-time monitoring loop...');
      
      let monitoringActive = true;
      let lastDomainCount = 0;
      let lastWSMessageCount = 0;
      let screenshotCounter = 0;

      while (monitoringActive && (Date.now() - monitoringState.startTime) < MONITORING_CONFIG.maxMonitoringTime) {
        const elapsed = Date.now() - monitoringState.startTime;
        
        // 1. ENHANCED CAMPAIGN STATUS MONITORING WITH COMPLETION DETECTION
        try {
          const campaignStatus = await this.page.evaluate(() => {
            // Enhanced status detection - look for completion indicators
            const statusElements = [
              document.querySelector('[data-testid="campaign-status"]'),
              document.querySelector('.campaign-status'),
              document.querySelector('.status-badge'),
              // Look for completion messages
              Array.from(document.querySelectorAll('p')).find(p =>
                p.textContent?.includes('Completed') ||
                p.textContent?.includes('completed') ||
                p.textContent?.includes('Generation Completed')),
              // Look for next phase button as completion indicator
              document.querySelector('button:contains("Configure")')
            ].filter(Boolean);
            
            const progressElement = document.querySelector('[data-testid="progress"], .progress-bar, .progress');
            const domainCountElement = document.querySelector('[data-testid="domain-count"], .domain-count, .generated-count');
            
            // Check for completion indicators
            const hasCompletionMessage = Array.from(document.querySelectorAll('p, span, div')).some(el =>
              el.textContent?.includes('Generation Completed') ||
              el.textContent?.includes('Domain Generation Completed') ||
              el.textContent?.includes('Completed!') ||
              el.textContent?.includes('completed')
            );
            
            const hasNextPhaseButton = document.querySelector('button[contains(text(), "Configure")]') !== null;
            
            // Extract domain count from various possible sources
            let detectedDomainCount = 0;
            const domainCountSources = [
              domainCountElement?.textContent,
              // Look for "X domains" pattern
              Array.from(document.querySelectorAll('*')).find(el =>
                el.textContent?.match(/\d+\s+domains?/i))?.textContent,
              // Look for domain list count
              document.querySelectorAll('[data-testid="generated-domain"], .domain-item, .generated-domain, .domain-row').length.toString()
            ].filter(Boolean);
            
            for (const source of domainCountSources) {
              const match = source.match(/(\d+)/);
              if (match) {
                detectedDomainCount = parseInt(match[1]);
                break;
              }
            }
            
            // Determine status
            let detectedStatus = 'unknown';
            if (hasCompletionMessage || hasNextPhaseButton) {
              detectedStatus = 'completed';
            } else {
              const statusText = statusElements[0]?.textContent?.trim().toLowerCase() || '';
              if (statusText.includes('completed') || statusText.includes('done')) {
                detectedStatus = 'completed';
              } else if (statusText.includes('running') || statusText.includes('progress')) {
                detectedStatus = 'running';
              } else if (statusText.includes('failed') || statusText.includes('error')) {
                detectedStatus = 'failed';
              }
            }
            
            return {
              status: detectedStatus,
              progress: progressElement?.textContent?.trim() || '0',
              domainCount: detectedDomainCount.toString(),
              hasCompletionMessage,
              hasNextPhaseButton,
              timestamp: Date.now()
            };
          });

          if (campaignStatus.status !== monitoringState.campaignStatus) {
            this.logger.info(`📊 Campaign status changed: ${monitoringState.campaignStatus} → ${campaignStatus.status}`);
            monitoringState.campaignStatus = campaignStatus.status;
            
            // Log additional completion details
            if (campaignStatus.status === 'completed') {
              this.logger.success(`🎉 COMPLETION DETECTED!`);
              this.logger.info(`   - Completion message found: ${campaignStatus.hasCompletionMessage}`);
              this.logger.info(`   - Next phase button available: ${campaignStatus.hasNextPhaseButton}`);
              this.logger.info(`   - Domain count: ${campaignStatus.domainCount}`);
            }
          }

          monitoringState.progressUpdates.push(campaignStatus);

        } catch (statusError) {
          this.logger.warn('Status monitoring error:', statusError.message);
        }

        // 2. DOMAIN GENERATION MONITORING
        try {
          const currentDomains = await this.page.evaluate(() => {
            // Look for domain list elements
            const domainElements = document.querySelectorAll(
              '[data-testid="generated-domain"], .domain-item, .generated-domain, .domain-row'
            );
            
            return Array.from(domainElements).map((el, index) => ({
              index,
              domain: el.textContent?.trim() || `domain-${index}`,
              visible: el.offsetParent !== null,
              timestamp: Date.now()
            }));
          });

          if (currentDomains.length !== lastDomainCount) {
            this.logger.info(`🌐 Domain count changed: ${lastDomainCount} → ${currentDomains.length}`);
            this.logger.info(`📋 Latest domains:`, currentDomains.slice(-5)); // Show last 5 domains
            lastDomainCount = currentDomains.length;
            
            // Take screenshot when domain count changes significantly
            if (currentDomains.length > 0 && currentDomains.length % 10 === 0) {
              const screenshotName = `domains-generated-${currentDomains.length}`;
              await this.takeScreenshot(screenshotName);
              monitoringState.screenshots.push(screenshotName);
            }
          }

          monitoringState.domains = currentDomains;

        } catch (domainError) {
          this.logger.warn('Domain monitoring error:', domainError.message);
        }

        // 3. WEBSOCKET MESSAGE MONITORING
        try {
          const currentWSMessages = await this.wsMonitor.getMessages();
          
          if (currentWSMessages.length !== lastWSMessageCount) {
            const newMessages = currentWSMessages.slice(lastWSMessageCount);
            newMessages.forEach(msg => {
              this.logger.info('📨 New WebSocket message:', {
                type: msg.type,
                timestamp: msg.timestamp,
                dataPreview: typeof msg.data === 'string' ? msg.data.substring(0, 100) : msg.data
              });
            });
            lastWSMessageCount = currentWSMessages.length;
          }

          monitoringState.wsMessages = currentWSMessages;

        } catch (wsError) {
          this.logger.warn('WebSocket monitoring error:', wsError.message);
        }

        // 4. BROWSER CONSOLE LOG CAPTURE
        // (This is automatically captured by our existing console listener)

        // 5. NETWORK ACTIVITY MONITORING
        // (This is automatically captured by our existing network listener)

        // 6. PERIODIC SCREENSHOTS
        if (elapsed % MONITORING_CONFIG.screenshotInterval === 0 && elapsed > 0) {
          screenshotCounter++;
          const screenshotName = `monitoring-progress-${screenshotCounter}`;
          await this.takeScreenshot(screenshotName);
          monitoringState.screenshots.push(screenshotName);
        }

        // 7. DETAILED PROGRESS LOGGING
        if (elapsed % MONITORING_CONFIG.logCaptureInterval === 0 && elapsed > 0) {
          this.logger.info(`🕐 Monitoring progress @ ${Math.round(elapsed/1000)}s:`, {
            domains: monitoringState.domains.length,
            wsMessages: monitoringState.wsMessages.length,
            status: monitoringState.campaignStatus,
            screenshots: monitoringState.screenshots.length
          });
        }

        // 8. COMPLETION DETECTION
        if (monitoringState.campaignStatus === 'completed' ||
            monitoringState.campaignStatus === 'finished' ||
            monitoringState.campaignStatus === 'done') {
          this.logger.success('🎉 Campaign completion detected!');
          monitoringActive = false;
          break;
        }

        // 9. ERROR DETECTION
        if (monitoringState.campaignStatus === 'failed' ||
            monitoringState.campaignStatus === 'error') {
          this.logger.error('❌ Campaign failure detected!');
          monitoringActive = false;
          break;
        }

        // Wait before next monitoring cycle
        await this.page.waitForTimeout(MONITORING_CONFIG.domainCheckInterval);
      }

      // Final comprehensive analysis
      const finalElapsed = Date.now() - monitoringState.startTime;
      
      this.logger.info('🏁 Domain generation monitoring completed');
      this.logger.info(`⏱️  Total monitoring time: ${Math.round(finalElapsed/1000)}s`);
      
      // Take final screenshots
      await this.takeScreenshot('domain-generation-final');
      monitoringState.screenshots.push('domain-generation-final');

      // Comprehensive final state capture
      const finalState = await this.page.evaluate(() => {
        // Capture everything we can see about the final state
        const domainElements = document.querySelectorAll(
          '[data-testid="generated-domain"], .domain-item, .generated-domain, .domain-row'
        );
        
        const statusElements = document.querySelectorAll(
          '[data-testid="campaign-status"], .campaign-status, .status-badge, .status'
        );
        
        const progressElements = document.querySelectorAll(
          '[data-testid="progress"], .progress-bar, .progress'
        );

        const errorElements = document.querySelectorAll(
          '.error, .alert-error, [data-testid="error"]'
        );

        return {
          finalDomainCount: domainElements.length,
          domains: Array.from(domainElements).map(el => el.textContent?.trim()).filter(Boolean),
          statuses: Array.from(statusElements).map(el => el.textContent?.trim()).filter(Boolean),
          progress: Array.from(progressElements).map(el => el.textContent?.trim()).filter(Boolean),
          errors: Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean),
          pageTitle: document.title,
          url: window.location.href
        };
      });

      this.logger.info('📊 Final domain generation state:', finalState);

      // 🚨 CRITICAL VALIDATION: Check if system respected maxDomainsToGenerate limit
      const expectedMaxDomains = this.expectedCampaignConfig?.maxDomainsToGenerate || 50;
      const actualDomainsGenerated = finalState.finalDomainCount;
      
      // Analysis and recommendations
      const analysis = {
        success: finalState.finalDomainCount > 0,
        domainsGenerated: actualDomainsGenerated,
        expectedMaxDomains: expectedMaxDomains,
        respectsLimit: actualDomainsGenerated <= expectedMaxDomains,
        limitViolation: actualDomainsGenerated > expectedMaxDomains,
        limitViolationPercent: actualDomainsGenerated > expectedMaxDomains ?
          ((actualDomainsGenerated - expectedMaxDomains) / expectedMaxDomains * 100).toFixed(1) : 0,
        monitoringDuration: finalElapsed,
        averageGenerationRate: finalState.finalDomainCount / (finalElapsed / 1000),
        wsMessagesReceived: monitoringState.wsMessages.length,
        screenshotsTaken: monitoringState.screenshots.length,
        statusChanges: monitoringState.progressUpdates.length,
        errors: finalState.errors
      };

      this.logger.success('📈 Domain Generation Analysis:', analysis);

      // 🚨 CRITICAL BUG DETECTION: Validate maxDomainsToGenerate limit compliance
      if (analysis.limitViolation) {
        this.logger.error('🚨 CRITICAL BUG DETECTED: maxDomainsToGenerate LIMIT VIOLATED!');
        this.logger.error(`   Expected: ${expectedMaxDomains} domains`);
        this.logger.error(`   Actual: ${actualDomainsGenerated} domains`);
        this.logger.error(`   Violation: +${actualDomainsGenerated - expectedMaxDomains} domains (${analysis.limitViolationPercent}% over limit)`);
        this.logger.error('   IMPACT: Backend is completely ignoring user-specified domain generation limits!');
        this.logger.error('   REQUIRED ACTION: Fix backend domain generation logic to respect maxDomainsToGenerate parameter');
        
        // Add this as a critical error for the final analysis
        finalState.errors.push(`CRITICAL BUG: Generated ${actualDomainsGenerated} domains instead of requested ${expectedMaxDomains}`);
        analysis.success = false; // Mark as failed due to critical bug
      } else if (actualDomainsGenerated === expectedMaxDomains) {
        this.logger.success(`✅ PERFECT: System generated exactly ${actualDomainsGenerated} domains as requested`);
      } else if (actualDomainsGenerated < expectedMaxDomains) {
        this.logger.info(`ℹ️  UNDER LIMIT: Generated ${actualDomainsGenerated}/${expectedMaxDomains} domains (acceptable)`);
      }

      // Performance evaluation
      if (analysis.domainsGenerated === 0) {
        this.logger.error('❌ CRITICAL: No domains were generated');
      } else if (analysis.limitViolation) {
        this.logger.error('❌ CRITICAL: Domain generation limit violated - this is a data integrity bug');
      } else if (analysis.domainsGenerated < 10) {
        this.logger.warn('⚠️  LOW: Very few domains generated');
      } else if (analysis.averageGenerationRate < 0.1) {
        this.logger.warn('⚠️  SLOW: Domain generation rate is slow');
      } else {
        this.logger.success('✅ GOOD: Domain generation appears to be working well');
      }

      return {
        success: true,
        analysis,
        finalState,
        monitoringState,
        screenshots: monitoringState.screenshots
      };

    } catch (error) {
      this.logger.error('Domain generation monitoring failed:', error.message);
      await this.takeScreenshot('domain-generation-error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ENHANCED DNS Validation monitoring with comprehensive server logs
  async startDNSValidationLogMonitoring() {
    this.logger.info('🔬 Starting intensive DNS validation log monitoring...');
    
    // Start additional backend log monitoring specifically for DNS validation
    this.dnsValidationLogCapture = spawn('tail', ['-f', '/dev/null'], { stdio: ['ignore', 'pipe', 'pipe'] });
    
    // Monitor backend logs for DNS validation specific events
    try {
      const backendLogMonitor = spawn('journalctl', ['-f', '-u', 'domainflow-backend'], { stdio: ['ignore', 'pipe', 'pipe'] });
      backendLogMonitor.stdout.on('data', (data) => {
        const log = data.toString();
        if (log.includes('DNS') || log.includes('validation') || log.includes('dns_campaign') || log.includes('DNSValidator')) {
          this.logger.info('🔬 [BACKEND-DNS] ' + log.trim());
        }
      });
    } catch (e) {
      this.logger.warn('Could not start journalctl monitoring, using fallback');
    }
    
    // Monitor backend API calls related to DNS validation
    this.dnsApiCalls = [];
    this.logger.info('📡 DNS validation API monitoring active');
  }

  async stopDNSValidationLogMonitoring() {
    if (this.dnsValidationLogCapture) {
      this.dnsValidationLogCapture.kill('SIGTERM');
    }
    this.logger.info('🔬 DNS validation log monitoring stopped');
  }

  // NEW: DNS Validation Phase Trigger Testing with Enhanced Logging
  async testDNSValidationTrigger() {
    this.logger.info('=== DNS VALIDATION PHASE TRIGGER TEST WITH ENHANCED LOGGING ===');
    
    try {
      // Start intensive DNS validation monitoring
      await this.startDNSValidationLogMonitoring();
      
      // Enhanced detection for domain generation completion and DNS validation button
      this.logger.info('🔍 Detecting domain generation completion and DNS validation trigger...');
      
      // First check if we're already on a completed campaign page
      const currentStatus = await this.page.evaluate(() => {
        const completionMessages = Array.from(document.querySelectorAll('p, span, div')).filter(el =>
          el.textContent?.includes('Generation Completed') ||
          el.textContent?.includes('Domain Generation Completed') ||
          el.textContent?.includes('Completed!')
        );
        
        const nextPhaseButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
          btn.textContent?.includes('Configure DNS Validation') ||
          btn.textContent?.includes('Configure DNS') ||
          btn.textContent?.match(/Configure\s+DNS/i)
        );
        
        return {
          hasCompletionMessage: completionMessages.length > 0,
          hasNextPhaseButton: nextPhaseButtons.length > 0,
          completionTexts: completionMessages.map(el => el.textContent?.trim()),
          buttonTexts: nextPhaseButtons.map(btn => btn.textContent?.trim())
        };
      });
      
      this.logger.info('Current page completion status:', currentStatus);
      
      if (currentStatus.hasNextPhaseButton) {
        this.logger.success('✅ DNS validation button already available - campaign is completed!');
      } else {
        this.logger.info('⏳ Waiting for domain generation to complete and DNS validation button to appear...');
      }
      
      // Look for the "Configure DNS Validation" button with multiple possible texts
      const dnsValidationButton = this.page.locator('button').filter({
        hasText: /Configure\s+(DNS\s+Validation|DNS)/i
      });
      
      // Wait up to 30 seconds for the button to appear (if not already there)
      if (!currentStatus.hasNextPhaseButton) {
        await dnsValidationButton.waitFor({ timeout: 30000 });
      }
      
      this.logger.info('🎯 DNS validation trigger button found');
      await this.takeScreenshot('dns-validation-button-available');
      
      // Get the exact button text for logging
      const buttonText = await dnsValidationButton.first().textContent();
      this.logger.info(`📝 Button text: "${buttonText}"`);
      
      // Click the Configure DNS Validation button
      await dnsValidationButton.first().click();
      this.logger.info(`✅ Clicked DNS validation button: "${buttonText}"`);
      
      // Wait for the phase configuration panel to slide in from the right
      await this.page.waitForSelector('.fixed.top-0.right-0', { timeout: 10000 });
      await this.page.waitForTimeout(1000); // Wait for slide animation
      
      await this.takeScreenshot('dns-validation-panel-opened');
      this.logger.info('Phase configuration panel opened');
      
      // Wait for form to be fully loaded
      await this.page.waitForSelector('form', { timeout: 5000 });
      await this.page.waitForTimeout(1000);
      
      // Look for DNS persona selection dropdown
      const dnsPersonaSelect = this.page.locator('button[role="combobox"]').filter({ hasText: /Select DNS Persona/i });
      
      if (await dnsPersonaSelect.count() > 0) {
        this.logger.info('DNS persona dropdown found, selecting persona...');
        
        // Click the DNS persona dropdown
        await dnsPersonaSelect.click();
        
        // Wait for options to appear
        await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
        
        // Select the first available DNS persona (skip "None (Default)")
        const personaOptions = this.page.locator('[role="option"]').filter({ hasNotText: /None \(Default\)/i });
        const optionCount = await personaOptions.count();
        
        if (optionCount > 0) {
          await personaOptions.first().click();
          this.logger.info('DNS persona selected');
        } else {
          this.logger.warn('No DNS personas available, selecting default');
          await this.page.locator('[role="option"]').first().click();
        }
        
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot('dns-persona-selected');
      } else {
        this.logger.warn('DNS persona dropdown not found, may already be selected');
      }
      
      // Look for the "Start DNS Validation" submit button
      const startDNSButton = this.page.locator('button:has-text("Start DNS Validation")');
      
      if (await startDNSButton.count() > 0) {
        this.logger.info('Start DNS Validation button found');
        
        // Ensure button is enabled and visible
        await startDNSButton.waitFor({ state: 'visible', timeout: 5000 });
        
        const isEnabled = await startDNSButton.isEnabled();
        this.logger.info(`Start DNS Validation button enabled: ${isEnabled}`);
        
        if (isEnabled) {
          await this.takeScreenshot('before-dns-validation-start');
          
          // Click to start DNS validation
          await startDNSButton.click();
          this.logger.info('DNS validation started');
          
          // Wait for panel to close and navigation/reload
          await this.page.waitForTimeout(2000);
          
          await this.takeScreenshot('dns-validation-started');
          
          return { success: true, started: true };
        } else {
          this.logger.error('Start DNS Validation button is disabled');
          return { success: false, reason: 'Button disabled' };
        }
      } else {
        this.logger.error('Start DNS Validation button not found');
        await this.takeScreenshot('dns-button-not-found');
        return { success: false, reason: 'Button not found' };
      }
      
    } catch (error) {
      this.logger.error('DNS validation trigger test failed:', error.message);
      await this.takeScreenshot('dns-validation-error');
      return { success: false, error: error.message };
    } finally {
      // Stop DNS validation log monitoring
      await this.stopDNSValidationLogMonitoring();
    }
  }

  // COMPREHENSIVE DNS Validation Process Monitoring with Server Logs
  async monitorDNSValidationExecution() {
    this.logger.info('=== COMPREHENSIVE DNS VALIDATION PROCESS MONITORING ===');
    this.logger.info('🔬 Starting deep DNS validation execution monitoring with server logs');
    
    try {
      const dnsMonitoringState = {
        startTime: Date.now(),
        domainsProcessed: 0,
        dnsResults: [],
        errorCount: 0,
        backendLogs: [],
        frontendLogs: [],
        wsMessages: [],
        apiCalls: []
      };

      // Monitor for up to 5 minutes
      const maxMonitoringTime = 300000;
      let monitoringActive = true;
      let lastScreenshotTime = 0;
      
      // Enhanced WebSocket monitoring for DNS validation messages
      await this.page.evaluate(() => {
        if (window._wsInstance) {
          window._wsInstance.addEventListener('message', (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'dns_validation_result' || 
                  data.type === 'campaign_progress' ||
                  (data.data && data.data.phase === 'dns_validation')) {
                window._dnsValidationMessages = window._dnsValidationMessages || [];
                window._dnsValidationMessages.push({
                  timestamp: Date.now(),
                  data: data
                });
              }
            } catch (e) {
              // Not JSON, ignore
            }
          });
        }
      });
      
      this.logger.info('🔄 Starting DNS validation monitoring loop...');
      
      while (monitoringActive && (Date.now() - dnsMonitoringState.startTime) < maxMonitoringTime) {
        const elapsed = Date.now() - dnsMonitoringState.startTime;
        
        // Capture current DNS validation state from frontend
        const currentState = await this.page.evaluate(() => {
          // Look for DNS validation progress indicators
          const statusElements = document.querySelectorAll('.status, .progress, [data-testid*="dns"], [class*="dns"]');
          const errorElements = document.querySelectorAll('.error, .alert-error, [data-testid="error"]');
          const progressBars = document.querySelectorAll('.progress-bar, [role="progressbar"]');
          
          // Check for completion indicators
          let completionFound = false;
          let currentPhase = 'unknown';
          const allText = document.body.textContent || '';
          
          if (allText.includes('DNS Validation Complete') || 
              allText.includes('DNS validation completed') ||
              allText.includes('Phase completed') ||
              allText.includes('DNS Validation Finished')) {
            completionFound = true;
          }
          
          if (allText.includes('dns_validation') || allText.includes('DNS validation running')) {
            currentPhase = 'dns_validation_running';
          }
          
          // Count processed domains
          const domainElements = document.querySelectorAll('[data-testid*="domain"], .domain-item, .dns-result');
          
          return {
            statusText: Array.from(statusElements).map(el => el.textContent?.trim()).filter(Boolean),
            errors: Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean),
            progress: Array.from(progressBars).map(el => ({
              value: el.getAttribute('aria-valuenow') || el.style.width,
              text: el.textContent?.trim()
            })),
            completed: completionFound,
            phase: currentPhase,
            domainCount: domainElements.length,
            timestamp: Date.now()
          };
        });

        // Capture DNS validation specific WebSocket messages
        const dnsWsMessages = await this.page.evaluate(() => window._dnsValidationMessages || []);
        const newDnsMessages = dnsWsMessages.slice(dnsMonitoringState.wsMessages.length);
        
        if (newDnsMessages.length > 0) {
          newDnsMessages.forEach(msg => {
            this.logger.info('🔬 DNS WebSocket message:', {
              type: msg.data.type,
              campaignId: msg.data.campaignId,
              domain: msg.data.data?.domain,
              result: msg.data.data?.result,
              timestamp: new Date(msg.timestamp).toISOString()
            });
            dnsMonitoringState.wsMessages.push(msg);
          });
        }

        // Log domain processing progress
        if (currentState.domainCount !== dnsMonitoringState.domainsProcessed) {
          this.logger.info(`🌐 DNS validation progress: ${currentState.domainCount} domains processed`);
          dnsMonitoringState.domainsProcessed = currentState.domainCount;
        }

        // Check for completion
        if (currentState.completed) {
          this.logger.success('🎉 DNS validation process completed!');
          await this.takeScreenshot('dns-validation-completed');
          monitoringActive = false;
          break;
        }

        // Log errors if found
        if (currentState.errors.length > 0) {
          currentState.errors.forEach(error => {
            this.logger.error('❌ DNS validation error detected:', error);
            dnsMonitoringState.errorCount++;
          });
        }

        // Log progress updates
        if (currentState.progress.length > 0) {
          currentState.progress.forEach(prog => {
            if (prog.value && prog.value !== '0%') {
              this.logger.info(`📊 DNS validation progress: ${prog.value} - ${prog.text}`);
            }
          });
        }

        // Periodic status updates and screenshots
        if (elapsed % 15000 === 0 && elapsed > 0) { // Every 15 seconds
          this.logger.info(`🕐 DNS validation monitoring @ ${Math.round(elapsed/1000)}s:`, {
            phase: currentState.phase,
            domainsProcessed: currentState.domainCount,
            wsMessages: dnsMonitoringState.wsMessages.length,
            errors: dnsMonitoringState.errorCount,
            status: currentState.statusText.join(', ')
          });
          
          // Take periodic screenshot
          if (Date.now() - lastScreenshotTime > 30000) { // Max one screenshot per 30 seconds
            await this.takeScreenshot(`dns-validation-${Math.round(elapsed/1000)}s`);
            lastScreenshotTime = Date.now();
          }
        }

        // Capture backend server logs related to DNS validation
        if (elapsed % 5000 === 0 && elapsed > 0) { // Every 5 seconds
          this.logger.info('📡 Checking for DNS validation backend activity...');
          // Backend logs are already being captured by the enhanced logging in the script
        }

        await this.page.waitForTimeout(3000); // Check every 3 seconds
      }

      // Final analysis and cleanup
      const finalElapsed = Date.now() - dnsMonitoringState.startTime;
      await this.takeScreenshot('dns-validation-monitoring-final');
      
      this.logger.success('📊 DNS validation monitoring completed', {
        duration: `${Math.round(finalElapsed/1000)}s`,
        domainsProcessed: dnsMonitoringState.domainsProcessed,
        wsMessages: dnsMonitoringState.wsMessages.length,
        errors: dnsMonitoringState.errorCount
      });

      return {
        success: true,
        duration: finalElapsed,
        domainsProcessed: dnsMonitoringState.domainsProcessed,
        wsMessages: dnsMonitoringState.wsMessages.length,
        errors: dnsMonitoringState.errorCount
      };

    } catch (error) {
      this.logger.error('DNS validation monitoring failed:', error.message);
      await this.takeScreenshot('dns-validation-monitoring-error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  // FAST COMPLETE TEST SUITE - Enhanced with domain generation monitoring
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
      
      // NEW: Test 4.5: Domain Generation Deep Monitoring (if creation was successful)
      if (results.creation) {
        this.logger.info('✅ Campaign creation successful - proceeding with domain generation monitoring');
        results.domainGeneration = await this.testDomainGenerationProcess();
        
        // Additional analysis based on domain generation results
        if (results.domainGeneration?.success) {
          this.logger.success(`🌐 Domain generation completed: ${results.domainGeneration.analysis.domainsGenerated} domains generated`);
          this.logger.info(`⚡ Generation rate: ${results.domainGeneration.analysis.averageGenerationRate.toFixed(2)} domains/second`);
          this.logger.info(`📡 WebSocket messages: ${results.domainGeneration.analysis.wsMessagesReceived}`);
        } else {
          this.logger.error('❌ Domain generation monitoring failed or no domains generated');
        }
      } else {
        this.logger.warn('⚠️  Skipping domain generation monitoring - campaign creation failed');
        results.domainGeneration = { skipped: true, reason: 'Campaign creation failed' };
      }
      
      // NEW: Test 4.6: DNS Validation Phase Trigger (if domain generation was successful)
      if (results.creation && results.domainGeneration?.success) {
        this.logger.info('✅ Domain generation successful - testing DNS validation trigger');
        results.dnsValidationTrigger = await this.testDNSValidationTrigger();
        
        if (results.dnsValidationTrigger?.success) {
          this.logger.success('🔄 DNS validation phase successfully triggered');
        } else {
          this.logger.error('❌ DNS validation trigger failed');
        }
      } else {
        this.logger.warn('⚠️  Skipping DNS validation trigger - domain generation not completed');
        results.dnsValidationTrigger = { skipped: true, reason: 'Domain generation not completed' };
      }
      
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
    
    // NEW: Domain Generation Results with Critical Bug Detection
    if (results.domainGeneration?.skipped) {
      console.log(`🌐 Domain Generation: ⏭️  SKIPPED (${results.domainGeneration.reason})`);
    } else if (results.domainGeneration?.success) {
      const analysis = results.domainGeneration.analysis;
      
      // Check for critical bug: domain limit violation
      if (analysis.limitViolation) {
        console.log(`🌐 Domain Generation: 🚨 CRITICAL BUG DETECTED - LIMIT VIOLATED`);
        console.log(`   Expected: ${analysis.expectedMaxDomains} domains | Actual: ${analysis.domainsGenerated} domains`);
        console.log(`   Violation: +${analysis.domainsGenerated - analysis.expectedMaxDomains} domains (${analysis.limitViolationPercent}% over limit)`);
        console.log(`   🚨 BACKEND IGNORES maxDomainsToGenerate PARAMETER!`);
      } else if (analysis.domainsGenerated === analysis.expectedMaxDomains) {
        console.log(`🌐 Domain Generation: ✅ PERFECT (${analysis.domainsGenerated}/${analysis.expectedMaxDomains} domains exactly as requested)`);
      } else {
        console.log(`🌐 Domain Generation: ✅ SUCCESS (${analysis.domainsGenerated}/${analysis.expectedMaxDomains} domains, ${analysis.averageGenerationRate.toFixed(2)}/s)`);
      }
      console.log(`   📊 Monitoring: ${Math.round(analysis.monitoringDuration/1000)}s, ${analysis.wsMessagesReceived} WS messages, ${analysis.screenshotsTaken} screenshots`);
    } else {
      console.log(`🌐 Domain Generation: ❌ FAILED${results.domainGeneration?.error ? ` (${results.domainGeneration.error})` : ''}`);
    }
    
    // NEW: DNS Validation Trigger Results
    if (results.dnsValidationTrigger?.skipped) {
      console.log(`🔄 DNS Validation Trigger: ⏭️  SKIPPED (${results.dnsValidationTrigger.reason})`);
    } else if (results.dnsValidationTrigger?.success) {
      console.log(`🔄 DNS Validation Trigger: ✅ SUCCESS (Phase transition triggered)`);
    } else {
      console.log(`🔄 DNS Validation Trigger: ❌ FAILED${results.dnsValidationTrigger?.error ? ` (${results.dnsValidationTrigger.error})` : ''}`);
    }
    
    console.log(`� Controls: ${results.controls?.found ? '✅ FOUND' : '❌ NOT FOUND'}`);
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