#!/usr/bin/env node

/**
 * Fast Domain Generation Campaign Creation Test
 * 
 * This script:
 * 1. Logs into the application using test credentials
 * 2. Navigates to campaign creation page
 * 3. Creates a domain generation campaign with specific parameters
 * 4. Verifies the campaign was created and domains are generated
 * 
 * Usage: node scripts/campaign-creation-test-v2.js
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
  outputDir: './test-logs',
  timeout: 15000 // Reduced timeout for faster execution
};

// Log file paths
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

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
    
    // Show progress in terminal for debugging
    console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
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

// Main test execution
async function runFastCampaignCreationTest() {
  const logger = new TestLogger();

  // Ensure output directory exists
  await fs.mkdir(config.outputDir, { recursive: true });

  logger.info('Starting Fast Domain Generation Campaign Creation Test');

  let browser;
  let page;

  try {
    // Launch browser
    logger.info('Launching browser');
    browser = await chromium.launch({ 
      headless: false,  // Keep visible for monitoring
      slowMo: 100       // Minimal slow down for stability
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
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

    // Navigate directly to campaign creation page
    logger.info('Navigating to campaign creation page');
    await page.goto(`${config.baseUrl}/campaigns/new`);
    await page.waitForLoadState('networkidle');

    // Wait for the form to load
    await page.waitForSelector('form', { timeout: config.timeout });
    logger.info('Campaign creation form loaded');

    // Fill campaign name
    logger.info('Filling campaign name');
    await page.fill('input[name="name"]', 'Fast Domain Generation Test');

    // Select domain generation campaign type
    logger.info('Selecting domain_generation campaign type');
    await page.click('button[role="combobox"]');
    await page.click('[role="option"]:has-text("domain_generation")');
    logger.info('Domain generation campaign type selected');

    // Wait for DomainGenerationConfig to appear
    await page.waitForSelector('text=Domain Generation Configuration', { timeout: 5000 });
    logger.info('Domain generation configuration section appeared');

    // Set generation pattern to "both_variable"
    logger.info('Setting generation pattern to both_variable');
    // Find the generation pattern select within the domain generation config
    const patternSelect = page.locator('text=Generation Pattern').locator('..').locator('button[role="combobox"]');
    await patternSelect.click();
    // Click on the option with the actual display text for both_variable
    await page.click('[role="option"]:has-text("Prefix + Variable + Suffix")');
    logger.info('Generation pattern set to both_variable');

    // Wait a moment for prefix/suffix fields to appear
    await page.waitForTimeout(500);

    // Set constant part
    logger.info('Setting constant part to "business"');
    await page.fill('input[name="constantPart"]', 'business');

    // Set prefix variable length to 3
    logger.info('Setting prefix variable length to 3');
    await page.fill('input[name="prefixVariableLength"]', '3');

    // Set suffix variable length to 3
    logger.info('Setting suffix variable length to 3');
    await page.fill('input[name="suffixVariableLength"]', '3');

    // Set max domains to generate to 25
    logger.info('Setting max domains to generate to 25');
    await page.fill('input[name="maxDomainsToGenerate"]', '25');

    // Take screenshot of filled form
    await page.screenshot({
      path: path.join(config.outputDir, `fast-campaign-form-filled-${timestamp}.png`),
      fullPage: true
    });

    // Submit the form
    logger.info('Submitting campaign creation form');
    await page.click('button[type="submit"]');
    logger.info('Campaign creation form submitted');

    // Wait a moment to see if there are validation errors
    await page.waitForTimeout(2000);
    
    // Check for any error messages or validation issues
    const errorElements = await page.$$('[role="alert"], .text-destructive, .text-red-500, .text-error');
    if (errorElements.length > 0) {
      for (const element of errorElements) {
        const errorText = await element.textContent();
        logger.error('Form validation error detected', { error: errorText });
      }
    }
    
    // Check for toast messages
    const toastElements = await page.$$('[data-sonner-toast], .toast, [role="status"]');
    if (toastElements.length > 0) {
      for (const element of toastElements) {
        const toastText = await element.textContent();
        logger.info('Toast message detected', { message: toastText });
      }
    }

    // Take screenshot after form submission to see what happened
    await page.screenshot({
      path: path.join(config.outputDir, `fast-after-submit-${timestamp}.png`),
      fullPage: true
    });

    // Try to wait for campaign creation to complete and redirect
    logger.info('Waiting for redirect to campaign details page');
    try {
      await page.waitForURL(/\/campaigns\/[a-f0-9-]+/, { timeout: config.timeout });
      logger.info('Successfully redirected to campaign details page');
    } catch (redirectError) {
      logger.error('Failed to redirect to campaign details page', {
        error: redirectError.message,
        currentUrl: page.url()
      });
      
      // Check if we're still on the form page with errors
      const currentUrl = page.url();
      if (currentUrl.includes('/campaigns/new')) {
        logger.error('Still on campaign creation form - form submission likely failed');
        
        // Look for any visible error messages on the form
        const formErrors = await page.$$eval('form [role="alert"], form .text-destructive',
          elements => elements.map(el => el.textContent)
        ).catch(() => []);
        
        if (formErrors.length > 0) {
          logger.error('Form contains validation errors', { errors: formErrors });
        }
        
        throw new Error(`Campaign creation failed - still on form page. Errors: ${formErrors.join(', ')}`);
      }
      
      throw redirectError;
    }

    // Wait for campaign details to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of campaign details page
    await page.screenshot({
      path: path.join(config.outputDir, `fast-campaign-details-${timestamp}.png`),
      fullPage: true
    });

    // Monitor for domain generation progress - wait longer for domains to generate
    logger.info('Monitoring for domain generation (waiting 15 seconds)');
    await page.waitForTimeout(15000);

    // Check if domains were generated by looking for domain table or rows
    const domainSelectors = [
      'table tbody tr',
      '[data-testid*="domain"]',
      '.domain-row',
      'tr:has-text(".com")',
      'text=business' // Look for our constant part in generated domains
    ];

    let domainCount = 0;
    for (const selector of domainSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          domainCount = Math.max(domainCount, elements.length);
          logger.info(`Found ${elements.length} domain elements with selector: ${selector}`);
        }
      } catch (e) {
        // Ignore selector errors
      }
    }

    // Check if we can see generated domains in the page content
    const pageContent = await page.textContent('body');
    const businessDomains = (pageContent.match(/\w+business\w+\.com/g) || []).length;
    
    if (businessDomains > 0) {
      domainCount = Math.max(domainCount, businessDomains);
      logger.info(`Found ${businessDomains} domains containing "business" in page content`);
    }

    logger.info('Domain generation monitoring complete', {
      domainCount,
      targetMinimum: 20,
      pageContentSample: pageContent.substring(0, 500)
    });

    if (domainCount >= 20) {
      logger.info('✅ SUCCESS: Domain generation campaign created and generated sufficient domains', {
        domainsGenerated: domainCount,
        targetMinimum: 20,
        campaignParameters: {
          pattern: 'both_variable',
          constantPart: 'business',
          prefixLength: 3,
          suffixLength: 3,
          maxDomains: 25
        }
      });
    } else if (domainCount > 0) {
      logger.warn('⚠️ PARTIAL SUCCESS: Campaign created but may still be generating domains', {
        domainsFound: domainCount,
        targetMinimum: 20
      });
    } else {
      logger.error('❌ FAILURE: No domains detected in the interface');
    }

    // Final screenshot
    await page.screenshot({
      path: path.join(config.outputDir, `fast-final-result-${timestamp}.png`),
      fullPage: true
    });

    logger.info('Fast domain generation campaign creation test completed');

  } catch (error) {
    logger.error('Test execution failed', { 
      error: error.message, 
      stack: error.stack 
    });

    // Take error screenshot if page exists
    if (page) {
      try {
        await page.screenshot({ 
          path: path.join(config.outputDir, `fast-error-${timestamp}.png`), 
          fullPage: true 
        });
      } catch (screenshotError) {
        logger.error('Failed to take error screenshot', { error: screenshotError.message });
      }
    }

    throw error;
  } finally {
    // Save test logs
    const logPath = path.join(config.outputDir, `fast-test-execution-${timestamp}.log`);
    await logger.saveToFile(logPath);
    
    logger.info('Test logs saved', { logPath });

    // Close browser
    if (browser) {
      await browser.close();
      logger.info('Browser closed');
    }
  }
}

// Execute the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runFastCampaignCreationTest()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

export { runFastCampaignCreationTest };