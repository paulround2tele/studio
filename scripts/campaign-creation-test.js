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
    
    // Silent mode - no terminal output, only file logging
    // All output saved to log files for analysis
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

// B2B Performance and Log Monitoring
class FrontendLogCollector {
  constructor() {
    this.logs = [];
    this.performanceMetrics = {
      healthChecks: [],
      apiCalls: [],
      rerenders: [],
      pageLoads: [],
      networkRequests: [],
      errors: [],
      warnings: [],
      memoryUsage: []
    };
    this.healthCheckCount = 0;
    this.rerenderCount = 0;
    this.requestStartTimes = new Map();
  }

  attachToPage(page, logger) {
    // Collect console logs with B2B performance analysis
    page.on('console', msg => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      this.logs.push(logEntry);
      this.analyzeConsoleMessage(msg, logger);
    });

    // Collect page errors (critical for B2B apps)
    page.on('pageerror', error => {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        type: 'pageerror',
        message: error.message,
        stack: error.stack
      };
      
      this.logs.push(errorEntry);
      this.performanceMetrics.errors.push(errorEntry);
      logger.error('B2B Critical: Frontend Page Error', errorEntry);
    });

    // Monitor network requests with timing
    page.on('request', request => {
      const startTime = Date.now();
      this.requestStartTimes.set(request.url(), startTime);
      
      // Track health check frequency (flag excessive polling)
      if (request.url().includes('/health') || request.url().includes('/ping') ||
          request.url().includes('/api/health') || request.url().includes('/status')) {
        this.healthCheckCount++;
        this.performanceMetrics.healthChecks.push({
          timestamp: new Date().toISOString(),
          url: request.url(),
          count: this.healthCheckCount
        });
        
        // Flag excessive health checking (bad for B2B performance)
        if (this.healthCheckCount > 5) {
          logger.warn('B2B Performance Alert: Excessive Health Checks', {
            count: this.healthCheckCount,
            url: request.url(),
            recommendation: 'Consider reducing health check frequency for better performance'
          });
        }
      }
    });

    // Collect network failures
    page.on('requestfailed', request => {
      const failureEntry = {
        timestamp: new Date().toISOString(),
        type: 'requestfailed',
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText,
        resourceType: request.resourceType()
      };
      
      this.logs.push(failureEntry);
      this.performanceMetrics.errors.push(failureEntry);
      logger.error('B2B Critical: Network Request Failed', failureEntry);
    });

    // Monitor API responses with performance analysis
    page.on('response', response => {
      const endTime = Date.now();
      const startTime = this.requestStartTimes.get(response.url());
      const duration = startTime ? endTime - startTime : null;
      
      if (response.url().includes('/api/')) {
        const responseEntry = {
          timestamp: new Date().toISOString(),
          type: 'api_response',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          duration: duration,
          size: response.headers()['content-length'] || 'unknown'
        };
        
        this.logs.push(responseEntry);
        this.performanceMetrics.apiCalls.push(responseEntry);
        
        // Flag slow API calls (B2B requirement: sub-second responses)
        if (duration && duration > 800) {
          logger.warn('B2B Performance Alert: Slow API Response', {
            url: response.url(),
            duration: `${duration}ms`,
            threshold: '800ms',
            recommendation: 'API response time exceeds B2B standards'
          });
        }
        
        // Flag API errors
        if (response.status() >= 400) {
          logger.error('B2B Critical: API Error Response', {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
        }
      }
      
      this.requestStartTimes.delete(response.url());
    });

    // Inject B2B performance monitoring scripts
    page.addInitScript(() => {
      // Monitor React re-renders (critical for B2B responsiveness)
      if (window.React) {
        const originalCreateElement = window.React.createElement;
        let renderCount = 0;
        let lastRenderTime = Date.now();
        
        window.React.createElement = function(...args) {
          renderCount++;
          const currentTime = Date.now();
          
          // Flag excessive re-renders within short time windows
          if (currentTime - lastRenderTime < 100 && renderCount % 10 === 0) {
            console.warn(`[B2B-PERFORMANCE] Rapid re-renders detected: ${renderCount} renders`);
          }
          
          if (renderCount > 50) {
            console.warn(`[B2B-PERFORMANCE] Excessive re-renders: ${renderCount} total`);
          }
          
          lastRenderTime = currentTime;
          return originalCreateElement.apply(this, args);
        };
      }
      
      // Monitor page load performance
      window.addEventListener('load', () => {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.info(`[B2B-PERFORMANCE] Page load: ${loadTime}ms`);
        
        // Flag slow page loads (B2B standard: under 2 seconds)
        if (loadTime > 2000) {
          console.warn(`[B2B-PERFORMANCE] Slow page load: ${loadTime}ms (threshold: 2000ms)`);
        }
      });
      
      // Monitor memory usage (prevent memory leaks in long B2B sessions)
      if ('memory' in performance) {
        const checkMemory = () => {
          const memory = performance.memory;
          const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
          
          console.info(`[B2B-PERFORMANCE] Memory usage: ${usedMB}MB`);
          
          if (usedMB > 100) {
            console.warn(`[B2B-PERFORMANCE] High memory usage: ${usedMB}MB`);
          }
        };
        
        // Check memory every 10 seconds
        setInterval(checkMemory, 10000);
      }
      
      // Monitor for unnecessary DOM operations
      let domMutationCount = 0;
      const observer = new MutationObserver((mutations) => {
        domMutationCount += mutations.length;
        
        if (domMutationCount > 100) {
          console.warn(`[B2B-PERFORMANCE] Excessive DOM mutations: ${domMutationCount}`);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  }

  analyzeConsoleMessage(msg, logger) {
    const text = msg.text();
    const type = msg.type();
    
    // Analyze B2B performance indicators
    if (text.includes('[B2B-PERFORMANCE]')) {
      if (text.includes('Rapid re-renders')) {
        this.rerenderCount++;
        logger.warn('B2B Performance Issue: Rapid Re-renders Detected', {
          message: text,
          count: this.rerenderCount,
          impact: 'May cause UI lag and poor user experience'
        });
      } else if (text.includes('Slow page load')) {
        logger.warn('B2B Performance Issue: Slow Page Load', {
          message: text,
          impact: 'Exceeds B2B responsiveness standards'
        });
      } else if (text.includes('High memory usage')) {
        logger.warn('B2B Performance Issue: Memory Usage Alert', {
          message: text,
          impact: 'May cause browser slowdown in long sessions'
        });
      } else if (text.includes('Excessive DOM mutations')) {
        logger.warn('B2B Performance Issue: DOM Thrashing', {
          message: text,
          impact: 'Unnecessary DOM operations affecting performance'
        });
      }
    }
    
    // Monitor React warnings (can impact B2B performance)
    if (type === 'warning' && (text.includes('React') || text.includes('Warning'))) {
      this.performanceMetrics.warnings.push({
        timestamp: new Date().toISOString(),
        message: text,
        type: 'react_warning'
      });
      logger.warn('B2B Code Quality Alert: React Warning', {
        message: text,
        impact: 'May degrade performance or cause unexpected behavior'
      });
    }
    
    // Monitor for unnecessary API calls
    if (text.includes('api') && text.includes('call')) {
      logger.debug('API Activity Detected', { message: text });
    }
  }

  generateB2BPerformanceReport() {
    const report = {
      summary: {
        totalApiCalls: this.performanceMetrics.apiCalls.length,
        totalHealthChecks: this.performanceMetrics.healthChecks.length,
        totalRerenders: this.rerenderCount,
        totalErrors: this.performanceMetrics.errors.length,
        totalWarnings: this.performanceMetrics.warnings.length,
        avgApiResponseTime: this.calculateAverageApiTime()
      },
      b2bPerformanceIssues: {
        slowApiCalls: this.performanceMetrics.apiCalls.filter(call => call.duration > 800),
        excessiveHealthChecks: this.healthCheckCount > 5,
        performanceWarnings: this.performanceMetrics.warnings,
        criticalErrors: this.performanceMetrics.errors,
        healthCheckFrequency: `${this.healthCheckCount} checks detected`
      },
      recommendations: this.generateB2BRecommendations(),
      detailedMetrics: this.performanceMetrics
    };
    
    return report;
  }

  calculateAverageApiTime() {
    const apiCallsWithTiming = this.performanceMetrics.apiCalls.filter(call => call.duration);
    if (apiCallsWithTiming.length === 0) return 0;
    
    const totalTime = apiCallsWithTiming.reduce((sum, call) => sum + call.duration, 0);
    return Math.round(totalTime / apiCallsWithTiming.length);
  }

  generateB2BRecommendations() {
    const recommendations = [];
    
    if (this.healthCheckCount > 5) {
      recommendations.push('Reduce health check frequency to improve performance');
    }
    
    if (this.rerenderCount > 20) {
      recommendations.push('Optimize React components to reduce unnecessary re-renders');
    }
    
    const slowCalls = this.performanceMetrics.apiCalls.filter(call => call.duration > 800);
    if (slowCalls.length > 0) {
      recommendations.push('Optimize slow API endpoints for better B2B responsiveness');
    }
    
    if (this.performanceMetrics.errors.length > 0) {
      recommendations.push('Address critical errors that impact user experience');
    }
    
    return recommendations;
  }

  async saveToFile(filepath) {
    const performanceReport = this.generateB2BPerformanceReport();
    
    const content = [
      '=== B2B PERFORMANCE ANALYSIS REPORT ===\n',
      JSON.stringify(performanceReport, null, 2),
      '\n\n=== DETAILED LOGS ===\n',
      this.logs.map(entry => {
        return `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${JSON.stringify(entry, null, 2)}`;
      }).join('\n')
    ].join('');
    
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
    // Save all logs with B2B performance report
    logger.info('Saving log files with B2B performance analysis');
    
    await Promise.all([
      logger.saveToFile(logFiles.test),
      frontendLogs.saveToFile(logFiles.frontend),
      backendLogs.saveToFile(logFiles.backend)
    ]);

    // Generate B2B Performance Report
    const performanceReport = frontendLogs.generateB2BPerformanceReport();
    const performanceReportPath = path.join(config.outputDir, `b2b-performance-report-${timestamp}.json`);
    await fs.writeFile(performanceReportPath, JSON.stringify(performanceReport, null, 2), 'utf-8');

    // Create combined log file with performance summary
    const combinedLogs = [
      '=== B2B PERFORMANCE SUMMARY ===\n',
      `API Calls: ${performanceReport.summary.totalApiCalls}`,
      `Avg Response Time: ${performanceReport.summary.avgApiResponseTime}ms`,
      `Health Checks: ${performanceReport.summary.totalHealthChecks}`,
      `Re-renders: ${performanceReport.summary.totalRerenders}`,
      `Errors: ${performanceReport.summary.totalErrors}`,
      `Warnings: ${performanceReport.summary.totalWarnings}`,
      '\nRECOMMENDATIONS:',
      ...performanceReport.recommendations.map(rec => `- ${rec}`),
      '\n\n=== TEST EXECUTION LOGS ===\n',
      await fs.readFile(logFiles.test, 'utf-8'),
      '\n\n=== FRONTEND LOGS WITH PERFORMANCE ANALYSIS ===\n',
      await fs.readFile(logFiles.frontend, 'utf-8'),
      '\n\n=== BACKEND LOGS ===\n',
      await fs.readFile(logFiles.backend, 'utf-8')
    ].join('\n');

    await fs.writeFile(logFiles.combined, combinedLogs, 'utf-8');

    logger.info('All log files saved with B2B performance analysis', {
      test: logFiles.test,
      frontend: logFiles.frontend,
      backend: logFiles.backend,
      combined: logFiles.combined,
      performanceReport: performanceReportPath
    });

    // Close browser
    if (browser) {
      await browser.close();
      logger.info('Browser closed');
    }
  }
}

// Execute the test - COMPLETELY SILENT for B2B monitoring
if (import.meta.url === `file://${process.argv[1]}`) {
  runCampaignCreationTest()
    .then(() => {
      // Silent success - all output saved to log files only
      process.exit(0);
    })
    .catch((error) => {
      // Silent failure - error details saved to log files only
      process.exit(1);
    });
}

export { runCampaignCreationTest };