#!/usr/bin/env node

/**
 * DomainFlow Campaign System - Automated Browser Testing & Debugging Script
 *
 * This script automates login, campaign navigation, and captures comprehensive
 * browser logs, network traffic, console output, backend logs, and frontend logs
 * for debugging React infinite loops and other campaign workflow issues.
 *
 * Features:
 * - Automated login and authentication flow
 * - Campaign list navigation and selection
 * - Campaign deletion operations with error handling
 * - "View Dashboard" button interaction testing
 * - Comprehensive network request/response logging
 * - Console error capture and analysis
 
 * - WebSocket message monitoring
 * - React error boundary detection
 * - Backend server log capture (Go API server)
 * - Frontend server log capture (Next.js dev server)
 * - Real-time log correlation and analysis
 *
 * Usage:
 *   node test-automation/campaign-flow-debugger.js [--headless] [--debug] [--capture-server-logs]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  loginUrl: 'http://localhost:3000/login',
  campaignsUrl: 'http://localhost:3000/campaigns',
  
  // Test credentials (adjust as needed)
  credentials: {
    email: 'admin@fntel.com',
    password: 'admin123'
  },
  
  // Browser settings
  browser: {
    headless: process.argv.includes('--headless'),
    devtools: process.argv.includes('--debug'),
    defaultViewport: { width: 1920, height: 1080 },
    slowMo: process.argv.includes('--debug') ? 100 : 0
  },
  
  // Server settings
  servers: {
    captureServerLogs: process.argv.includes('--capture-server-logs'),
    backend: {
      command: 'cd /home/vboxuser/studio/backend && ./bin/apiserver',
      cwd: '/home/vboxuser/studio/backend',
      port: 8080,
      healthEndpoint: 'http://localhost:8080/api/v2/health'
    },
    frontend: {
      command: 'npm run dev',
      cwd: '/home/vboxuser/studio',
      port: 3000,
      healthEndpoint: 'http://localhost:3000/api/health'
    }
  },
  
  // Timeouts (ms)
  timeout: {
    navigation: 30000,
    selector: 10000,
    action: 5000,
    serverStart: 60000
  },
  
  // Output paths
  output: {
    logs: './test-automation/debug-logs',
    reports: './test-automation/debug-reports',
    serverLogs: './test-automation/server-logs'
  }
};

// Ensure output directories exist
Object.values(CONFIG.output).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Server Log Capture Utility
 */
class ServerLogCapture {
  constructor(logger) {
    this.logger = logger;
    this.servers = new Map();
    this.logBuffers = new Map();
  }

  async startServer(name, config) {
    if (this.servers.has(name)) {
      this.logger.warn('SERVER', `Server ${name} is already running`);
      return;
    }

    this.logger.info('SERVER', `Starting ${name} server`, { command: config.command });

    const serverProcess = spawn('bash', ['-c', config.command], {
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    const logBuffer = [];
    this.logBuffers.set(name, logBuffer);

    // Capture stdout
    serverProcess.stdout.on('data', (data) => {
      const log = {
        timestamp: Date.now(),
        source: `${name}-stdout`,
        data: data.toString()
      };
      logBuffer.push(log);
      this.logger.debug('SERVER', `${name} stdout: ${data.toString().trim()}`);
    });

    // Capture stderr
    serverProcess.stderr.on('data', (data) => {
      const log = {
        timestamp: Date.now(),
        source: `${name}-stderr`,
        data: data.toString()
      };
      logBuffer.push(log);
      this.logger.debug('SERVER', `${name} stderr: ${data.toString().trim()}`);
    });

    // Handle process events
    serverProcess.on('error', (error) => {
      this.logger.error('SERVER', `Failed to start ${name} server: ${error.message}`);
    });

    serverProcess.on('exit', (code, signal) => {
      this.logger.info('SERVER', `${name} server exited`, { code, signal });
      this.servers.delete(name);
    });

    this.servers.set(name, serverProcess);

    // Wait for server to be ready
    if (config.healthEndpoint) {
      await this.waitForServerReady(name, config.healthEndpoint);
    } else {
      // Wait a bit for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    this.logger.info('SERVER', `${name} server started successfully`);
    return serverProcess;
  }

  async waitForServerReady(name, healthEndpoint, timeout = CONFIG.timeout.serverStart) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(healthEndpoint);
        if (response.ok) {
          this.logger.info('SERVER', `${name} server is ready`);
          return true;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`${name} server did not become ready within ${timeout}ms`);
  }

  async stopServer(name) {
    const serverProcess = this.servers.get(name);
    if (!serverProcess) {
      this.logger.warn('SERVER', `Server ${name} is not running`);
      return;
    }

    this.logger.info('SERVER', `Stopping ${name} server`);
    
    // Send SIGTERM first
    serverProcess.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => {
      serverProcess.on('exit', resolve);
      // Force kill after 10 seconds
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 10000);
    });

    this.servers.delete(name);
    this.logger.info('SERVER', `${name} server stopped`);
  }

