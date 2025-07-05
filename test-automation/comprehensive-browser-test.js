#!/usr/bin/env node

/**
 * Comprehensive Browser Testing Script for DomainFlow Campaign System
 * 
 * This script provides comprehensive automated testing of the complete campaign workflow
 * with advanced debugging, logging, and performance monitoring capabilities.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8080',
  headless: false, // Set to true for CI/CD environments
  slowMo: 100, // Slow down actions for better visibility
  timeout: 30000,
  screenshotDir: './test-automation/screenshots',
  logDir: './test-automation/logs',
  defaultViewport: { width: 1920, height: 1080 },
  mobileViewport: { width: 375, height: 667 },
  tabletViewport: { width: 768, height: 1024 }
};

// Test credentials
const TEST_CREDENTIALS = {
  username: 'test@example.com',
  password: 'password123'
};

// Test utilities
class TestLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    const logEntry = {
      timestamp,
      elapsed,
      level,
      message,
      data
    };
    this.logs.push(logEntry);
    console.log(`[${timestamp}] [${elapsed}ms] [${level.toUpperCase()}] ${message}`);
    if (data) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  success(message, data) { this.log('success', message, data); }

  async saveLogs() {
    await fs.mkdir(CONFIG.logDir, { recursive: true });
    const filename = `test-run-${Date.now()}.json`;
    await fs.writeFile(
      path.join(CONFIG.logDir, filename),
      JSON.stringify(this.logs, null, 2)
    );
    return filename;
  }
}

class PerformanceMonitor {
  constructor(page) {
    this.page = page;
    this.metrics = [];
  }

  async captureMetrics(label) {
    const performanceMetrics = await this.page.metrics();
    const memoryInfo = await this.page.evaluate(() => {
      return {
        usedJSSize: performance.memory?.usedJSSize || 0,
        totalJSSize: performance.memory?.totalJSSize || 0,
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0
      };
    });

    const metric = {
      timestamp: Date.now(),
      label,
      ...performanceMetrics,
      memory: memoryInfo
    };

    this.metrics.push(metric);
    return metric;
  }

  getReport() {
    return {
      metrics: this.metrics,
      summary: {
        totalSamples: this.metrics.length,
        avgTaskDuration: this.metrics.reduce((sum, m) => sum + m.TaskDuration, 0) / this.metrics.length,
        maxMemoryUsed: Math.max(...this.metrics.map(m => m.memory.usedJSSize)),
        avgMemoryUsed: this.metrics.reduce((sum, m) => sum + m.memory.usedJSSize, 0) / this.metrics.length
      }
    };
  }
}

class WebSocketMonitor {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.messages = [];
    this.connectionState = 'disconnected';
  }

  async startMonitoring() {
    // Monitor WebSocket connections and messages
    await this.page.evaluateOnNewDocument(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        
        // Store reference for testing
        window._wsInstance = ws;
        window._wsMessages = [];
        window._wsConnectionState = 'connecting';

        ws.addEventListener('open', (event) => {
          window._wsConnectionState = 'connected';
          window._wsMessages.push({
            type: 'connection',
            state: 'open',
            timestamp: Date.now()
          });
        });

        ws.addEventListener('message', (event) => {
          window._wsMessages.push({
            type: 'message',
            data: event.data,
            timestamp: Date.now()
          });
        });

        ws.addEventListener('close', (event) => {
          window._wsConnectionState = 'closed';
          window._wsMessages.push({
            type: 'connection',
            state: 'closed',
            code: event.code,
            reason: event.reason,
            timestamp: Date.now()
          });
        });

        ws.addEventListener('error', (event) => {
          window._wsConnectionState = 'error';
          window._wsMessages.push({
            type: 'error',
            timestamp: Date.now()
          });
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

  async waitForConnection(timeout = 10000) {
    this.logger.info('Waiting for WebSocket connection...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const state = await this.getConnectionState();
      if (state === 'connected') {
        this.logger.success('WebSocket connected successfully');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('WebSocket connection timeout');
  }

  async waitForMessages(count = 1, timeout = 10000) {
    this.logger.info(`Waiting for ${count} WebSocket messages...`);
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages();
      const dataMessages = messages.filter(m => m.type === 'message');
      if (dataMessages.length >= count) {
        this.logger.success(`Received ${dataMessages.length} WebSocket messages`);
        return dataMessages;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const messages = await this.getMessages();
    this.logger.warn(`Timeout waiting for messages. Received: ${messages.filter(m => m.type === 'message').length}/${count}`);
    return messages.filter(m => m.type === 'message');
  }
}

class BrowserTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.logger = new TestLogger();
    this.performanceMonitor = null;
    this.wsMonitor = null;
    this.screenshotCounter = 0;
  }

  async initialize() {
    this.logger.info('Initializing browser testing environment...');
    
    // Create directories
    await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
    await fs.mkdir(CONFIG.logDir, { recursive: true });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      defaultViewport: CONFIG.defaultViewport,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set up performance monitoring
    this.performanceMonitor = new PerformanceMonitor(this.page);
    this.wsMonitor = new WebSocketMonitor(this.page, this.logger);

    // Set up console logging
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      this.logger.info(`Browser Console [${type}]: ${text}`);
    });

    // Set up error handling
    this.page.on('pageerror', error => {
      this.logger.error('Page Error:', error.message);
    });

    // Set up network monitoring
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('websocket')) {
        this.logger.info(`API Request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });

    this.page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('websocket')) {
        this.logger.info(`API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Set up WebSocket monitoring
    await this.wsMonitor.startMonitoring();

    this.logger.success('Browser testing environment initialized');
  }

  async takeScreenshot(label) {
    const filename = `${String(++this.screenshotCounter).padStart(3, '0')}-${label}-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.logger.info(`Screenshot saved: ${filename}`);
    return filename;
  }

  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || CONFIG.timeout;
    this.logger.info(`Waiting for selector: ${selector}`);
    try {
      await this.page.waitForSelector(selector, { timeout, ...options });
      return true;
    } catch (error) {
      this.logger.error(`Selector not found: ${selector}`, error.message);
      await this.takeScreenshot(`selector-not-found-${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
      return false;
    }
  }

  async clickElement(selector, label = '') {
    this.logger.info(`Clicking element: ${selector} ${label}`);
    await this.page.click(selector);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for interaction
    await this.takeScreenshot(`after-click-${label || selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
  }

  async typeText(selector, text, label = '') {
    this.logger.info(`Typing text in: ${selector} ${label}`);
    await this.page.type(selector, text);
    await this.takeScreenshot(`after-type-${label || selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
  }

  // Test Methods

  async testLogin() {
    this.logger.info('=== TESTING LOGIN FLOW ===');
    
    await this.performanceMonitor.captureMetrics('before-login-page-load');
    
    // Navigate to login page
    this.logger.info('Navigating to login page...');
    await this.page.goto(`${CONFIG.frontendUrl}/login`, { waitUntil: 'networkidle0' });
    await this.takeScreenshot('login-page-loaded');
    await this.performanceMonitor.captureMetrics('after-login-page-load');

    // Check if login form exists
    const hasLoginForm = await this.waitForSelector('form');
    if (!hasLoginForm) {
      throw new Error('Login form not found');
    }

    // Fill login credentials
    await this.waitForSelector('input[name="username"], input[type="email"]');
    await this.typeText('input[name="username"], input[type="email"]', TEST_CREDENTIALS.username, 'username');
    
    await this.waitForSelector('input[name="password"], input[type="password"]');
    await this.typeText('input[name="password"], input[type="password"]', TEST_CREDENTIALS.password, 'password');

    // Submit login
    await this.clickElement('button[type="submit"], input[type="submit"]', 'login-submit');
    
    // Wait for redirect or success
    try {
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      await this.takeScreenshot('after-login-redirect');
      await this.performanceMonitor.captureMetrics('after-login-success');
      this.logger.success('Login successful - redirected');
    } catch (error) {
      // Check if we're still on login page or got an error
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        this.logger.error('Login failed - still on login page');
        await this.takeScreenshot('login-failed');
        throw new Error('Login failed');
      } else {
        this.logger.success('Login successful - no redirect');
        await this.takeScreenshot('login-success-no-redirect');
      }
    }
  }

  async testNavigationToCampaigns() {
    this.logger.info('=== TESTING NAVIGATION TO CAMPAIGNS ===');
    
    // Navigate to campaigns page
    this.logger.info('Navigating to campaigns page...');
    await this.page.goto(`${CONFIG.frontendUrl}/campaigns`, { waitUntil: 'networkidle0' });
    await this.takeScreenshot('campaigns-page-loaded');
    await this.performanceMonitor.captureMetrics('campaigns-page-loaded');

    // Wait for campaigns to load
    const hasCampaigns = await this.waitForSelector('[data-testid="campaign-list"], .campaign-item, table', { timeout: 10000 });
    if (hasCampaigns) {
      this.logger.success('Campaigns page loaded successfully');
    } else {
      this.logger.warn('No campaigns found or page structure different');
    }

    return hasCampaigns;
  }

  async testCampaignDetailsNavigation() {
    this.logger.info('=== TESTING CAMPAIGN DETAILS NAVIGATION ===');
    
    // Look for campaign links or buttons
    const campaignSelectors = [
      'a[href*="/campaigns/"]',
      '.campaign-item a',
      'table tbody tr a',
      '[data-testid="campaign-link"]'
    ];

    let campaignFound = false;
    let campaignId = null;

    for (const selector of campaignSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 2000 });
        this.logger.info(`Found campaign link with selector: ${selector}`);
        
        // Get campaign ID from href
        const href = await this.page.$eval(selector, el => el.href);
        const match = href.match(/\/campaigns\/([^\/\?]+)/);
        if (match) {
          campaignId = match[1];
          this.logger.info(`Found campaign ID: ${campaignId}`);
          await this.clickElement(selector, 'campaign-details');
          campaignFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    if (!campaignFound) {
      // Try to create a test campaign or navigate directly to a test ID
      this.logger.warn('No existing campaigns found, trying direct navigation...');
      const testCampaignId = 'test-campaign-123';
      await this.page.goto(`${CONFIG.frontendUrl}/campaigns/${testCampaignId}`, { waitUntil: 'networkidle0' });
      await this.takeScreenshot('direct-campaign-navigation');
      campaignId = testCampaignId;
    }

    // Wait for campaign details page to load
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('campaign-details-loaded');
    await this.performanceMonitor.captureMetrics('campaign-details-loaded');

    return campaignId;
  }

  async testWebSocketConnection() {
    this.logger.info('=== TESTING WEBSOCKET CONNECTION ===');
    
    // Wait for WebSocket connection to establish
    try {
      await this.wsMonitor.waitForConnection(15000);
      
      // Get connection state and messages
      const connectionState = await this.wsMonitor.getConnectionState();
      const messages = await this.wsMonitor.getMessages();
      
      this.logger.success(`WebSocket connection state: ${connectionState}`);
      this.logger.info(`Total WebSocket messages: ${messages.length}`);
      
      // Log message types
      const messageTypes = messages.reduce((acc, msg) => {
        acc[msg.type] = (acc[msg.type] || 0) + 1;
        return acc;
      }, {});
      this.logger.info('Message types:', messageTypes);

      await this.takeScreenshot('websocket-connected');
      return { connected: true, messages, connectionState };
      
    } catch (error) {
      this.logger.error('WebSocket connection failed:', error.message);
      await this.takeScreenshot('websocket-failed');
      return { connected: false, error: error.message };
    }
  }

  async testDomainStreaming() {
    this.logger.info('=== TESTING DOMAIN STREAMING ===');
    
    // Wait for initial messages
    const initialMessages = await this.wsMonitor.waitForMessages(1, 5000);
    
    // Look for domain streaming table or components
    const streamingSelectors = [
      '[data-testid="domain-streaming-table"]',
      '.domain-streaming',
      '.streaming-table',
      'table[data-streaming="true"]',
      '.domain-table'
    ];

    let streamingComponentFound = false;
    for (const selector of streamingSelectors) {
      const found = await this.waitForSelector(selector, { timeout: 2000 });
      if (found) {
        this.logger.success(`Found streaming component: ${selector}`);
        streamingComponentFound = true;
        await this.takeScreenshot('domain-streaming-component');
        break;
      }
    }

    // Monitor for streaming updates
    this.logger.info('Monitoring for streaming updates...');
    await this.page.waitForTimeout(5000); // Wait for potential streaming data
    
    const allMessages = await this.wsMonitor.getMessages();
    const dataMessages = allMessages.filter(msg => msg.type === 'message');
    
    this.logger.info(`Received ${dataMessages.length} data messages during streaming test`);
    
    // Check for domain data in messages
    let domainDataFound = false;
    for (const msg of dataMessages) {
      try {
        const data = JSON.parse(msg.data);
        if (data.domains || data.domain || data.url || (data.type && data.type.includes('domain'))) {
          domainDataFound = true;
          this.logger.success('Domain streaming data detected in WebSocket messages');
          break;
        }
      } catch (e) {
        // Not JSON or doesn't contain domain data
      }
    }

    await this.takeScreenshot('after-streaming-test');
    
    return {
      componentFound: streamingComponentFound,
      dataMessages: dataMessages.length,
      domainDataFound
    };
  }

  async testCampaignControls() {
    this.logger.info('=== TESTING CAMPAIGN CONTROLS ===');
    
    const controlSelectors = {
      start: ['[data-testid="start-campaign"]', 'button[title*="start"]', '.start-btn', 'button:contains("Start")'],
      pause: ['[data-testid="pause-campaign"]', 'button[title*="pause"]', '.pause-btn', 'button:contains("Pause")'],
      resume: ['[data-testid="resume-campaign"]', 'button[title*="resume"]', '.resume-btn', 'button:contains("Resume")'],
      stop: ['[data-testid="stop-campaign"]', 'button[title*="stop"]', '.stop-btn', 'button:contains("Stop")']
    };

    const results = {};

    for (const [action, selectors] of Object.entries(controlSelectors)) {
      this.logger.info(`Testing ${action} control...`);
      let controlFound = false;
      
      for (const selector of selectors) {
        try {
          const found = await this.waitForSelector(selector, { timeout: 2000 });
          if (found) {
            this.logger.success(`Found ${action} control: ${selector}`);
            
            // Check if button is enabled
            const isEnabled = await this.page.$eval(selector, el => !el.disabled);
            if (isEnabled) {
              await this.clickElement(selector, `${action}-control`);
              
              // Wait for potential state change
              await this.page.waitForTimeout(2000);
              
              // Monitor WebSocket messages for campaign state changes
              const messages = await this.wsMonitor.getMessages();
              const recentMessages = messages.filter(msg => 
                Date.now() - msg.timestamp < 5000 && msg.type === 'message'
              );
              
              this.logger.info(`${action} control clicked, ${recentMessages.length} recent messages`);
              controlFound = true;
              break;
            } else {
              this.logger.warn(`${action} control found but disabled`);
            }
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      results[action] = controlFound;
      if (!controlFound) {
        this.logger.warn(`${action} control not found or not functional`);
      }
    }

    await this.takeScreenshot('campaign-controls-tested');
    return results;
  }

  async testResponsiveDesign() {
    this.logger.info('=== TESTING RESPONSIVE DESIGN ===');
    
    const viewports = [
      { name: 'mobile', ...CONFIG.mobileViewport },
      { name: 'tablet', ...CONFIG.tabletViewport },
      { name: 'desktop', ...CONFIG.defaultViewport }
    ];

    const results = {};

    for (const viewport of viewports) {
      this.logger.info(`Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      await this.page.setViewport(viewport);
      await this.page.waitForTimeout(1000); // Allow layout to adjust
      
      await this.takeScreenshot(`responsive-${viewport.name}`);
      await this.performanceMonitor.captureMetrics(`responsive-${viewport.name}`);
      
      // Check for mobile-specific elements or layouts
      const mobileMenuExists = await this.page.$('.mobile-menu, .hamburger, [data-testid="mobile-menu"]') !== null;
      const sidebarVisible = await this.page.$('.sidebar:not([style*="display: none"])') !== null;
      
      results[viewport.name] = {
        viewport: viewport,
        mobileMenuExists,
        sidebarVisible,
        screenshot: `responsive-${viewport.name}`
      };
    }

    // Reset to desktop viewport
    await this.page.setViewport(CONFIG.defaultViewport);
    
    return results;
  }

  async testErrorScenarios() {
    this.logger.info('=== TESTING ERROR SCENARIOS ===');
    
    const results = {};

    // Test 1: Network interruption simulation
    this.logger.info('Testing network interruption...');
    await this.page.setOfflineMode(true);
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('offline-mode');
    
    // Check for offline indicators
    const offlineIndicator = await this.page.$('.offline, [data-offline="true"], .network-error') !== null;
    results.offlineHandling = offlineIndicator;
    
    await this.page.setOfflineMode(false);
    await this.page.waitForTimeout(3000); // Allow reconnection
    await this.takeScreenshot('back-online');

    // Test 2: Invalid campaign ID
    this.logger.info('Testing invalid campaign ID...');
    await this.page.goto(`${CONFIG.frontendUrl}/campaigns/invalid-campaign-123`, { waitUntil: 'networkidle0' });
    await this.takeScreenshot('invalid-campaign');
    
    const errorPageElements = await this.page.$$('.error, .not-found, [data-testid="error"]');
    results.invalidCampaignHandling = errorPageElements.length > 0;

    // Test 3: Unauthorized access (after logout)
    this.logger.info('Testing unauthorized access...');
    try {
      await this.page.goto(`${CONFIG.frontendUrl}/logout`, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(2000);
      await this.page.goto(`${CONFIG.frontendUrl}/campaigns`, { waitUntil: 'networkidle0' });
      await this.takeScreenshot('unauthorized-access');
      
      const redirectedToLogin = this.page.url().includes('/login');
      results.unauthorizedHandling = redirectedToLogin;
    } catch (error) {
      this.logger.warn('Error testing unauthorized access:', error.message);
      results.unauthorizedHandling = false;
    }

    return results;
  }

  async generateReport() {
    this.logger.info('=== GENERATING TEST REPORT ===');
    
    const performanceReport = this.performanceMonitor.getReport();
    const wsMessages = await this.wsMonitor.getMessages();
    const logFile = await this.logger.saveLogs();
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.logger.startTime,
      configuration: CONFIG,
      performance: performanceReport,
      websocket: {
        totalMessages: wsMessages.length,
        messageTypes: wsMessages.reduce((acc, msg) => {
          acc[msg.type] = (acc[msg.type] || 0) + 1;
          return acc;
        }, {}),
        messages: wsMessages
      },
      screenshots: this.screenshotCounter,
      logFile
    };

    const reportFile = `test-report-${Date.now()}.json`;
    await fs.writeFile(
      path.join(CONFIG.logDir, reportFile),
      JSON.stringify(report, null, 2)
    );

    this.logger.success(`Test report generated: ${reportFile}`);
    return report;
  }

  async runCompleteTest() {
    let testResults = {};
    
    try {
      await this.initialize();
      
      // Test authentication
      testResults.login = await this.testLogin();
      
      // Test navigation
      testResults.campaignsList = await this.testNavigationToCampaigns();
      const campaignId = await this.testCampaignDetailsNavigation();
      testResults.campaignDetails = { campaignId };
      
      // Test WebSocket functionality
      testResults.websocket = await this.testWebSocketConnection();
      
      // Test domain streaming
      testResults.domainStreaming = await this.testDomainStreaming();
      
      // Test campaign controls
      testResults.campaignControls = await this.testCampaignControls();
      
      // Test responsive design
      testResults.responsiveDesign = await this.testResponsiveDesign();
      
      // Test error scenarios
      testResults.errorScenarios = await this.testErrorScenarios();
      
      // Generate final report
      const report = await this.generateReport();
      testResults.report = report;
      
      this.logger.success('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
      
    } catch (error) {
      this.logger.error('Test execution failed:', error.message);
      await this.takeScreenshot('test-failure');
      testResults.error = error.message;
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
    
    return testResults;
  }
}

// Main execution
async function main() {
  const tester = new BrowserTester();
  
  try {
    console.log('🚀 Starting Comprehensive Browser Testing...');
    console.log(`📊 Configuration:`, CONFIG);
    console.log('=====================================\n');
    
    const results = await tester.runCompleteTest();
    
    console.log('\n=====================================');
    console.log('✅ Test Summary:');
    console.log('=====================================');
    console.log(`🔐 Login: ${results.login ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`📋 Campaigns List: ${results.campaignsList ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`🔗 WebSocket: ${results.websocket?.connected ? '✅ CONNECTED' : '❌ FAILED'}`);
    console.log(`📡 Domain Streaming: ${results.domainStreaming?.componentFound ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`🎮 Campaign Controls: ${Object.values(results.campaignControls || {}).some(v => v) ? '✅ SOME FOUND' : '❌ NONE FOUND'}`);
    console.log(`📱 Responsive Design: ✅ TESTED`);
    console.log(`⚠️  Error Handling: ✅ TESTED`);
    console.log('\n📊 Performance & logs saved to:', CONFIG.logDir);
    console.log('📸 Screenshots saved to:', CONFIG.screenshotDir);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BrowserTester, CONFIG };