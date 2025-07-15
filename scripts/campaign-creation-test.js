#!/usr/bin/env node

/**
 * Campaign Creation Flow Test with Log Monitoring
 * 
 * This script:
 * 1. Logs into the application using test credentials
 * 2. Navigates to campaigns page 
 * 3. Clicks "Create New Campaign" button
 * 4. Monitors frontend console logs and backend server logs
 * 5. Saves all output to log files for analysis
 * 
 * Usage: node scripts/campaign-creation-test.js
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8080',
  credentials: {
    email: 'test@example.com',
    password: 'password123'
  },
  backendLogPath: '../backend/backend-log.txt',
  outputDir: './test-logs',
  timeout: 30000
};

// Log file paths
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFiles = {
  frontend: path.join(config.outputDir, `frontend-${timestamp}.log`),
  backend: path.join(config.outputDir, `backend-${timestamp}.log`),
  test: path.join(config.outputDir, `test-execution-${timestamp}.log`),
  combined: path.join(config.outputDir, `combined-${timestamp}.log`)
};

// Test execution logger
class TestLogger {
  constructor() {
    this.logs = [];
  }

  log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    this.logs.push(entry);
    
    // Format for console (if needed for debugging)
    const formatted = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
    if (data) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  debug(message, data) { this.log('debug', message, data); }

  async saveToFile(filepath) {
    const content = this.logs.map(entry => {
      const line = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
      return entry.data ? `${line}\nDATA: ${JSON.stringify(entry.data, null, 2)}` : line;
    }).join('\n');
    
    await fs.writeFile(filepath, content, 'utf-8');
  }
}

// Backend log monitor
class BackendLogMonitor {
  constructor(logPath) {
    this.logPath = logPath;
    this.logs = [];
    this.initialSize = 0;
  }

  async initialize() {
    try {
      const stats = await fs.stat(this.logPath);
      this.initialSize = stats.size;
      this.logger.info('Backend log monitor initialized', { 
        logPath: this.logPath, 
        initialSize: this.initialSize 
      });
    } catch (error) {
      this.logger.warn('Backend log file not found, will monitor from start', { error: error.message });
      this.initialSize = 0;
    }
  }

  async getNewLogs() {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const newContent = content.slice(this.initialSize);
      
      if (newContent.trim()) {
        const newLines = newContent.trim().split('\n');
        this.logs.push(...newLines);
        return newLines;
      }
      return [];
    } catch (error) {
      this.logger.error('Error reading backend logs', { error: error.message });
      return [];
    }
  }

  async saveToFile(filepath) {
    await fs.writeFile(filepath, this.logs.join('\n'), 'utf-8');
  }
}

// Frontend console log collector
class FrontendLogCollector {
  constructor() {
    this.logs = [];
  }

  attachToPage(page, logger) {
    // Collect console logs
    page.on('console', msg => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      this.logs.push(logEntry);
      logger.debug(`Frontend Console [${msg.type()}]`, { 
        text: msg.text(),
        location: msg.location()
      });
    });

    // Collect page errors
    page.on('pageerror', error => {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        type: 'pageerror',
        message: error.message,
        stack: error.stack
      };
      
      this.logs.push(errorEntry);
      logger.error('Frontend Page Error', errorEntry);
    });

    // Collect network failures
    page.on('requestfailed', request => {
      const failureEntry = {
        timestamp: new Date().toISOString(),
        type: 'requestfailed',
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText
      };
      
      this.logs.push(failureEntry);
      logger.warn('Frontend Request Failed', failureEntry);
    });

    // Collect API responses
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const responseEntry = {
          timestamp: new Date().toISOString(),
          type: 'api_response',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        };
        
        this.logs.push(responseEntry);
        logger.debug('Frontend API Response', responseEntry);
      }
    });
  }

  async saveToFile(filepath) {
    const content = this.logs.map(entry => {
      return `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${JSON.stringify(entry, null, 2)}`;
    }).join('\n');
    
    await fs.writeFile(filepath, content, 'utf-8');
  }
}

// Main test execution
async function runCampaignCreationTest() {
  const logger = new TestLogger();
  const frontendLogs = new FrontendLogCollector();
  const backendLogs = new BackendLogMonitor(path.join(__dirname, config.backendLogPath));

  // Ensure output directory exists
  await fs.mkdir(config.outputDir, { recursive: true });

  logger.info('Starting Campaign Creation Test', {
    baseUrl: config.baseUrl,
    credentials: { email: config.credentials.email, password: '[REDACTED]' }
  });

  // Initialize backend log monitoring
  backendLogs.logger = logger;
  await backendLogs.initialize();

  let browser;
  let page;

  try {
    // Launch browser
    logger.info('Launching browser');
    browser = await chromium.launch({ 
      headless: false,  // Keep visible for monitoring
      slowMo: 1000     // Slow down for observation
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Attach log collectors
    frontendLogs.attachToPage(page, logger);
    
    // Navigate to login page
    logger.info('Navigating to login page');
    await page.goto(`${config.baseUrl}/login`);
    await page.waitForLoadState('networkidle');

    // Perform login
    logger.info('Performing login');
    await page.fill('input[type="email"]', config.credentials.email);
    await page.fill('input[type="password"]', config.credentials.password);
    
    // Click login button and wait for navigation
    await page.click('button[type="submit"]');
    logger.info('Login submitted, waiting for navigation');
    
    // Wait for successful login (should redirect to dashboard)
    await page.waitForURL(/\/(dashboard|campaigns)/, { timeout: config.timeout });
    logger.info('Login successful, redirected to dashboard');

    // Navigate to campaigns page
    logger.info('Navigating to campaigns page');
    await page.goto(`${config.baseUrl}/campaigns`);
    await page.waitForLoadState('networkidle');

    // Wait for campaigns page to fully load
    await page.waitForSelector('main', { timeout: config.timeout });
    logger.info('Campaigns page loaded');

    // Look for "Create New Campaign" button
    logger.info('Looking for Create New Campaign button');
    
    // Try multiple selectors that might match the button
    const buttonSelectors = [
      'a[href="/campaigns/new"]',
      'button:has-text("Create New Campaign")',
      'a:has-text("Create New Campaign")',
      '[data-testid="create-campaign-button"]'
    ];

    let createButton = null;
    for (const selector of buttonSelectors) {
      try {
        createButton = await page.waitForSelector(selector, { timeout: 5000 });
        if (createButton) {
          logger.info(`Found Create New Campaign button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        logger.debug(`Button not found with selector: ${selector}`);
      }
    }

    if (!createButton) {
      logger.error('Create New Campaign button not found, taking screenshot');
      await page.screenshot({ path: path.join(config.outputDir, `campaigns-page-${timestamp}.png`), fullPage: true });
      throw new Error('Create New Campaign button not found');
    }

    // Get backend logs before clicking
    const logsBefore = await backendLogs.getNewLogs();
    logger.info('Backend logs before campaign creation', { count: logsBefore.length });

    // Click the Create New Campaign button
    logger.info('Clicking Create New Campaign button');
    await createButton.click();

    // Wait for navigation to campaign creation form
    await page.waitForURL(/\/campaigns\/new/, { timeout: config.timeout });
    logger.info('Navigated to campaign creation form');

    // Wait for the form to load
    await page.waitForSelector('form', { timeout: config.timeout });
    logger.info('Campaign creation form loaded');

    // Take a screenshot of the form
    await page.screenshot({ 
      path: path.join(config.outputDir, `campaign-form-${timestamp}.png`), 
      fullPage: true 
    });

    // Monitor logs for a few seconds to capture any async operations
    logger.info('Monitoring logs for 5 seconds');
    await page.waitForTimeout(5000);

    // Get backend logs after campaign form load
    const logsAfter = await backendLogs.getNewLogs();
    logger.info('Backend logs after campaign creation navigation', { count: logsAfter.length });

    logger.info('Campaign creation flow test completed successfully');

  } catch (error) {
    logger.error('Test execution failed', { 
      error: error.message, 
      stack: error.stack 
    });

    // Take error screenshot if page exists
    if (page) {
      try {
        await page.screenshot({ 
          path: path.join(config.outputDir, `error-${timestamp}.png`), 
          fullPage: true 
        });
      } catch (screenshotError) {
        logger.error('Failed to take error screenshot', { error: screenshotError.message });
      }
    }

    throw error;
  } finally {
    // Save all logs
    logger.info('Saving log files');
    
    await Promise.all([
      logger.saveToFile(logFiles.test),
      frontendLogs.saveToFile(logFiles.frontend),
      backendLogs.saveToFile(logFiles.backend)
    ]);

    // Create combined log file
    const combinedLogs = [
      '=== TEST EXECUTION LOGS ===\n',
      await fs.readFile(logFiles.test, 'utf-8'),
      '\n\n=== FRONTEND LOGS ===\n',
      await fs.readFile(logFiles.frontend, 'utf-8'),
      '\n\n=== BACKEND LOGS ===\n',
      await fs.readFile(logFiles.backend, 'utf-8')
    ].join('');

    await fs.writeFile(logFiles.combined, combinedLogs, 'utf-8');

    logger.info('Log files saved', { 
      test: logFiles.test,
      frontend: logFiles.frontend,
      backend: logFiles.backend,
      combined: logFiles.combined
    });

    // Close browser
    if (browser) {
      await browser.close();
      logger.info('Browser closed');
    }
  }
}

// Execute the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runCampaignCreationTest()
    .then(() => {
      console.log('\n✅ Campaign creation test completed successfully!');
      console.log(`📁 Log files saved in: ${config.outputDir}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Campaign creation test failed:', error.message);
      console.log(`📁 Error logs saved in: ${config.outputDir}`);
      process.exit(1);
    });
}

export { runCampaignCreationTest };