  async stopAllServers() {
    const serverNames = Array.from(this.servers.keys());
    await Promise.all(serverNames.map(name => this.stopServer(name)));
  }

  getServerLogs(name) {
    return this.logBuffers.get(name) || [];
  }

  getAllServerLogs() {
    const allLogs = {};
    for (const [name, logs] of this.logBuffers.entries()) {
      allLogs[name] = logs;
    }
    return allLogs;
  }

  saveServerLogs() {
    const timestamp = Date.now();
    for (const [name, logs] of this.logBuffers.entries()) {
      const logFile = path.join(CONFIG.output.serverLogs, `${name}-${timestamp}.log`);
      const logContent = logs.map(log =>
        `[${new Date(log.timestamp).toISOString()}] [${log.source}] ${log.data}`
      ).join('');
      
      fs.writeFileSync(logFile, logContent);
      this.logger.info('SERVER', `Saved ${name} logs to ${logFile}`);
    }
  }
}

/**
 * Logger utility for structured debug output
 */
class Logger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(level, category, message, data = {}) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    const logEntry = {
      timestamp,
      elapsed,
      level,
      category,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    const prefix = `[${elapsed}ms] [${level}] [${category}]`;
    console.log(`${prefix} ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  info(category, message, data) { this.log('INFO', category, message, data); }
  warn(category, message, data) { this.log('WARN', category, message, data); }
  error(category, message, data) { this.log('ERROR', category, message, data); }
  debug(category, message, data) { this.log('DEBUG', category, message, data); }

  save() {
    const logFile = path.join(CONFIG.output.logs, `debug-session-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(this.logs, null, 2));
    this.info('LOGGER', `Logs saved to ${logFile}`);
  }
}

/**
 * Network and Console Monitor
 */
