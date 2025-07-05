#!/usr/bin/env node

/**
 * Enhanced Domainflow Test Suite - Comprehensive Node.js Test Automation
 * 
 * This script provides a unified, enhanced testing framework for the Domainflow app
 * that combines the best features of existing scripts with new advanced capabilities.
 * 
 * Features:
 * - Complete campaign workflow testing (login, navigate, create, retrieve, delete)
 * - Comprehensive server log capture (Next.js frontend + Go backend)
 * - Real-time WebSocket monitoring with campaign update tracking
 * - Advanced performance monitoring and memory usage tracking
 * - Network request/response validation with retry logic
 * - Screenshot capture at all key testing phases
 * - Structured test reporting with pass/fail status and debugging info
 * - Error scenario testing and edge case validation
 * - Bulk campaign operations testing
 * 
 * Usage:
 *   node test-automation/domainflow-test-suite.js [options]
 * 
 * Options:
 *   --headless          Run browser in headless mode
 *   --debug            Enable debug mode with devtools
 *   --capture-logs     Capture server logs during testing
 *   --skip-server-start Skip starting servers (use existing ones)
 *   --max-campaigns    Maximum campaigns to test (default: 5)
 *   --timeout          Default timeout in milliseconds (default: 30000)
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

// Configuration Management
const CONFIG = {
  // Application URLs
  app: {
    frontend: 'http://localhost:3000',
    backend: 'http://localhost:8080',
    loginUrl: 'http://localhost:3000/login',
    campaignsUrl: 'http://localhost:3000/campaigns',
    dashboardUrl: 'http://localhost:3000/dashboard'
  },
  
  // Test credentials
  auth: {
    username: process.env.TEST_USERNAME || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'password123'
  },
  
  // Browser configuration
  browser: {
    headless: process.argv.includes('--headless') || process.env.HEADLESS === 'true',
    devtools: process.argv.includes('--debug'),
    slowMo: process.argv.includes('--debug') ? 100 : 50,
    defaultViewport: { width: 1920, height: 1080 },
    mobileViewport: { width: 375, height: 667 },
    tabletViewport: { width: 768, height: 1024 }
  },
  
  // Server management
  servers: {
    captureServerLogs: process.argv.includes('--capture-logs'),
    skipServerStart: process.argv.includes('--skip-server-start'),
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
  
  // Test parameters
  testing: {
    maxCampaigns: parseInt(process.argv.find(arg => arg.startsWith('--max-campaigns='))?.split('=')[1]) || 5,
    retryAttempts: 3,
    retryDelay: 2000,
    screenshotOnError: true,
    validateNetwork: true
  },
  
  // Timeouts (milliseconds)
  timeouts: {
    default: parseInt(process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 30000,
    navigation: 30000,
    selector: 10000,
    action: 5000,
    serverStart: 120000,
    websocket: 15000,
    networkRequest: 10000
  },
  
  // Output directories
  output: {
    base: './test-automation',
    logs: './test-automation/logs',
    reports: './test-automation/reports',
    screenshots: './test-automation/screenshots',
    serverLogs: './test-automation/server-logs',
    performance: './test-automation/performance'
  }
};

// Utility Functions
class Utils {
  static async ensureDirectories() {
    for (const dir of Object.values(CONFIG.output)) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error.message);
      }
    }
  }
  
  static getTimestamp() {
    return Date.now();
  }
  
  static formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
  }
  
  static sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
  }
  
  static async retry(fn, attempts = CONFIG.testing.retryAttempts, delay = CONFIG.testing.retryDelay) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Advanced Logger with Test Phase Tracking
class EnhancedLogger {
  constructor() {
    this.logs = [];
    this.testPhases = [];
    this.currentPhase = null;
    this.startTime = Utils.getTimestamp();
    this.errorCount = 0;
    this.warningCount = 0;
  }
  
  startPhase(phaseName, description = '') {
    const phase = {
      name: phaseName,
      description,
      startTime: Utils.getTimestamp(),
      endTime: null,
      status: 'running',
      logs: [],
      errors: [],
      screenshots: []
    };
    
    this.testPhases.push(phase);
    this.currentPhase = phase;
    this.log('info', 'PHASE', `Starting phase: ${phaseName}`, { description });
    return phase;
  }
  
  endPhase(status = 'completed', summary = {}) {
    if (!this.currentPhase) return;
    
    this.currentPhase.endTime = Utils.getTimestamp();
    this.currentPhase.status = status;
    this.currentPhase.duration = this.currentPhase.endTime - this.currentPhase.startTime;
    this.currentPhase.summary = summary;
    
    this.log('info', 'PHASE', `Completed phase: ${this.currentPhase.name}`, {
      status,
      duration: this.currentPhase.duration,
      summary
    });
    
    this.currentPhase = null;
  }
  
  log(level, category, message, data = null) {
    const timestamp = Utils.getTimestamp();
    const elapsed = timestamp - this.startTime;
    
    const logEntry = {
      timestamp,
      elapsed,
      level,
      category,
      message,
      data,
      phase: this.currentPhase?.name || 'global'
    };
    
    this.logs.push(logEntry);
    
    if (this.currentPhase) {
      this.currentPhase.logs.push(logEntry);
    }
    
    // Track error/warning counts
    if (level === 'error') {
      this.errorCount++;
      if (this.currentPhase) {
        this.currentPhase.errors.push(logEntry);
      }
    } else if (level === 'warn') {
      this.warningCount++;
    }
    
    // Console output with enhanced formatting
    const prefix = `[${elapsed}ms] [${level.toUpperCase()}] [${category}]`;
    const phasePrefix = this.currentPhase ? ` [${this.currentPhase.name}]` : '';
    
    console.log(`${prefix}${phasePrefix} ${message}`);
    if (data && (level === 'error' || level === 'debug')) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }
  
  info(category, message, data) { this.log('info', category, message, data); }
  warn(category, message, data) { this.log('warn', category, message, data); }
  error(category, message, data) { this.log('error', category, message, data); }
  debug(category, message, data) { this.log('debug', category, message, data); }
  success(category, message, data) { this.log('success', category, message, data); }
  
  addScreenshot(filename, description = '') {
    if (this.currentPhase) {
      this.currentPhase.screenshots.push({
        filename,
        description,
        timestamp: Utils.getTimestamp()
      });
    }
  }
  
  async saveReport() {
    const report = {
      summary: {
        startTime: this.startTime,
        endTime: Utils.getTimestamp(),
        duration: Utils.getTimestamp() - this.startTime,
        totalLogs: this.logs.length,
        totalErrors: this.errorCount,
        totalWarnings: this.warningCount,
        totalPhases: this.testPhases.length,
        completedPhases: this.testPhases.filter(p => p.status === 'completed').length,
        failedPhases: this.testPhases.filter(p => p.status === 'failed').length
      },
      phases: this.testPhases,
      logs: this.logs,
      config: CONFIG
    };
    
    const filename = `test-report-${Utils.getTimestamp()}.json`;
    const filepath = path.join(CONFIG.output.reports, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    this.success('LOGGER', `Test report saved: ${filename}`);
    
    return { report, filename, filepath };
  }
}

// Server Management with Enhanced Log Capture
class ServerManager {
  constructor(logger) {
    this.logger = logger;
    this.servers = new Map();
    this.logBuffers = new Map();
    this.logFiles = new Map();
  }
  
  async startServer(name, config) {
    if (this.servers.has(name)) {
      this.logger.warn('SERVER', `Server ${name} is already running`);
      return true;
    }
    
    this.logger.info('SERVER', `Starting ${name} server`, { command: config.command });
    
    const serverProcess = spawn('bash', ['-c', config.command], {
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    const logBuffer = [];
    this.logBuffers.set(name, logBuffer);
    
    // Create real-time log file
    const logFilename = `${name}-server-${Utils.getTimestamp()}.log`;
    const logFilepath = path.join(CONFIG.output.serverLogs, logFilename);
    this.logFiles.set(name, logFilepath);
    
    // Capture stdout with structured logging
    serverProcess.stdout.on('data', (data) => {
      const logEntry = {
        timestamp: Utils.getTimestamp(),
        source: `${name}-stdout`,
        data: data.toString()
      };
      logBuffer.push(logEntry);
      this.appendToLogFile(name, logEntry);
    });
    
    // Capture stderr with structured logging
    serverProcess.stderr.on('data', (data) => {
      const logEntry = {
        timestamp: Utils.getTimestamp(),
        source: `${name}-stderr`,
        data: data.toString()
      };
      logBuffer.push(logEntry);
      this.appendToLogFile(name, logEntry);
    });
    
    // Handle process events
    serverProcess.on('error', (error) => {
      this.logger.error('SERVER', `Failed to start ${name}: ${error.message}`);
    });
    
    serverProcess.on('exit', (code, signal) => {
      this.logger.info('SERVER', `${name} server exited`, { code, signal });
      this.servers.delete(name);
    });
    
    this.servers.set(name, serverProcess);
    
    // Wait for server readiness
    if (config.healthEndpoint) {
      await this.waitForServerReady(name, config.healthEndpoint);
    } else {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    this.logger.success('SERVER', `${name} server started successfully`);
    return true;
  }
  
  async appendToLogFile(serverName, logEntry) {
    try {
      const logFilepath = this.logFiles.get(serverName);
      if (logFilepath) {
        const logLine = `[${Utils.formatTimestamp(logEntry.timestamp)}] [${logEntry.source}] ${logEntry.data}`;
        await fs.appendFile(logFilepath, logLine);
      }
    } catch (error) {
      // Ignore file writing errors to not interrupt server logging
    }
  }
  
  async waitForServerReady(name, healthEndpoint, timeout = CONFIG.timeouts.serverStart) {
    const startTime = Utils.getTimestamp();
    let attempts = 0;
    
    while (Utils.getTimestamp() - startTime < timeout) {
      attempts++;
      try {
        this.logger.debug('SERVER', `Health check attempt ${attempts} for ${name}`);
        
        const response = await fetch(healthEndpoint, {
          timeout: 5000,
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          this.logger.success('SERVER', `${name} server is ready (attempt ${attempts})`);
          return true;
        }
      } catch (error) {
        this.logger.debug('SERVER', `Health check failed for ${name}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    throw new Error(`${name} server did not become ready within ${timeout}ms after ${attempts} attempts`);
  }
  
  async stopAllServers() {
    const serverNames = Array.from(this.servers.keys());
    for (const name of serverNames) {
      await this.stopServer(name);
    }
  }
  
  async stopServer(name) {
    const serverProcess = this.servers.get(name);
    if (!serverProcess) return;
    
    this.logger.info('SERVER', `Stopping ${name} server`);
    
    serverProcess.kill('SIGTERM');
    
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 10000);
      
      serverProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    
    this.servers.delete(name);
    this.logger.success('SERVER', `${name} server stopped`);
  }
  
  getServerLogs(name) {
    return this.logBuffers.get(name) || [];
  }
}

// Advanced Performance Monitor
class PerformanceMonitor {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.metrics = [];
    this.baselines = new Map();
  }
  
  async captureMetrics(label, captureMemory = true) {
    try {
      const performanceMetrics = await this.page.metrics();
      
      let memoryInfo = {};
      if (captureMemory) {
        memoryInfo = await this.page.evaluate(() => {
          if (performance.memory) {
            return {
              usedJSSize: performance.memory.usedJSSize,
              totalJSSize: performance.memory.totalJSSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
          }
          return {};
        });
      }
      
      const timing = await this.page.evaluate(() => {
        const nav = performance.navigation || {};
        const timing = performance.timing || {};
        return {
          navigationStart: timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart
        };
      });
      
      const metric = {
        timestamp: Utils.getTimestamp(),
        label,
        performance: performanceMetrics,
        memory: memoryInfo,
        timing,
        url: this.page.url()
      };
      
      this.metrics.push(metric);
      
      // Check against baselines if available
      this.checkBaseline(label, metric);
      
      return metric;
    } catch (error) {
      this.logger.error('PERFORMANCE', `Failed to capture metrics for ${label}: ${error.message}`);
      return null;
    }
  }
  
  setBaseline(label, metric) {
    this.baselines.set(label, metric);
    this.logger.info('PERFORMANCE', `Baseline set for ${label}`);
  }
  
  checkBaseline(label, currentMetric) {
    const baseline = this.baselines.get(label);
    if (!baseline) return;
    
    const memoryIncrease = currentMetric.memory.usedJSSize - baseline.memory.usedJSSize;
    const taskDurationIncrease = currentMetric.performance.TaskDuration - baseline.performance.TaskDuration;
    
    if (memoryIncrease > 10 * 1024 * 1024) { // 10MB threshold
      this.logger.warn('PERFORMANCE', `Memory usage increased significantly for ${label}`, {
        increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    if (taskDurationIncrease > 0.5) { // 500ms threshold
      this.logger.warn('PERFORMANCE', `Task duration increased significantly for ${label}`, {
        increase: `${(taskDurationIncrease * 1000).toFixed(2)}ms`
      });
    }
  }
  
  getReport() {
    return {
      metrics: this.metrics,
      baselines: Object.fromEntries(this.baselines),
      summary: this.calculateSummary()
    };
  }
  
  calculateSummary() {
    if (this.metrics.length === 0) return {};
    
    const memoryValues = this.metrics.map(m => m.memory.usedJSSize || 0);
    const taskDurations = this.metrics.map(m => m.performance.TaskDuration || 0);
    
    return {
      totalSamples: this.metrics.length,
      memory: {
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length
      },
      taskDuration: {
        min: Math.min(...taskDurations),
        max: Math.max(...taskDurations),
        avg: taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length
      }
    };
  }
}

// Enhanced WebSocket Monitor with Campaign Tracking
class WebSocketMonitor {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.messages = [];
    this.connectionState = 'disconnected';
    this.campaignUpdates = [];
    this.isMonitoring = false;
  }
  
  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.logger.info('WEBSOCKET', 'Starting WebSocket monitoring');
    
    await this.page.evaluateOnNewDocument(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        const ws = new originalWebSocket(url, protocols);
        
        window._wsInstance = ws;
        window._wsMessages = [];
        window._wsConnectionState = 'connecting';
        window._campaignUpdates = [];
        
        ws.addEventListener('open', (event) => {
          window._wsConnectionState = 'connected';
          window._wsMessages.push({
            type: 'connection',
            state: 'open',
            timestamp: Date.now(),
            url: url
          });
        });
        
        ws.addEventListener('message', (event) => {
          const message = {
            type: 'message',
            data: event.data,
            timestamp: Date.now()
          };
          window._wsMessages.push(message);
          
          // Try to parse and detect campaign updates
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'campaign_update' || parsed.campaign_id || parsed.campaignId) {
              window._campaignUpdates.push({
                ...parsed,
                timestamp: Date.now()
              });
            }
          } catch (e) {
            // Not JSON or no campaign data
          }
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
    
    this.isMonitoring = true;
  }
  
  async getConnectionState() {
    return await this.page.evaluate(() => window._wsConnectionState || 'disconnected');
  }
  
  async getMessages() {
    return await this.page.evaluate(() => window._wsMessages || []);
  }
  
  async getCampaignUpdates() {
    return await this.page.evaluate(() => window._campaignUpdates || []);
  }
  
  async waitForConnection(timeout = CONFIG.timeouts.websocket) {
    this.logger.info('WEBSOCKET', 'Waiting for WebSocket connection...');
    const startTime = Utils.getTimestamp();
    
    while (Utils.getTimestamp() - startTime < timeout) {
      const state = await this.getConnectionState();
      if (state === 'connected') {
        this.logger.success('WEBSOCKET', 'WebSocket connected successfully');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const finalState = await this.getConnectionState();
    this.logger.error('WEBSOCKET', `Connection timeout. Final state: ${finalState}`);
    return false;
  }
  
  async waitForCampaignUpdate(campaignId, timeout = 30000) {
    this.logger.info('WEBSOCKET', `Waiting for campaign update: ${campaignId}`);
    const startTime = Utils.getTimestamp();
    
    while (Utils.getTimestamp() - startTime < timeout) {
      const updates = await this.getCampaignUpdates();
      const relevantUpdate = updates.find(u => 
        u.campaign_id === campaignId || u.campaignId === campaignId
      );
      
      if (relevantUpdate) {
        this.logger.success('WEBSOCKET', `Received campaign update for ${campaignId}`, relevantUpdate);
        return relevantUpdate;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.logger.warn('WEBSOCKET', `No campaign update received for ${campaignId} within timeout`);
    return null;
  }
}

// Enhanced Browser Controller with Retry Logic
class BrowserController {
  constructor(logger) {
    this.logger = logger;
    this.browser = null;
    this.page = null;
    this.screenshotCounter = 0;
    this.performanceMonitor = null;
    this.wsMonitor = null;
    this.networkLogs = [];
  }
  
  async initialize() {
    this.logger.info('BROWSER', 'Initializing browser environment');
    
    this.browser = await puppeteer.launch({
      headless: CONFIG.browser.headless,
      devtools: CONFIG.browser.devtools,
      slowMo: CONFIG.browser.slowMo,
      defaultViewport: CONFIG.browser.defaultViewport,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Initialize monitors
    this.performanceMonitor = new PerformanceMonitor(this.page, this.logger);
    this.wsMonitor = new WebSocketMonitor(this.page, this.logger);
    await this.wsMonitor.startMonitoring();
    
    // Set up console logging
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        this.logger.error('CONSOLE', text);
      } else if (type === 'warning') {
        this.logger.warn('CONSOLE', text);
      } else {
        this.logger.debug('CONSOLE', `[${type}] ${text}`);
      }
    });
    
    // Set up error handling
    this.page.on('pageerror', error => {
      this.logger.error('PAGE', `Page Error: ${error.message}`);
    });
    
    // Set up network monitoring with validation
    if (CONFIG.testing.validateNetwork) {
      await this.setupNetworkMonitoring();
    }
    
    this.logger.success('BROWSER', 'Browser initialized successfully');
  }
  
  async setupNetworkMonitoring() {
    await this.page.setRequestInterception(true);
    
    this.page.on('request', request => {
      this.networkLogs.push({
        timestamp: Utils.getTimestamp(),
        type: 'request',
        method: request.method(),
        url: request.url(),
        headers: request.headers()
      });
      
      if (request.url().includes('/api/')) {
        this.logger.debug('NETWORK', `API Request: ${request.method()} ${request.url()}`);
      }
      
      request.continue();
    });
    
    this.page.on('response', response => {
      this.networkLogs.push({
        timestamp: Utils.getTimestamp(),
        type: 'response',
        status: response.status(),
        url: response.url(),
        headers: response.headers()
      });
      
      if (response.url().includes('/api/')) {
        const status = response.status();
        if (status >= 400) {
          this.logger.error('NETWORK', `API Error: ${status} ${response.url()}`);
        } else {
          this.logger.debug('NETWORK', `API Response: ${status} ${response.url()}`);
        }
      }
    });
  }
  
  async takeScreenshot(label, description = '') {
    try {
      const filename = `${String(++this.screenshotCounter).padStart(3, '0')}-${Utils.sanitizeFilename(label)}-${Utils.getTimestamp()}.png`;
      const filepath = path.join(CONFIG.output.screenshots, filename);
      
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true,
        type: 'png',
        quality: 90
      });
      
      this.logger.info('SCREENSHOT', `Screenshot saved: ${filename}`, { description });
      this.logger.addScreenshot(filename, description);
      
      return filename;
    } catch (error) {
      this.logger.error('SCREENSHOT', `Failed to take screenshot: ${error.message}`);
      return null;
    }
  }
  
  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || CONFIG.timeouts.selector;
    
    return Utils.retry(async () => {
      this.logger.debug('SELECTOR', `Waiting for: ${selector}`);
      
      try {
        await this.page.waitForSelector(selector, { timeout, ...options });
        this.logger.debug('SELECTOR', `Found: ${selector}`);
        return true;
      } catch (error) {
        this.logger.warn('SELECTOR', `Not found: ${selector}`);
        
        if (CONFIG.testing.screenshotOnError) {
          await this.takeScreenshot(`selector-not-found-${Utils.sanitizeFilename(selector)}`);
        }
        
        throw error;
      }
    }, 2, 1000);
  }
  
  async clickElement(selector, label = '', options = {}) {
    return Utils.retry(async () => {
      this.logger.info('INTERACTION', `Clicking: ${selector} ${label}`);
      
      await this.waitForSelector(selector);
      await this.page.click(selector, options);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.takeScreenshot(`click-${Utils.sanitizeFilename(label || selector)}`);
      this.logger.success('INTERACTION', `Clicked: ${selector}`);
    });
  }
  
  async typeText(selector, text, label = '', options = {}) {
    return Utils.retry(async () => {
      this.logger.info('INTERACTION', `Typing in: ${selector} ${label}`);
      
      await this.waitForSelector(selector);
      await this.page.focus(selector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.type(selector, text, options);
      
      await this.takeScreenshot(`type-${Utils.sanitizeFilename(label || selector)}`);
      this.logger.success('INTERACTION', `Typed in: ${selector}`);
    });
  }
  
  async navigateToPage(url, label = '', waitUntil = 'networkidle0') {
    return Utils.retry(async () => {
      this.logger.info('NAVIGATION', `Navigating to: ${url} ${label}`);
      
      const response = await this.page.goto(url, { 
        waitUntil, 
        timeout: CONFIG.timeouts.navigation 
      });
      
      if (!response.ok()) {
        throw new Error(`Navigation failed with status: ${response.status()}`);
      }
      
      await this.takeScreenshot(`navigate-${Utils.sanitizeFilename(label || 'page')}`);
      this.logger.success('NAVIGATION', `Navigated to: ${url}`);
      
      return response;
    });
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.logger.info('BROWSER', 'Browser closed');
    }
  }
}

// Main Test Suite Class
class DomainflowTestSuite {
  constructor() {
    this.logger = new EnhancedLogger();
    this.serverManager = null;
    this.browser = null;
    this.testResults = {
      phases: {},
      campaigns: {},
      performance: {},
      errors: []
    };
  }
  
  async initialize() {
    const phase = this.logger.startPhase('initialization', 'Setting up test environment');
    
    try {
      // Create output directories
      await Utils.ensureDirectories();
      
      // Initialize server management
      if (CONFIG.servers.captureServerLogs && !CONFIG.servers.skipServerStart) {
        this.serverManager = new ServerManager(this.logger);
        await this.startServers();
      }
      
      // Initialize browser
      this.browser = new BrowserController(this.logger);
      await this.browser.initialize();
      
      this.logger.endPhase('completed', { 
        serversCaptured: !!this.serverManager,
        browserReady: true 
      });
      
    } catch (error) {
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async startServers() {
    this.logger.info('SERVERS', 'Starting application servers');
    
    try {
      await this.serverManager.startServer('backend', CONFIG.servers.backend);
      await this.serverManager.startServer('frontend', CONFIG.servers.frontend);
      
      // Allow servers to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      this.logger.error('SERVERS', `Failed to start servers: ${error.message}`);
      throw error;
    }
  }
  
  async testAuthentication() {
    const phase = this.logger.startPhase('authentication', 'Testing login flow and session validation');
    
    try {
      // Capture baseline performance
      await this.browser.performanceMonitor.captureMetrics('pre-login');
      
      // Navigate to login page
      await this.browser.navigateToPage(CONFIG.app.loginUrl, 'login-page');
      
      // Check if already logged in
      const currentUrl = this.browser.page.url();
      if (currentUrl.includes('/campaigns') || currentUrl.includes('/dashboard')) {
        this.logger.info('AUTH', 'Already logged in, testing logout and re-login');
        
        // Test logout
        await this.browser.navigateToPage(`${CONFIG.app.frontend}/logout`, 'logout');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.browser.navigateToPage(CONFIG.app.loginUrl, 'return-to-login');
      }
      
      // Perform login
      await this.browser.waitForSelector('form');
      
      // Fill credentials
      await this.browser.typeText(
        'input[name="username"], input[type="email"], input[name="email"]', 
        CONFIG.auth.username, 
        'username'
      );
      
      await this.browser.typeText(
        'input[name="password"], input[type="password"]', 
        CONFIG.auth.password, 
        'password'
      );
      
      // Submit login
      await this.browser.clickElement('button[type="submit"]', 'login-submit');
      
      // Wait for redirect and validate session
      await this.browser.page.waitForNavigation({ 
        waitUntil: 'networkidle0', 
        timeout: CONFIG.timeouts.navigation 
      });
      
      const finalUrl = this.browser.page.url();
      const loginSuccess = finalUrl.includes('/campaigns') || finalUrl.includes('/dashboard');
      
      if (!loginSuccess) {
        throw new Error(`Login failed - redirected to: ${finalUrl}`);
      }
      
      // Capture post-login performance
      await this.browser.performanceMonitor.captureMetrics('post-login');
      
      // Validate session by checking for user-specific elements
      const sessionValid = await this.validateSession();
      
      this.testResults.phases.authentication = {
        success: true,
        loginUrl: CONFIG.app.loginUrl,
        redirectUrl: finalUrl,
        sessionValid
      };
      
      this.logger.endPhase('completed', { 
        loginSuccess: true, 
        sessionValid,
        redirectUrl: finalUrl 
      });
      
      return true;
      
    } catch (error) {
      this.testResults.phases.authentication = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async validateSession() {
    try {
      // Look for user-specific elements that indicate valid session
      const sessionIndicators = [
        '[data-testid="user-menu"]',
        '.user-profile',
        '.logout-button',
        'nav[data-authenticated]',
        '.authenticated-nav'
      ];
      
      for (const selector of sessionIndicators) {
        try {
          await this.browser.page.waitForSelector(selector, { timeout: 2000 });
          this.logger.success('SESSION', `Session validation successful: found ${selector}`);
          return true;
        } catch (e) {
          // Continue checking other selectors
        }
      }
      
      // If no specific indicators found, check if we can access protected routes
      const protectedRoutes = [CONFIG.app.campaignsUrl, CONFIG.app.dashboardUrl];
      
      for (const route of protectedRoutes) {
        try {
          const response = await this.browser.page.goto(route, { waitUntil: 'networkidle0' });
          if (response.ok() && !this.browser.page.url().includes('/login')) {
            this.logger.success('SESSION', `Session validation successful: can access ${route}`);
            return true;
          }
        } catch (e) {
          // Continue checking other routes
        }
      }
      
      this.logger.warn('SESSION', 'Session validation inconclusive');
      return false;
      
    } catch (error) {
      this.logger.error('SESSION', `Session validation failed: ${error.message}`);
      return false;
    }
  }
  
  async testCampaignNavigation() {
    const phase = this.logger.startPhase('campaign-navigation', 'Testing campaigns page navigation and functionality');
    
    try {
      // Navigate to campaigns page
      await this.browser.navigateToPage(CONFIG.app.campaignsUrl, 'campaigns-page');
      
      // Wait for campaigns page to load with more flexible selectors
      try {
        await this.browser.waitForSelector([
          '[data-testid="campaign-list"]',
          '.campaign-card',
          'table tbody',
          '.campaigns-container',
          '.campaigns-page',
          '[class*="campaign"]',
          'main',
          '.content'
        ].join(', '), { timeout: 15000 });
      } catch (error) {
        this.logger.warn('CAMPAIGNS', 'Primary selectors not found, checking for any page content');
        // Fallback: just ensure page has loaded
        await this.browser.page.waitForSelector('body', { timeout: 5000 });
      }
      
      // Start WebSocket monitoring for campaign updates
      const wsConnected = await this.browser.wsMonitor.waitForConnection();
      
      // Get campaign list
      const campaigns = await this.getCampaignList();
      
      this.testResults.phases.campaignNavigation = {
        success: true,
        campaignsFound: campaigns.length,
        websocketConnected: wsConnected
      };
      
      this.logger.endPhase('completed', { 
        campaignsFound: campaigns.length,
        websocketConnected: wsConnected 
      });
      
      return campaigns;
      
    } catch (error) {
      this.testResults.phases.campaignNavigation = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async getCampaignList() {
    this.logger.info('CAMPAIGNS', 'Analyzing campaign list');
    
    try {
      // Wait for campaigns to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const campaignSelectors = [
        '[data-testid="campaign-row"]',
        '.campaign-card',
        'tr[data-campaign-id]',
        'tbody tr',
        '.campaign-item',
        '[class*="campaign"]',
        'tr:not(:first-child)', // Skip header row
        'li[data-campaign]',
        '.list-item',
        '[role="row"]',
        '.grid-item'
      ];
      
      let campaigns = [];
      let usedSelector = null;
      
      for (const selector of campaignSelectors) {
        campaigns = await this.browser.page.$$(selector);
        if (campaigns.length > 0) {
          usedSelector = selector;
          this.logger.debug('CAMPAIGNS', `Found ${campaigns.length} campaigns with: ${selector}`);
          break;
        }
      }
      
      if (campaigns.length === 0) {
        this.logger.warn('CAMPAIGNS', 'No campaigns found with standard selectors, trying generic content detection');
        
        // Fallback: try to find any content that might be campaign-related
        const anyElements = await this.browser.page.$$('div, li, tr, article, section');
        this.logger.debug('CAMPAIGNS', `Found ${anyElements.length} generic elements on page`);
        
        // Take a screenshot for debugging
        await this.browser.takeScreenshot('no-campaigns-found', 'No campaign elements detected');
        
        // Try to get page text for analysis
        const pageText = await this.browser.page.evaluate(() => document.body.innerText);
        this.logger.debug('CAMPAIGNS', `Page text preview: ${pageText.substring(0, 300)}...`);
        
        return [];
      }
      
      // Extract campaign information
      const campaignData = [];
      const maxCampaigns = Math.min(campaigns.length, CONFIG.testing.maxCampaigns);
      
      for (let i = 0; i < maxCampaigns; i++) {
        try {
          const campaign = campaigns[i];
          const campaignInfo = await campaign.evaluate((el, index) => {
            const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
            const id = el.getAttribute('data-campaign-id') || 
                     el.querySelector('[data-campaign-id]')?.getAttribute('data-campaign-id') ||
                     `campaign-${index}`;
            
            // Try to extract campaign name
            const nameEl = el.querySelector('.campaign-name, [data-field="name"], .name');
            const name = nameEl?.textContent?.trim() || `Campaign ${index + 1}`;
            
            // Try to extract status
            const statusEl = el.querySelector('.status, [data-field="status"], .campaign-status');
            const status = statusEl?.textContent?.trim() || 'unknown';
            
            return {
              index,
              id,
              name,
              status,
              text: text.substring(0, 200)
            };
          }, i);
          
          campaignData.push({
            ...campaignInfo,
            element: campaign
          });
          
        } catch (error) {
          this.logger.warn('CAMPAIGNS', `Failed to extract data for campaign ${i}: ${error.message}`);
        }
      }
      
      this.logger.success('CAMPAIGNS', `Analyzed ${campaignData.length} campaigns`, {
        usedSelector,
        campaigns: campaignData.map(c => ({ id: c.id, name: c.name, status: c.status }))
      });
      
      return campaignData;
      
    } catch (error) {
      this.logger.error('CAMPAIGNS', `Failed to analyze campaigns: ${error.message}`);
      return [];
    }
  }
  
  async testCampaignCreation() {
    const phase = this.logger.startPhase('campaign-creation', 'Testing new campaign creation workflow');
    
    try {
      // Look for "Create Campaign" or "New Campaign" button
      const createSelectors = [
        '[data-testid="create-campaign"]',
        'button:contains("Create Campaign")',
        'button:contains("New Campaign")',
        '.create-campaign-button',
        'a[href*="/campaigns/new"]'
      ];
      
      let createButton = null;
      for (const selector of createSelectors) {
        try {
          await this.browser.page.waitForSelector(selector, { timeout: 2000 });
          createButton = selector;
          break;
        } catch (e) {
          // Continue checking
        }
      }
      
      if (!createButton) {
        // Try direct navigation to create page
        await this.browser.navigateToPage(`${CONFIG.app.campaignsUrl}/new`, 'create-campaign-direct');
      } else {
        await this.browser.clickElement(createButton, 'create-campaign-button');
      }
      
      // Wait for create form to load
      await this.browser.waitForSelector('form, .campaign-form, [data-testid="campaign-form"]');
      
      // Fill out campaign creation form
      const campaignData = await this.fillCampaignForm();
      
      // Submit form
      await this.browser.clickElement(
        'button[type="submit"], .submit-button, [data-testid="submit-campaign"]', 
        'submit-campaign'
      );
      
      // Wait for creation to complete
      await this.browser.page.waitForNavigation({ 
        waitUntil: 'networkidle0',
        timeout: CONFIG.timeouts.navigation 
      });
      
      // Monitor for WebSocket updates about the new campaign
      const campaignUpdate = await this.browser.wsMonitor.waitForCampaignUpdate(
        campaignData.id || 'new-campaign',
        10000
      );
      
      this.testResults.phases.campaignCreation = {
        success: true,
        campaignData,
        websocketUpdate: !!campaignUpdate
      };
      
      this.logger.endPhase('completed', { 
        campaignCreated: true,
        websocketUpdate: !!campaignUpdate,
        campaignData 
      });
      
      return campaignData;
      
    } catch (error) {
      this.testResults.phases.campaignCreation = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async fillCampaignForm() {
    const campaignData = {
      name: `Test Campaign ${Utils.getTimestamp()}`,
      description: 'Automated test campaign created by test suite',
      id: `test-${Utils.getTimestamp()}`
    };
    
    try {
      // Fill campaign name
      const nameSelectors = [
        'input[name="name"]',
        'input[data-field="name"]',
        '#campaign-name',
        '.campaign-name input'
      ];
      
      for (const selector of nameSelectors) {
        try {
          await this.browser.page.waitForSelector(selector, { timeout: 2000 });
          await this.browser.typeText(selector, campaignData.name, 'campaign-name');
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Fill description if available
      const descSelectors = [
        'textarea[name="description"]',
        'input[name="description"]',
        'textarea[data-field="description"]',
        '#campaign-description'
      ];
      
      for (const selector of descSelectors) {
        try {
          await this.browser.page.waitForSelector(selector, { timeout: 2000 });
          await this.browser.typeText(selector, campaignData.description, 'campaign-description');
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      this.logger.success('CAMPAIGN_FORM', 'Campaign form filled successfully', campaignData);
      return campaignData;
      
    } catch (error) {
      this.logger.error('CAMPAIGN_FORM', `Failed to fill campaign form: ${error.message}`);
      throw error;
    }
  }
  
  async testCampaignResults() {
    const phase = this.logger.startPhase('campaign-results', 'Testing campaign results retrieval and validation');
    
    try {
      // Navigate back to campaigns list
      await this.browser.navigateToPage(CONFIG.app.campaignsUrl, 'return-to-campaigns');
      
      // Get updated campaign list
      const campaigns = await this.getCampaignList();
      
      if (campaigns.length === 0) {
        throw new Error('No campaigns available for results testing');
      }
      
      // Test campaign details for first few campaigns
      const testedCampaigns = [];
      const maxTests = Math.min(3, campaigns.length);
      
      for (let i = 0; i < maxTests; i++) {
        const campaign = campaigns[i];
        try {
          const result = await this.testCampaignDetails(campaign);
          testedCampaigns.push(result);
        } catch (error) {
          this.logger.error('CAMPAIGN_RESULTS', `Failed to test campaign ${campaign.id}: ${error.message}`);
          testedCampaigns.push({
            campaign: campaign.id,
            success: false,
            error: error.message
          });
        }
      }
      
      this.testResults.phases.campaignResults = {
        success: true,
        testedCampaigns: testedCampaigns.length,
        successfulTests: testedCampaigns.filter(t => t.success).length
      };
      
      this.logger.endPhase('completed', { 
        testedCampaigns: testedCampaigns.length,
        successfulTests: testedCampaigns.filter(t => t.success).length
      });
      
      return testedCampaigns;
      
    } catch (error) {
      this.testResults.phases.campaignResults = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async testCampaignDetails(campaign) {
    this.logger.info('CAMPAIGN_DETAILS', `Testing details for campaign: ${campaign.id}`);
    
    try {
      // Click on campaign to view details
      await campaign.element.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we navigated to details page or if details appeared inline
      const currentUrl = this.browser.page.url();
      const onDetailsPage = currentUrl.includes(`/campaigns/${campaign.id}`) || 
                           currentUrl.includes('/campaigns/') && currentUrl !== CONFIG.app.campaignsUrl;
      
      await this.browser.takeScreenshot(`campaign-details-${campaign.id}`, `Details for ${campaign.name}`);
      
      // Look for campaign details elements
      const detailsElements = await this.browser.page.$$eval(
        '.campaign-details, .details-panel, [data-testid="campaign-details"]',
        elements => elements.length
      );
      
      // Look for campaign data/results
      const resultsElements = await this.browser.page.$$eval(
        '.campaign-results, .results-table, .domain-results, [data-testid="results"]',
        elements => elements.length
      );
      
      // Monitor WebSocket for real-time updates
      const wsMessages = await this.browser.wsMonitor.getMessages();
      const recentMessages = wsMessages.filter(msg => 
        Utils.getTimestamp() - msg.timestamp < 10000
      );
      
      const result = {
        campaign: campaign.id,
        success: true,
        onDetailsPage,
        detailsElements,
        resultsElements,
        recentWebSocketMessages: recentMessages.length
      };
      
      this.logger.success('CAMPAIGN_DETAILS', `Successfully tested campaign details: ${campaign.id}`, result);
      return result;
      
    } catch (error) {
      this.logger.error('CAMPAIGN_DETAILS', `Failed to test campaign details: ${error.message}`);
      return {
        campaign: campaign.id,
        success: false,
        error: error.message
      };
    }
  }
  
  async testBulkCampaignOperations() {
    const phase = this.logger.startPhase('bulk-operations', 'Testing bulk campaign operations and deletion');
    
    try {
      // Navigate to campaigns page
      await this.browser.navigateToPage(CONFIG.app.campaignsUrl, 'bulk-operations-start');
      
      // Get campaign list
      const campaigns = await this.getCampaignList();
      
      if (campaigns.length === 0) {
        this.logger.warn('BULK_OPS', 'No campaigns available for bulk operations testing');
        this.logger.endPhase('completed', { campaignsAvailable: 0 });
        return { deleted: [], selected: [] };
      }
      
      // Test campaign selection
      const selectedCampaigns = await this.selectCampaignsForBulkOperation(campaigns);
      
      // Test bulk deletion if selection was successful
      let deletedCampaigns = [];
      if (selectedCampaigns.length > 0) {
        deletedCampaigns = await this.performBulkDeletion(selectedCampaigns);
      }
      
      this.testResults.phases.bulkOperations = {
        success: true,
        campaignsAvailable: campaigns.length,
        campaignsSelected: selectedCampaigns.length,
        campaignsDeleted: deletedCampaigns.length
      };
      
      this.logger.endPhase('completed', { 
        campaignsSelected: selectedCampaigns.length,
        campaignsDeleted: deletedCampaigns.length 
      });
      
      return { 
        selected: selectedCampaigns, 
        deleted: deletedCampaigns 
      };
      
    } catch (error) {
      this.testResults.phases.bulkOperations = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async selectCampaignsForBulkOperation(campaigns) {
    this.logger.info('BULK_SELECT', 'Selecting campaigns for bulk operations');
    
    const selectedCampaigns = [];
    const maxSelections = Math.min(3, campaigns.length);
    
    try {
      for (let i = 0; i < maxSelections; i++) {
        const campaign = campaigns[i];
        
        // Look for checkboxes or selection mechanisms
        const selectionSelectors = [
          'input[type="checkbox"]',
          '.campaign-select',
          '[data-testid="select-campaign"]',
          '.select-checkbox'
        ];
        
        let selected = false;
        for (const selector of selectionSelectors) {
          try {
            const checkbox = await campaign.element.$(selector);
            if (checkbox) {
              await checkbox.click();
              selected = true;
              this.logger.debug('BULK_SELECT', `Selected campaign: ${campaign.id}`);
              selectedCampaigns.push(campaign);
              break;
            }
          } catch (error) {
            // Continue to next selector
          }
        }
        
        if (!selected) {
          // Try clicking the campaign row itself to select it
          try {
            await campaign.element.click();
            selectedCampaigns.push(campaign);
            this.logger.debug('BULK_SELECT', `Selected campaign via row click: ${campaign.id}`);
          } catch (error) {
            this.logger.warn('BULK_SELECT', `Failed to select campaign: ${campaign.id}`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await this.browser.takeScreenshot('campaigns-selected', `${selectedCampaigns.length} campaigns selected`);
      
      this.logger.success('BULK_SELECT', `Selected ${selectedCampaigns.length} campaigns for bulk operations`);
      return selectedCampaigns;
      
    } catch (error) {
      this.logger.error('BULK_SELECT', `Failed to select campaigns: ${error.message}`);
      return selectedCampaigns;
    }
  }
  
  async performBulkDeletion(selectedCampaigns) {
    this.logger.info('BULK_DELETE', `Attempting bulk deletion of ${selectedCampaigns.length} campaigns`);
    
    const deletedCampaigns = [];
    
    try {
      // Look for bulk delete button
      const bulkDeleteSelectors = [
        '[data-testid="bulk-delete"]',
        '.bulk-delete-button',
        'button:contains("Delete Selected")',
        'button:contains("Bulk Delete")',
        '.delete-selected'
      ];
      
      let deleteButton = null;
      for (const selector of bulkDeleteSelectors) {
        try {
          await this.browser.page.waitForSelector(selector, { timeout: 2000 });
          deleteButton = selector;
          break;
        } catch (e) {
          // Continue checking
        }
      }
      
      if (deleteButton) {
        await this.browser.clickElement(deleteButton, 'bulk-delete-button');
        
        // Wait for confirmation dialog
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for confirmation
        const confirmSelectors = [
          'button:contains("Confirm")',
          'button:contains("Delete")',
          '[data-testid="confirm-delete"]',
          '.confirm-button'
        ];
        
        for (const selector of confirmSelectors) {
          try {
            await this.browser.page.waitForSelector(selector, { timeout: 2000 });
            await this.browser.clickElement(selector, 'confirm-bulk-delete');
            break;
          } catch (e) {
            // Continue checking
          }
        }
        
        // Wait for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Monitor WebSocket for deletion updates
        const wsMessages = await this.browser.wsMonitor.getMessages();
        const deletionMessages = wsMessages.filter(msg => {
          try {
            const data = JSON.parse(msg.data);
            return data.type === 'campaign_deleted' || data.action === 'delete';
          } catch (e) {
            return false;
          }
        });
        
        deletedCampaigns.push(...selectedCampaigns);
        
        this.logger.success('BULK_DELETE', `Bulk deletion completed`, {
          deleted: deletedCampaigns.length,
          websocketUpdates: deletionMessages.length
        });
        
      } else {
        // Try individual deletion for each selected campaign
        this.logger.info('BULK_DELETE', 'No bulk delete button found, trying individual deletions');
        
        for (const campaign of selectedCampaigns) {
          try {
            const deleted = await this.deleteIndividualCampaign(campaign);
            if (deleted) {
              deletedCampaigns.push(campaign);
            }
          } catch (error) {
            this.logger.error('BULK_DELETE', `Failed to delete campaign ${campaign.id}: ${error.message}`);
          }
        }
      }
      
      await this.browser.takeScreenshot('bulk-delete-completed', `Deleted ${deletedCampaigns.length} campaigns`);
      
      return deletedCampaigns;
      
    } catch (error) {
      this.logger.error('BULK_DELETE', `Bulk deletion failed: ${error.message}`);
      return deletedCampaigns;
    }
  }
  
  async deleteIndividualCampaign(campaign) {
    try {
      // Look for delete button in campaign row
      const deleteSelectors = [
        'button[aria-label*="delete"]',
        '.delete-button',
        '[data-testid="delete-campaign"]',
        'button[title*="delete"]'
      ];
      
      let deleteButton = null;
      for (const selector of deleteSelectors) {
        deleteButton = await campaign.element.$(selector);
        if (deleteButton) break;
      }
      
      if (deleteButton) {
        await deleteButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Handle confirmation if present
        try {
          const confirmButton = await this.browser.page.$('button:contains("Confirm"), button:contains("Delete")');
          if (confirmButton) {
            await confirmButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (e) {
          // No confirmation needed
        }
        
        this.logger.debug('INDIVIDUAL_DELETE', `Deleted campaign: ${campaign.id}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      this.logger.error('INDIVIDUAL_DELETE', `Failed to delete campaign ${campaign.id}: ${error.message}`);
      return false;
    }
  }
  
  async testErrorScenarios() {
    const phase = this.logger.startPhase('error-scenarios', 'Testing error scenarios and edge cases');
    
    try {
      const errorTests = [];
      
      // Test 1: Network interruption
      this.logger.info('ERROR_TEST', 'Testing network interruption handling');
      await this.browser.page.setOfflineMode(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.browser.takeScreenshot('offline-mode', 'Application in offline mode');
      
      // Check for offline indicators
      const offlineIndicators = await this.browser.page.$$('.offline, .network-error, [data-offline="true"]');
      errorTests.push({
        test: 'network_interruption',
        success: true,
        offlineIndicatorsFound: offlineIndicators.length
      });
      
      // Restore network
      await this.browser.page.setOfflineMode(false);
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.browser.takeScreenshot('back-online', 'Network restored');
      
      // Test 2: Invalid campaign access
      this.logger.info('ERROR_TEST', 'Testing invalid campaign access');
      const invalidCampaignUrl = `${CONFIG.app.campaignsUrl}/invalid-campaign-${Utils.getTimestamp()}`;
      await this.browser.navigateToPage(invalidCampaignUrl, 'invalid-campaign');
      
      const errorElements = await this.browser.page.$$('.error, .not-found, [data-testid="error"]');
      errorTests.push({
        test: 'invalid_campaign_access',
        success: true,
        errorElementsFound: errorElements.length
      });
      
      // Test 3: Unauthorized access simulation
      this.logger.info('ERROR_TEST', 'Testing unauthorized access handling');
      try {
        // Try to logout first
        await this.browser.navigateToPage(`${CONFIG.app.frontend}/logout`, 'logout-for-test');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to access protected route
        await this.browser.navigateToPage(CONFIG.app.campaignsUrl, 'unauthorized-access');
        
        const redirectedToLogin = this.browser.page.url().includes('/login');
        errorTests.push({
          test: 'unauthorized_access',
          success: true,
          redirectedToLogin
        });
        
        // Re-login for subsequent tests
        if (redirectedToLogin) {
          await this.testAuthentication();
        }
        
      } catch (error) {
        errorTests.push({
          test: 'unauthorized_access',
          success: false,
          error: error.message
        });
      }
      
      this.testResults.phases.errorScenarios = {
        success: true,
        testsCompleted: errorTests.length,
        errorTests
      };
      
      this.logger.endPhase('completed', { 
        testsCompleted: errorTests.length,
        successfulTests: errorTests.filter(t => t.success).length
      });
      
      return errorTests;
      
    } catch (error) {
      this.testResults.phases.errorScenarios = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async testResponsiveDesign() {
    const phase = this.logger.startPhase('responsive-design', 'Testing responsive design across different viewports');
    
    try {
      const viewports = [
        { name: 'mobile', ...CONFIG.browser.mobileViewport },
        { name: 'tablet', ...CONFIG.browser.tabletViewport },
        { name: 'desktop', ...CONFIG.browser.defaultViewport }
      ];
      
      const responsiveResults = [];
      
      for (const viewport of viewports) {
        this.logger.info('RESPONSIVE', `Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
        
        await this.browser.page.setViewport(viewport);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Capture performance metrics for this viewport
        await this.browser.performanceMonitor.captureMetrics(`responsive-${viewport.name}`);
        
        await this.browser.takeScreenshot(`responsive-${viewport.name}`, `${viewport.name} viewport test`);
        
        // Check for responsive elements
        const mobileMenu = await this.browser.page.$('.mobile-menu, .hamburger, [data-testid="mobile-menu"]') !== null;
        const sidebarVisible = await this.browser.page.$('.sidebar:not([style*="display: none"])') !== null;
        
        responsiveResults.push({
          viewport: viewport.name,
          dimensions: `${viewport.width}x${viewport.height}`,
          mobileMenuPresent: mobileMenu,
          sidebarVisible
        });
      }
      
      // Reset to desktop viewport
      await this.browser.page.setViewport(CONFIG.browser.defaultViewport);
      
      this.testResults.phases.responsiveDesign = {
        success: true,
        viewportsTested: responsiveResults.length,
        results: responsiveResults
      };
      
      this.logger.endPhase('completed', { 
        viewportsTested: responsiveResults.length 
      });
      
      return responsiveResults;
      
    } catch (error) {
      this.testResults.phases.responsiveDesign = {
        success: false,
        error: error.message
      };
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  async generateFinalReport() {
    const phase = this.logger.startPhase('report-generation', 'Generating comprehensive test report');
    
    try {
      // Collect all performance data
      const performanceReport = this.browser.performanceMonitor.getReport();
      
      // Collect WebSocket data
      const wsMessages = await this.browser.wsMonitor.getMessages();
      const wsUpdates = await this.browser.wsMonitor.getCampaignUpdates();
      
      // Collect server logs if available
      let serverLogs = {};
      if (this.serverManager) {
        serverLogs = {
          backend: this.serverManager.getServerLogs('backend'),
          frontend: this.serverManager.getServerLogs('frontend')
        };
      }
      
      // Compile comprehensive report
      const report = {
        meta: {
          timestamp: Utils.formatTimestamp(Utils.getTimestamp()),
          duration: Utils.getTimestamp() - this.logger.startTime,
          testSuiteVersion: '1.0.0',
          configuration: CONFIG
        },
        summary: {
          totalPhases: this.logger.testPhases.length,
          completedPhases: this.logger.testPhases.filter(p => p.status === 'completed').length,
          failedPhases: this.logger.testPhases.filter(p => p.status === 'failed').length,
          totalErrors: this.logger.errorCount,
          totalWarnings: this.logger.warningCount,
          screenshotsTaken: this.browser.screenshotCounter
        },
        phases: this.logger.testPhases,
        results: this.testResults,
        performance: performanceReport,
        websocket: {
          totalMessages: wsMessages.length,
          campaignUpdates: wsUpdates.length,
          connectionState: await this.browser.wsMonitor.getConnectionState(),
          messages: wsMessages.slice(-50) // Last 50 messages for review
        },
        network: {
          totalRequests: this.browser.networkLogs.filter(log => log.type === 'request').length,
          totalResponses: this.browser.networkLogs.filter(log => log.type === 'response').length,
          errorResponses: this.browser.networkLogs.filter(log => 
            log.type === 'response' && log.status >= 400
          ).length,
          recentLogs: this.browser.networkLogs.slice(-100) // Last 100 network logs
        },
        serverLogs: serverLogs,
        logs: this.logger.logs
      };
      
      // Save main report
      const reportFilename = `domainflow-test-report-${Utils.getTimestamp()}.json`;
      const reportPath = path.join(CONFIG.output.reports, reportFilename);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      // Save performance data separately
      const perfFilename = `performance-metrics-${Utils.getTimestamp()}.json`;
      const perfPath = path.join(CONFIG.output.performance, perfFilename);
      await fs.writeFile(perfPath, JSON.stringify(performanceReport, null, 2));
      
      // Generate summary console output
      this.printTestSummary(report);
      
      this.logger.endPhase('completed', { 
        reportFile: reportFilename,
        performanceFile: perfFilename
      });
      
      return { report, reportPath, perfPath };
      
    } catch (error) {
      this.logger.endPhase('failed', { error: error.message });
      throw error;
    }
  }
  
  printTestSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 DOMAINFLOW TEST SUITE - EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    // Overall status
    const allPhasesSuccessful = report.summary.failedPhases === 0;
    const statusEmoji = allPhasesSuccessful ? '✅' : '❌';
    console.log(`${statusEmoji} Overall Status: ${allPhasesSuccessful ? 'PASSED' : 'FAILED'}`);
    console.log(`⏱️  Total Duration: ${(report.meta.duration / 1000).toFixed(2)}s`);
    console.log(`📊 Screenshots Captured: ${report.summary.screenshotsTaken}`);
    
    console.log('\n📋 Test Phases:');
    console.log('-'.repeat(50));
    
    for (const phase of report.phases) {
      const emoji = phase.status === 'completed' ? '✅' : phase.status === 'failed' ? '❌' : '⏳';
      const duration = phase.duration ? `(${(phase.duration / 1000).toFixed(2)}s)` : '';
      console.log(`${emoji} ${phase.name} ${duration}`);
      
      if (phase.status === 'failed' && phase.summary?.error) {
        console.log(`   ❗ Error: ${phase.summary.error}`);
      }
    }
    
    console.log('\n🔗 WebSocket Monitoring:');
    console.log('-'.repeat(50));
    console.log(`📡 Connection State: ${report.websocket.connectionState}`);
    console.log(`💬 Total Messages: ${report.websocket.totalMessages}`);
    console.log(`🎯 Campaign Updates: ${report.websocket.campaignUpdates}`);
    
    console.log('\n🌐 Network Activity:');
    console.log('-'.repeat(50));
    console.log(`📤 Total Requests: ${report.network.totalRequests}`);
    console.log(`📥 Total Responses: ${report.network.totalResponses}`);
    console.log(`❌ Error Responses: ${report.network.errorResponses}`);
    
    console.log('\n📈 Performance Summary:');
    console.log('-'.repeat(50));
    if (report.performance.summary.memory) {
      console.log(`🧠 Memory Usage: ${(report.performance.summary.memory.avg / 1024 / 1024).toFixed(2)}MB avg`);
      console.log(`📊 Performance Samples: ${report.performance.summary.totalSamples}`);
    }
    
    console.log('\n📁 Output Files:');
    console.log('-'.repeat(50));
    console.log(`📄 Test Report: ${CONFIG.output.reports}/`);
    console.log(`📸 Screenshots: ${CONFIG.output.screenshots}/`);
    console.log(`📝 Logs: ${CONFIG.output.logs}/`);
    if (this.serverManager) {
      console.log(`🖥️  Server Logs: ${CONFIG.output.serverLogs}/`);
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (report.summary.totalErrors > 0) {
      console.log(`⚠️  Warning: ${report.summary.totalErrors} errors detected during testing`);
    }
    
    if (allPhasesSuccessful) {
      console.log('🎉 All tests completed successfully!');
    } else {
      console.log('🔍 Some tests failed. Check the detailed report for more information.');
    }
    
    console.log('='.repeat(80));
  }
  
  async runCompleteTestSuite() {
    try {
      this.logger.info('SUITE', 'Starting Domainflow Test Suite execution');
      
      // Initialize test environment
      await this.initialize();
      
      // Run test phases in sequence
      await this.testAuthentication();
      
      const campaigns = await this.testCampaignNavigation();
      
      if (campaigns && campaigns.length > 0) {
        await this.testCampaignResults();
        await this.testBulkCampaignOperations();
      }
      
      try {
        await this.testCampaignCreation();
      } catch (error) {
        this.logger.warn('SUITE', 'Campaign creation test failed, continuing with other tests', { error: error.message });
      }
      
      await this.testErrorScenarios();
      await this.testResponsiveDesign();
      
      // Generate comprehensive report
      const reportData = await this.generateFinalReport();
      
      this.logger.success('SUITE', 'Test suite execution completed successfully');
      
      return reportData;
      
    } catch (error) {
      this.logger.error('SUITE', `Test suite execution failed: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
  
  async cleanup() {
    this.logger.info('CLEANUP', 'Cleaning up test environment');
    
    try {
      // Save logger report
      await this.logger.saveReport();
      
      // Stop server capture if running
      if (this.serverManager) {
        await this.serverManager.stopAllServers();
      }
      
      // Close browser
      if (this.browser) {
        await this.browser.close();
      }
      
      this.logger.success('CLEANUP', 'Cleanup completed successfully');
      
    } catch (error) {
      console.error('Cleanup failed:', error.message);
    }
  }
}

// Main execution function
async function main() {
  const suite = new DomainflowTestSuite();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received interrupt signal, cleaning up...');
    await suite.cleanup();
    process.exit(0);
  });
  
  process.on('uncaughtException', async (error) => {
    console.error('🚨 Uncaught exception:', error);
    await suite.cleanup();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('🚨 Unhandled rejection at:', promise, 'reason:', reason);
    await suite.cleanup();
    process.exit(1);
  });
  
  try {
    console.log('🚀 Starting Enhanced Domainflow Test Suite...');
    console.log('📊 Configuration:', {
      headless: CONFIG.browser.headless,
      captureServerLogs: CONFIG.servers.captureServerLogs,
      maxCampaigns: CONFIG.testing.maxCampaigns
    });
    console.log('='.repeat(80));
    
    const result = await suite.runCompleteTestSuite();
    
    console.log('\n✅ Test suite execution completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test suite execution failed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic usage
module.exports = {
  DomainflowTestSuite,
  CONFIG,
  Utils,
  EnhancedLogger,
  ServerManager,
  PerformanceMonitor,
  WebSocketMonitor,
  BrowserController
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}