class BrowserMonitor {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.networkLogs = [];
    this.consoleLogs = [];
    this.errors = [];
    this.websocketMessages = [];
  }

  async setup() {
    // Enable request interception for network monitoring
    await this.page.setRequestInterception(true);
    
    // Monitor network requests
    this.page.on('request', (request) => {
      const logEntry = {
        timestamp: Date.now(),
        type: 'request',
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      };
      
      this.networkLogs.push(logEntry);
      
      if (request.url().includes('/api/')) {
        this.logger.debug('NETWORK', `API Request: ${request.method()} ${request.url()}`);
      }
      
      request.continue();
    });

    // Monitor network responses
    this.page.on('response', (response) => {
      const logEntry = {
        timestamp: Date.now(),
        type: 'response',
        status: response.status(),
        url: response.url(),
        headers: response.headers()
      };
      
      this.networkLogs.push(logEntry);
      
      if (response.url().includes('/api/')) {
        this.logger.debug('NETWORK', `API Response: ${response.status()} ${response.url()}`);
        
        if (response.status() >= 400) {
          this.logger.error('NETWORK', `API Error: ${response.status()} ${response.url()}`);
        }
      }
    });

    // Monitor console messages
    this.page.on('console', (msg) => {
      const logEntry = {
        timestamp: Date.now(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      this.consoleLogs.push(logEntry);
      
      if (msg.type() === 'error') {
        this.logger.error('CONSOLE', `Console Error: ${msg.text()}`);
        
        // Check for React infinite loop errors
        if (msg.text().includes('Maximum update depth exceeded')) {
          this.logger.error('REACT', 'INFINITE LOOP DETECTED!', { text: msg.text() });
          this.errors.push({
            type: 'react_infinite_loop',
            message: msg.text(),
            timestamp: Date.now()
          });
        }
      } else if (msg.type() === 'warning' && msg.text().includes('React')) {
        this.logger.warn('REACT', `React Warning: ${msg.text()}`);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', (error) => {
      this.logger.error('PAGE', `Page Error: ${error.message}`);
      this.errors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // Monitor WebSocket frames (if available)
    const client = await this.page.target().createCDPSession();
    await client.send('Network.enable');
    
    client.on('Network.webSocketFrameReceived', (params) => {
      this.websocketMessages.push({
        timestamp: Date.now(),
        direction: 'received',
        data: params.response.payloadData
      });
      this.logger.debug('WEBSOCKET', 'Message received', { data: params.response.payloadData });
    });

    client.on('Network.webSocketFrameSent', (params) => {
      this.websocketMessages.push({
        timestamp: Date.now(),
        direction: 'sent',
        data: params.response.payloadData
      });
      this.logger.debug('WEBSOCKET', 'Message sent', { data: params.response.payloadData });
    });
  }

  getReport() {
    return {
      networkLogs: this.networkLogs,
      consoleLogs: this.consoleLogs,
      errors: this.errors,
      websocketMessages: this.websocketMessages,
      summary: {
        totalRequests: this.networkLogs.filter(log => log.type === 'request').length,
        totalResponses: this.networkLogs.filter(log => log.type === 'response').length,
        errorResponses: this.networkLogs.filter(log => log.type === 'response' && log.status >= 400).length,
        consoleErrors: this.consoleLogs.filter(log => log.type === 'error').length,
        pageErrors: this.errors.length,
        websocketMessages: this.websocketMessages.length
      }
    };
  }
}

/**
 * Main Campaign Flow Debugger
 */
class CampaignFlowDebugger {
  constructor() {
    this.logger = new Logger();
    this.browser = null;
    this.page = null;
    this.monitor = null;
    
  }

  async initialize() {
    this.logger.info('INIT', 'Starting Campaign Flow Debugger');
    
    // Initialize server log capture if enabled
    if (CONFIG.servers.captureServerLogs) {
      this.serverCapture = new ServerLogCapture(this.logger);
      await this.startServers();
    }
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: CONFIG.browser.headless,
      devtools: CONFIG.browser.devtools,
      defaultViewport: CONFIG.browser.defaultViewport,
      slowMo: CONFIG.browser.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Create page and setup monitoring
    this.page = await this.browser.newPage();
    this.monitor = new BrowserMonitor(this.page, this.logger);
    await this.monitor.setup();

    // Set viewport and user agent
    await this.page.setViewport(CONFIG.browser.defaultViewport);
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 DomainFlow-Debugger');

    this.logger.info('INIT', 'Browser initialized successfully');
  }

  async startServers() {
    this.logger.info('SERVERS', 'Starting backend and frontend servers for log capture');
    
    try {
      // Start backend server
      await this.serverCapture.startServer('backend', CONFIG.servers.backend);
      
      // Start frontend server
      await this.serverCapture.startServer('frontend', CONFIG.servers.frontend);
      
      this.serversStarted = true;
      this.logger.info('SERVERS', 'All servers started successfully');
      
      // Wait a bit for servers to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      this.logger.error('SERVERS', `Failed to start servers: ${error.message}`);
      // Continue with test even if server capture fails
      this.serversStarted = false;
    }
  }

  

  async waitForSelector(selector, timeout = CONFIG.timeout.selector) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      this.logger.error('SELECTOR', `Selector not found: ${selector}`, { error: error.message });
      return false;
    }
  }

  async performLogin() {
    this.logger.info('AUTH', 'Starting login process');
    
    try {
      // Navigate to login page
      await this.page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2' });

      // Check if already logged in
      const currentUrl = this.page.url();
      if (currentUrl.includes('/campaigns') || currentUrl.includes('/dashboard')) {
        this.logger.info('AUTH', 'Already logged in, skipping login form');
        return true;
      }

      // Fill login form
      if (await this.waitForSelector('input[type="email"], input[name="email"]')) {
        await this.page.type('input[type="email"], input[name="email"]', CONFIG.credentials.email);
        this.logger.debug('AUTH', 'Email entered');
      }

      if (await this.waitForSelector('input[type="password"], input[name="password"]')) {
        await this.page.type('input[type="password"], input[name="password"]', CONFIG.credentials.password);
        this.logger.debug('AUTH', 'Password entered');
      }

      

      // Submit form
      const submitButton = await this.page.$('button[type="submit"], button:contains("Login"), button:contains("Sign In")');
      if (submitButton) {
        await submitButton.click();
        this.logger.debug('AUTH', 'Login form submitted');
      } else {
        // Try pressing Enter as fallback
        await this.page.keyboard.press('Enter');
        this.logger.debug('AUTH', 'Login submitted via Enter key');
      }

      // Wait for redirect
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout.navigation });

      const finalUrl = this.page.url();
      if (finalUrl.includes('/campaigns') || finalUrl.includes('/dashboard')) {
        this.logger.info('AUTH', 'Login successful');
        return true;
      } else {
        this.logger.error('AUTH', 'Login failed - unexpected redirect', { url: finalUrl });
        return false;
      }

    } catch (error) {
      this.logger.error('AUTH', `Login failed: ${error.message}`);
      return false;
    }
  }

  async navigateToCampaigns() {
    this.logger.info('NAVIGATION', 'Navigating to campaigns page');
    
    try {
      await this.page.goto(CONFIG.campaignsUrl, { waitUntil: 'networkidle2' });

      // Wait for campaigns to load
      await this.waitForSelector('[data-testid="campaign-list"], .campaign-card, table', 5000);
      
      this.logger.info('NAVIGATION', 'Successfully loaded campaigns page');
      return true;
    } catch (error) {
      this.logger.error('NAVIGATION', `Failed to load campaigns: ${error.message}`);
      return false;
    }
  }

  async getCampaignList() {
    this.logger.info('CAMPAIGNS', 'Analyzing campaign list');
    
    try {
      // Wait for campaign elements to be present
      await this.page.waitForTimeout(2000);
      
      // Try different selectors for campaigns
      const campaignSelectors = [
        '[data-testid="campaign-row"]',
        '.campaign-card',
        'tr[data-campaign-id]',
        'tbody tr',
        '[role="row"]'
      ];

      let campaigns = [];
      
      for (const selector of campaignSelectors) {
        campaigns = await this.page.$$(selector);
        if (campaigns.length > 0) {
          this.logger.debug('CAMPAIGNS', `Found ${campaigns.length} campaigns using selector: ${selector}`);
          break;
        }
      }

      if (campaigns.length === 0) {
        this.logger.warn('CAMPAIGNS', 'No campaigns found on page');
        return [];
      }

      // Extract campaign information
      const campaignData = [];
      for (let i = 0; i < Math.min(campaigns.length, 10); i++) {
        try {
          const campaign = campaigns[i];
          const text = await campaign.evaluate(el => el.textContent);
          const id = await campaign.evaluate(el => 
            el.getAttribute('data-campaign-id') || 
            el.querySelector('[data-campaign-id]')?.getAttribute('data-campaign-id') ||
            'unknown'
          );
          
          campaignData.push({
            index: i,
            id,
            text: text.replace(/\s+/g, ' ').trim(),
            element: campaign
          });
        } catch (error) {
          this.logger.warn('CAMPAIGNS', `Failed to extract data for campaign ${i}: ${error.message}`);
        }
      }

      this.logger.info('CAMPAIGNS', `Successfully analyzed ${campaignData.length} campaigns`);
      return campaignData;

    } catch (error) {
      this.logger.error('CAMPAIGNS', `Failed to analyze campaigns: ${error.message}`);
      return [];
    }
  }

  async testCampaignDeletion(campaigns) {
    this.logger.info('DELETION', 'Testing campaign deletion workflow');
    
    const deletionResults = [];
    const maxDeletions = Math.min(3, campaigns.length);

    for (let i = 0; i < maxDeletions; i++) {
      const campaign = campaigns[i];
      this.logger.debug('DELETION', `Attempting to delete campaign ${i + 1}/${maxDeletions}`, { 
        id: campaign.id,
        text: campaign.text.substring(0, 100)
      });

      try {
        // Look for delete/action buttons
        const deleteSelectors = [
          'button[aria-label*="delete"]',
          'button[title*="delete"]',
          '.delete-button',
          '[data-testid="delete-campaign"]',
          'button[data-action="delete"]'
        ];

        let deleteButton = null;
        for (const selector of deleteSelectors) {
          deleteButton = await campaign.element.$(selector);
          if (deleteButton) break;
        }

        if (!deleteButton) {
          // Try selecting the campaign first, then look for bulk delete
          await campaign.element.click();
          await this.page.waitForTimeout(500);
          
          deleteButton = await this.page.$('button[data-action="bulk-delete"], .bulk-delete-button');
        }

        if (deleteButton) {
          await deleteButton.click();
          this.logger.debug('DELETION', 'Delete button clicked');
          
          // Wait for confirmation dialog or immediate deletion
          await this.page.waitForTimeout(1000);
          
          // Look for confirmation dialog
          const confirmButton = await this.page.$('button:contains("Confirm"), button:contains("Delete"), button[data-testid="confirm-delete"]');
          if (confirmButton) {
            await confirmButton.click();
            this.logger.debug('DELETION', 'Deletion confirmed');
            await this.page.waitForTimeout(1000);
          }

          deletionResults.push({
            campaign: campaign.id,
            status: 'attempted',
            timestamp: Date.now()
          });
          
        } else {
          this.logger.warn('DELETION', `No delete button found for campaign ${campaign.id}`);
          deletionResults.push({
            campaign: campaign.id,
            status: 'no_delete_button',
            timestamp: Date.now()
          });
        }

        // Wait between deletions
        await this.page.waitForTimeout(2000);

      } catch (error) {
        this.logger.error('DELETION', `Failed to delete campaign ${campaign.id}: ${error.message}`);
        deletionResults.push({
          campaign: campaign.id,
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    this.logger.info('DELETION', `Deletion testing completed`, { results: deletionResults });
    return deletionResults;
  }

  async testViewDashboardButtons(campaigns) {
    this.logger.info('DASHBOARD', 'Testing "View Dashboard" button interactions');
    
    const dashboardResults = [];
    const maxTests = Math.min(3, campaigns.length);

    for (let i = 0; i < maxTests; i++) {
      const campaign = campaigns[i];
      this.logger.debug('DASHBOARD', `Testing dashboard button for campaign ${i + 1}/${maxTests}`, {
        id: campaign.id
      });

      try {
        // Look for "View Dashboard" or similar buttons
        const dashboardSelectors = [
          'button:contains("View Dashboard")',
          'button:contains("Dashboard")',
          'a[href*="/dashboard"]',
          'button[data-action="view-dashboard"]',
          'a[data-testid="view-dashboard"]',
          '.dashboard-button'
        ];

        let dashboardButton = null;
        for (const selector of dashboardSelectors) {
          try {
            dashboardButton = await campaign.element.$(selector);
            if (!dashboardButton) {
              // Try page-level search
              dashboardButton = await this.page.$(selector);
            }
            if (dashboardButton) break;
          } catch (e) {
            // Selector might not be supported, continue
          }
        }

        if (dashboardButton) {
          // Monitor for infinite loops before clicking
          const initialErrorCount = this.monitor.errors.length;
          
          await dashboardButton.click();
          this.logger.debug('DASHBOARD', 'Dashboard button clicked');
          
          // Wait and monitor for React errors
          await this.page.waitForTimeout(3000);
          
          const newErrors = this.monitor.errors.slice(initialErrorCount);
          const hasInfiniteLoop = newErrors.some(error => 
            error.type === 'react_infinite_loop' || 
            error.message.includes('Maximum update depth exceeded')
          );

          if (hasInfiniteLoop) {
            this.logger.error('DASHBOARD', 'INFINITE LOOP DETECTED after dashboard click!');
          }
          
          dashboardResults.push({
            campaign: campaign.id,
            status: 'clicked',
            hasInfiniteLoop,
            newErrors: newErrors.length,
            timestamp: Date.now()
          });

          // Navigate back to campaigns
          await this.page.goto(CONFIG.campaignsUrl, { waitUntil: 'networkidle2' });
          await this.page.waitForTimeout(1000);

        } else {
          this.logger.warn('DASHBOARD', `No dashboard button found for campaign ${campaign.id}`);
          dashboardResults.push({
            campaign: campaign.id,
            status: 'no_button',
            timestamp: Date.now()
          });
        }

      } catch (error) {
        this.logger.error('DASHBOARD', `Failed to test dashboard for campaign ${campaign.id}: ${error.message}`);
        dashboardResults.push({
          campaign: campaign.id,
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    this.logger.info('DASHBOARD', 'Dashboard testing completed', { results: dashboardResults });
    return dashboardResults;
  }

  async runFullTest() {
    try {
      await this.initialize();

      // Login
      const loginSuccess = await this.performLogin();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      // Navigate to campaigns
      const campaignsLoaded = await this.navigateToCampaigns();
      if (!campaignsLoaded) {
        throw new Error('Failed to load campaigns');
      }

      // Get campaign list
      const campaigns = await this.getCampaignList();
      if (campaigns.length === 0) {
        this.logger.warn('TEST', 'No campaigns available for testing');
        return;
      }

      // Test campaign deletion
      const deletionResults = await this.testCampaignDeletion(campaigns);

      // Reload campaigns page after deletions
      await this.navigateToCampaigns();
      const updatedCampaigns = await this.getCampaignList();

      // Test dashboard buttons
      const dashboardResults = await this.testViewDashboardButtons(updatedCampaigns);

      // Generate final report
      const report = {
        timestamp: new Date().toISOString(),
        testDuration: Date.now() - this.logger.startTime,
        campaigns: {
          initial: campaigns.length,
          afterDeletion: updatedCampaigns.length
        },
        results: {
          deletion: deletionResults,
          dashboard: dashboardResults
        },
        monitoring: this.monitor.getReport()
      };

      // Save report
      const reportFile = path.join(CONFIG.output.reports, `campaign-test-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      this.logger.info('TEST', 'Test completed successfully', { 
        report: reportFile,
        infiniteLoopsDetected: report.monitoring.errors.filter(e => e.type === 'react_infinite_loop').length
      });

      // Summary
      console.log('\n=== TEST SUMMARY ===');
      console.log(`Campaigns tested: ${campaigns.length}`);
      console.log(`Deletion attempts: ${deletionResults.length}`);
      console.log(`Dashboard tests: ${dashboardResults.length}`);
      console.log(`Console errors: ${report.monitoring.summary.consoleErrors}`);
      console.log(`Network errors: ${report.monitoring.summary.errorResponses}`);
      console.log(`React infinite loops: ${report.monitoring.errors.filter(e => e.type === 'react_infinite_loop').length}`);
      console.log(`Report saved: ${reportFile}`);

    } catch (error) {
      this.logger.error('TEST', `Test failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    this.logger.info('CLEANUP', 'Cleaning up resources');
    
    try {
      this.logger.save();
      
      // Cleanup server log capture if enabled
      if (this.serverCapture) {
        this.logger.info('CLEANUP', 'Stopping servers and saving logs');
        await this.serverCapture.stopAllServers();
        this.serverCapture.saveServerLogs();
      }
      
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Main execution
async function main() {
  const flowDebugger = new CampaignFlowDebugger();
  
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, cleaning up...');
    await flowDebugger.cleanup();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await flowDebugger.cleanup();
    process.exit(1);
  });

  await flowDebugger.runFullTest();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CampaignFlowDebugger, CONFIG };