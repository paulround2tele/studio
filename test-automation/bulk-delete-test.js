#!/usr/bin/env node

/**
 * Bulk Campaign Delete Test - Playwright Script
 * 
 * Tests the fixes for:
 * 1. Progress bar always showing 0%
 * 2. Unreliable delete campaign button
 * 
 * This script will:
 * - Login with test@example.com / password123
 * - Navigate to campaigns page
 * - Select all campaigns 
 * - Delete them all using bulk delete
 * - Capture comprehensive logs throughout
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Enhanced Configuration for bulk delete testing
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8080',
  headless: false, // Keep visible to see the delete process
  timeout: 15000, // Longer timeout for delete operations
  screenshotDir: './test-automation/screenshots/bulk-delete',
  logDir: './test-automation/logs/bulk-delete',
  serverLogsDir: './test-automation/server-logs/bulk-delete',
  viewport: { width: 1920, height: 1080 },
  // Enhanced logging for delete operations
  captureServerLogs: true,
  captureNetworkLogs: true,
  captureBrowserLogs: true,
  deleteOperationTimeout: 30000, // 30 seconds for delete operations
  postDeleteWaitTime: 5000 // 5 seconds after delete to capture logs
};

// Test credentials
const TEST_CREDENTIALS = {
  username: 'test@example.com',
  password: 'password123'
};

class BulkDeleteLogger {
  constructor() {
    this.logs = [];
    this.browserLogs = [];
    this.networkLogs = [];
    this.deleteOperations = [];
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

  logDeleteOperation(operation, stage, data = null) {
    const timestamp = new Date().toISOString();
    const deleteLog = { timestamp, operation, stage, data };
    this.deleteOperations.push(deleteLog);
    console.log(`[${timestamp}] [DELETE-${operation.toUpperCase()}] ${stage}`);
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
    
    // Special logging for delete-related requests
    if (request.url().includes('/campaigns') && request.method() === 'DELETE') {
      this.logDeleteOperation('api', `DELETE ${request.url()}`, {
        status: response?.status(),
        headers: response?.headers()
      });
    }
    
    console.log(`[${timestamp}] [NETWORK] ${request.method()} ${request.url()} -> ${response?.status() || 'PENDING'}`);
  }

  async saveAllLogs() {
    try {
      await fs.mkdir(CONFIG.logDir, { recursive: true });
      
      const timestamp = Date.now();
      
      // Save main logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `bulk-delete-logs-${timestamp}.json`),
        JSON.stringify(this.logs, null, 2)
      );
      
      // Save browser logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `browser-logs-${timestamp}.json`),
        JSON.stringify(this.browserLogs, null, 2)
      );
      
      // Save network logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `network-logs-${timestamp}.json`),
        JSON.stringify(this.networkLogs, null, 2)
      );
      
      // Save delete operation logs
      await fs.writeFile(
        path.join(CONFIG.logDir, `delete-operations-${timestamp}.json`),
        JSON.stringify(this.deleteOperations, null, 2)
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

class BulkDeleteTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.logger = new BulkDeleteLogger();
    this.screenshotCounter = 0;
    this.campaignsFound = [];
    this.deleteStartTime = null;
  }

  async initialize() {
    this.logger.info('Initializing Bulk Delete Test Environment...');
    
    await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
    await fs.mkdir(CONFIG.logDir, { recursive: true });
    await fs.mkdir(CONFIG.serverLogsDir, { recursive: true });

    // Launch browser with enhanced settings for delete operations
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: 100, // Slight delay to better observe delete operations
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    this.context = await this.browser.newContext({
      viewport: CONFIG.viewport,
      ignoreHTTPSErrors: true
    });

    this.page = await this.context.newPage();

    // Enhanced console logging
    this.page.on('console', msg => {
      const level = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      this.logger.logBrowser(level, text, `${location.url}:${location.lineNumber}:${location.columnNumber}`);
      
      // Special attention to delete-related console messages
      if (text.includes('delete') || text.includes('Delete') || text.includes('bulk')) {
        this.logger.logDeleteOperation('frontend', `Console: ${text}`);
      }
    });

    // Enhanced network logging focused on delete operations
    this.page.on('request', request => {
      this.logger.logNetwork(request);
    });

    this.page.on('response', response => {
      this.logger.logNetwork(response.request(), response);
    });

    this.logger.success('Test environment ready');
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

  // Login functionality
  async login() {
    this.logger.info('=== LOGIN PHASE ===');
    
    await this.page.goto(`${CONFIG.frontendUrl}/login`);
    
    // Wait for form to load
    await this.page.waitForSelector('form', { timeout: CONFIG.timeout });
    await this.takeScreenshot('login-page');
    
    // Fill credentials
    await this.page.fill('input[type="email"], input[name="username"]', TEST_CREDENTIALS.username);
    await this.page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    
    // Submit and wait for navigation
    const navigationPromise = this.page.waitForURL(url => !url.href.includes('/login'), { timeout: CONFIG.timeout });
    await this.page.click('button[type="submit"]');
    await navigationPromise;
    
    await this.takeScreenshot('login-success');
    this.logger.success('Login completed successfully');
    return true;
  }

  // Navigate to campaigns page and analyze current state
  async navigateToCampaigns() {
    this.logger.info('=== CAMPAIGNS PAGE NAVIGATION ===');
    
    await this.page.goto(`${CONFIG.frontendUrl}/campaigns`);
    
    // Wait for page to load completely
    await this.page.waitForSelector('h1, [role="main"]', { timeout: CONFIG.timeout });
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('campaigns-page-loaded');
    
    // Analyze current campaign state
    const campaignState = await this.page.evaluate(() => {
      // Look for campaign cards
      const campaignCards = document.querySelectorAll('.shadow-md');
      const emptyState = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent && el.textContent.includes('No campaigns found')
      );
      const bulkSelectCheckbox = document.querySelector('input[type="checkbox"][aria-label*="Select all"]');
      const bulkDeleteButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Delete')
      );
      
      return {
        campaignCount: campaignCards.length,
        hasEmptyState: !!emptyState,
        hasBulkSelectCheckbox: !!bulkSelectCheckbox,
        hasBulkDeleteButton: !!bulkDeleteButton,
        campaignCards: Array.from(campaignCards).map((card, index) => {
          const nameElement = card.querySelector('h3, .text-xl');
          const statusElement = card.querySelector('.badge, .status');
          const checkboxElement = card.querySelector('input[type="checkbox"]');
          const deleteButton = Array.from(card.querySelectorAll('button')).find(btn =>
            btn.textContent.includes('Delete')
          );
          
          return {
            index,
            name: nameElement?.textContent?.trim() || `Campaign ${index + 1}`,
            status: statusElement?.textContent?.trim() || 'Unknown',
            hasCheckbox: !!checkboxElement,
            hasDeleteButton: !!deleteButton,
            checkboxEnabled: checkboxElement ? !checkboxElement.disabled : false
          };
        })
      };
    });
    
    this.logger.info('Campaign page state analysis:', campaignState);
    this.campaignsFound = campaignState.campaignCards;
    
    if (campaignState.campaignCount === 0) {
      this.logger.warn('No campaigns found on the page');
      return { hasCampaigns: false, count: 0 };
    } else {
      this.logger.success(`Found ${campaignState.campaignCount} campaigns to test deletion on`);
      return { hasCampaigns: true, count: campaignState.campaignCount, state: campaignState };
    }
  }

  // Test progress bar functionality before deletion
  async testProgressBars() {
    this.logger.info('=== PROGRESS BAR TESTING ===');
    
    const progressData = await this.page.evaluate(() => {
      const progressBars = document.querySelectorAll('.progress, [role="progressbar"]');
      const progressValues = [];
      
      progressBars.forEach((bar, index) => {
        const valueElement = bar.querySelector('[data-value], .progress-value');
        const textElement = bar.nextElementSibling || bar.previousElementSibling;
        const percentageText = textElement?.textContent?.match(/(\d+)%/);
        
        progressValues.push({
          index,
          hasValueAttribute: !!valueElement,
          value: valueElement?.getAttribute('data-value') || valueElement?.style?.width || 'unknown',
          percentageFromText: percentageText ? percentageText[1] : 'unknown',
          barHTML: bar.outerHTML.substring(0, 200) // First 200 chars for debugging
        });
      });
      
      return {
        totalProgressBars: progressBars.length,
        progressValues
      };
    });
    
    this.logger.info('Progress bar analysis:', progressData);
    
    // Check if any progress bars are showing 0%
    const zeroProgressBars = progressData.progressValues.filter(
      bar => bar.percentageFromText === '0' || bar.value === '0%'
    );
    
    if (zeroProgressBars.length > 0) {
      this.logger.warn(`Found ${zeroProgressBars.length} progress bars showing 0%:`, zeroProgressBars);
    } else {
      this.logger.success('Progress bars appear to be working correctly');
    }
    
    await this.takeScreenshot('progress-bars-analysis');
    return progressData;
  }

  // Test campaign selection with progressive disclosure workflow
  async testCampaignSelection() {
    this.logger.info('=== CAMPAIGN SELECTION TESTING ===');
    this.logger.info('Testing progressive disclosure: Select All → Individual checkboxes → Bulk delete');
    
    // Step 1: Look for the "Select All" checkbox in bulk actions toolbar
    const selectAllResult = await this.page.evaluate(() => {
      // The shadcn Checkbox component renders as a button, not an input
      const selectAllCheckbox = document.querySelector('button[role="checkbox"][aria-label*="Select all"], button[role="checkbox"][aria-label*="campaigns"]');
      
      if (!selectAllCheckbox) {
        return { found: false };
      }
      
      const initialChecked = selectAllCheckbox.getAttribute('aria-checked') === 'true';
      const isEnabled = !selectAllCheckbox.disabled;
      
      return {
        found: true,
        initialChecked,
        isEnabled,
        ariaLabel: selectAllCheckbox.getAttribute('aria-label')
      };
    });
    
    this.logger.info('Select All checkbox found:', selectAllResult);
    
    if (!selectAllResult.found) {
      this.logger.warn('Select All checkbox not found - bulk selection may not be available');
      return {
        individual: [],
        selectAll: { found: false, reason: 'Select All checkbox not found' }
      };
    }
    
    // Step 2: Click "Select All" to enable individual campaign checkboxes (progressive disclosure)
    this.logger.info('Clicking Select All to enable individual campaign selection...');
    
    try {
      // Click the shadcn Checkbox component (renders as button)
      await this.page.click('button[role="checkbox"][aria-label*="Select all"], button[role="checkbox"][aria-label*="campaigns"]');
      await this.page.waitForTimeout(1000); // Wait for UI to update
      
      this.logger.info('Select All clicked - individual checkboxes should now be visible');
      await this.takeScreenshot('select-all-clicked');
      
    } catch (error) {
      this.logger.error('Failed to click Select All checkbox:', error.message);
      return {
        individual: [],
        selectAll: { found: true, error: 'Failed to click Select All' }
      };
    }
    
    // Step 3: Now check for individual campaign checkboxes (should be visible after Select All)
    const individualSelectionResults = await this.page.evaluate(() => {
      const checkboxes = document.querySelectorAll('button[role="checkbox"]');
      const results = [];
      
      checkboxes.forEach((checkbox, index) => {
        const ariaLabel = checkbox.getAttribute('aria-label') || '';
        
        // Look specifically for campaign selection checkboxes, not the "Select All" checkbox
        if (ariaLabel.includes('Select campaign') ||
            (ariaLabel.includes('campaign') && !ariaLabel.includes('Select all'))) {
          
          const isEnabled = !checkbox.disabled;
          const isChecked = checkbox.getAttribute('aria-checked') === 'true';
          const isVisible = checkbox.offsetParent !== null;
          
          results.push({
            index,
            ariaLabel,
            enabled: isEnabled,
            checked: isChecked,
            visible: isVisible,
            selectionAvailable: isEnabled && isVisible
          });
        }
      });
      
      return results;
    });
    
    this.logger.info(`Found ${individualSelectionResults.length} individual campaign checkboxes after Select All`);
    this.logger.info('Individual campaign selection results:', individualSelectionResults);
    await this.takeScreenshot('individual-checkboxes-visible');
    
    // Step 4: Verify bulk delete button is now available
    const bulkDeleteButtonCheck = await this.page.evaluate(() => {
      const deleteButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Delete')
      );
      const bulkDeleteButton = deleteButtons.find(btn =>
        btn.textContent.includes('Campaign') || btn.textContent.match(/Delete\s+\d+/)
      );
      
      if (bulkDeleteButton) {
        return {
          found: true,
          text: bulkDeleteButton.textContent.trim(),
          enabled: !bulkDeleteButton.disabled,
          visible: bulkDeleteButton.offsetParent !== null
        };
      } else {
        return {
          found: false,
          availableDeleteButtons: deleteButtons.length,
          buttonTexts: deleteButtons.map(btn => btn.textContent.trim())
        };
      }
    });
    
    this.logger.info('Bulk delete button availability after selection:', bulkDeleteButtonCheck);
    await this.takeScreenshot('bulk-delete-button-check');
    
    // Step 5: Get final selection state
    const finalSelectionState = await this.page.evaluate(() => {
      const selectAllCheckbox = document.querySelector('button[role="checkbox"][aria-label*="Select all"], button[role="checkbox"][aria-label*="campaigns"]');
      const individualCheckboxes = document.querySelectorAll('button[role="checkbox"]:not([aria-label*="Select all"])');
      const selectedCount = Array.from(individualCheckboxes).filter(cb => cb.getAttribute('aria-checked') === 'true').length;
      
      return {
        selectAllChecked: selectAllCheckbox ? selectAllCheckbox.getAttribute('aria-checked') === 'true' : false,
        totalIndividualCheckboxes: individualCheckboxes.length,
        selectedCount: selectedCount,
        allSelected: selectedCount > 0 && selectedCount === individualCheckboxes.length
      };
    });
    
    this.logger.info('Final selection state:', finalSelectionState);
    
    return {
      individual: individualSelectionResults,
      selectAll: {
        ...selectAllResult,
        clickSuccessful: true,
        finalState: finalSelectionState
      },
      bulkDeleteButton: bulkDeleteButtonCheck
    };
  }

  // Test bulk delete functionality
  async testBulkDelete() {
    this.logger.info('=== BULK DELETE TESTING ===');
    this.deleteStartTime = Date.now();
    this.logger.logDeleteOperation('bulk', 'Starting bulk delete test');
    
    // First, ensure all campaigns are selected
    const selectionResult = await this.page.evaluate(() => {
      const selectAllCheckbox = document.querySelector('button[role="checkbox"][aria-label*="Select all"]');
      
      if (selectAllCheckbox && selectAllCheckbox.getAttribute('aria-checked') !== 'true') {
        selectAllCheckbox.click();
      }
      
      // Count selected campaigns
      const individualCheckboxes = document.querySelectorAll('button[role="checkbox"]:not([aria-label*="Select all"])');
      const selectedCount = Array.from(individualCheckboxes).filter(cb => cb.getAttribute('aria-checked') === 'true').length;
      
      return {
        selectedCount,
        totalCheckboxes: individualCheckboxes.length
      };
    });
    
    this.logger.logDeleteOperation('bulk', 'Campaigns selected for deletion', selectionResult);
    await this.takeScreenshot('campaigns-selected-for-deletion');
    
    if (selectionResult.selectedCount === 0) {
      this.logger.warn('No campaigns selected for deletion');
      return { success: false, reason: 'No campaigns selected' };
    }
    
    // Look for bulk delete button
    const deleteButtonInfo = await this.page.evaluate(() => {
      const deleteButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent.includes('Delete')
      );
      const bulkDeleteButton = deleteButtons.find(btn =>
        btn.textContent.includes('Campaign') || btn.textContent.match(/Delete\s+\d+/)
      );
      
      if (bulkDeleteButton) {
        return {
          found: true,
          text: bulkDeleteButton.textContent.trim(),
          enabled: !bulkDeleteButton.disabled,
          visible: bulkDeleteButton.offsetParent !== null
        };
      } else {
        return {
          found: false,
          availableButtons: deleteButtons.length,
          buttonTexts: deleteButtons.map(btn => btn.textContent.trim())
        };
      }
    });
    
    this.logger.logDeleteOperation('bulk', 'Delete button analysis', deleteButtonInfo);
    
    if (!deleteButtonInfo.found) {
      this.logger.error('Bulk delete button not found', deleteButtonInfo);
      await this.takeScreenshot('bulk-delete-button-not-found');
      return { success: false, reason: 'Bulk delete button not found' };
    }
    
    if (!deleteButtonInfo.enabled) {
      this.logger.error('Bulk delete button is disabled');
      await this.takeScreenshot('bulk-delete-button-disabled');
      return { success: false, reason: 'Bulk delete button disabled' };
    }
    
    // Click the bulk delete button
    this.logger.logDeleteOperation('bulk', 'Clicking bulk delete button');
    
    try {
      // Find and click the bulk delete button
      const bulkDeleteButton = this.page.locator('button').filter({
        hasText: /Delete.*\d+|Delete.*Campaign/
      });
      
      const buttonCount = await bulkDeleteButton.count();
      this.logger.info(`Found ${buttonCount} potential bulk delete buttons`);
      
      if (buttonCount > 0) {
        // Take screenshot before clicking
        await this.takeScreenshot('before-bulk-delete-click');
        
        // Click the button and wait for any confirmation dialog
        await bulkDeleteButton.first().click();
        
        // Wait for potential confirmation dialog
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot('after-bulk-delete-click');
        
        // Check if a confirmation dialog appeared
        const confirmationDialog = await this.page.evaluate(() => {
          const dialogs = document.querySelectorAll('[role="dialog"], .modal, .alert-dialog');
          const confirmButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
            btn.textContent.includes('Delete') || btn.textContent.includes('Confirm')
          );
          
          return {
            dialogsFound: dialogs.length,
            confirmButtonsFound: confirmButtons.length,
            dialogTexts: Array.from(dialogs).map(d => d.textContent?.trim().substring(0, 100))
          };
        });
        
        this.logger.logDeleteOperation('bulk', 'Confirmation dialog check', confirmationDialog);
        
        if (confirmationDialog.dialogsFound > 0 || confirmationDialog.confirmButtonsFound > 0) {
          this.logger.logDeleteOperation('bulk', 'Confirmation dialog detected, confirming deletion');
          
          // Look for confirmation button and click it
          const confirmButton = this.page.locator('button').filter({
            hasText: /Delete|Confirm/
          }).first();
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
            this.logger.logDeleteOperation('bulk', 'Confirmation button clicked');
          }
        }
        
        // Wait for deletion to process
        this.logger.logDeleteOperation('bulk', 'Waiting for deletion to process...');
        await this.page.waitForTimeout(CONFIG.deleteOperationTimeout);
        
        // Take screenshot after deletion
        await this.takeScreenshot('after-bulk-delete-process');
        
        // Check the final state
        const finalState = await this.page.evaluate(() => {
          const campaignCards = document.querySelectorAll('.shadow-md');
          const emptyState = Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent && el.textContent.includes('No campaigns found')
          );
          const errorMessages = document.querySelectorAll('.error, .alert-error, [data-testid="error"]');
          const successMessages = document.querySelectorAll('.success, .alert-success, [data-testid="success"]');
          
          return {
            remainingCampaigns: campaignCards.length,
            hasEmptyState: !!emptyState,
            errorMessages: Array.from(errorMessages).map(el => el.textContent?.trim()),
            successMessages: Array.from(successMessages).map(el => el.textContent?.trim())
          };
        });
        
        this.logger.logDeleteOperation('bulk', 'Final state after deletion', finalState);
        
        // Additional wait to capture any delayed responses
        await this.page.waitForTimeout(CONFIG.postDeleteWaitTime);
        await this.takeScreenshot('final-state-post-delete');
        
        const deleteSuccess = finalState.remainingCampaigns === 0 || finalState.hasEmptyState;
        
        return {
          success: deleteSuccess,
          finalState,
          originalCount: selectionResult.selectedCount,
          remainingCount: finalState.remainingCampaigns
        };
        
      } else {
        this.logger.error('No bulk delete button found to click');
        return { success: false, reason: 'No clickable delete button found' };
      }
      
    } catch (error) {
      this.logger.error('Bulk delete operation failed:', error.message);
      await this.takeScreenshot('bulk-delete-error');
      return { success: false, error: error.message };
    }
  }

  // Main test execution
  async runBulkDeleteTest() {
    const results = {};
    
    try {
      await this.initialize();
      
      // Phase 1: Login
      this.logger.info('🔐 PHASE 1: Authentication');
      results.login = await this.login();
      
      if (!results.login) {
        throw new Error('Login failed - cannot proceed with delete tests');
      }
      
      // Phase 2: Navigate to campaigns
      this.logger.info('📋 PHASE 2: Campaign Page Navigation');
      results.navigation = await this.navigateToCampaigns();
      
      if (!results.navigation.hasCampaigns) {
        this.logger.warn('No campaigns found - creating test campaigns first would be recommended');
        return { ...results, skipped: true, reason: 'No campaigns to delete' };
      }
      
      // Phase 3: Test progress bars (verify fix)
      this.logger.info('📊 PHASE 3: Progress Bar Verification');
      results.progressBars = await this.testProgressBars();
      
      // Phase 4: Test campaign selection
      this.logger.info('✅ PHASE 4: Campaign Selection Testing');
      results.selection = await this.testCampaignSelection();
      
      // Phase 5: Test bulk delete (verify fix)
      this.logger.info('🗑️ PHASE 5: Bulk Delete Operation');
      results.bulkDelete = await this.testBulkDelete();
      
      this.logger.success('=== BULK DELETE TEST COMPLETED ===');
      
    } catch (error) {
      this.logger.error('Bulk delete test failed:', error.message);
      await this.takeScreenshot('test-failure');
      results.error = error.message;
    } finally {
      // Save all logs
      await this.logger.saveAllLogs();
      
      if (this.browser) {
        await this.browser.close();
      }
    }
    
    return results;
  }
}

// Main execution function
async function main() {
  const tester = new BulkDeleteTester();
  
  try {
    console.log('🚀 Starting Bulk Campaign Delete Test...');
    console.log(`📊 Configuration:`, CONFIG);
    console.log('=====================================\n');
    
    const results = await tester.runBulkDeleteTest();
    
    console.log('\n=====================================');
    console.log('⚡ Bulk Delete Test Results:');
    console.log('=====================================');
    console.log(`🔐 Login: ${results.login ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`📋 Navigation: ${results.navigation?.hasCampaigns ? '✅ CAMPAIGNS FOUND' : '📄 NO CAMPAIGNS'}`);
    
    if (results.navigation?.hasCampaigns) {
      console.log(`   Found ${results.navigation.count} campaigns to test`);
    }
    
    if (results.progressBars) {
      const zeroProgressCount = results.progressBars.progressValues?.filter(
        bar => bar.percentageFromText === '0' || bar.value === '0%'
      ).length || 0;
      
      console.log(`📊 Progress Bars: ${zeroProgressCount === 0 ? '✅ WORKING' : `⚠️ ${zeroProgressCount} SHOWING 0%`}`);
      console.log(`   Total progress bars found: ${results.progressBars.totalProgressBars}`);
    }
    
    if (results.selection) {
      const individualWorking = results.selection.individual?.filter(s => s.selectionWorked).length || 0;
      const selectAllWorking = results.selection.selectAll?.selectionWorked;
      
      console.log(`✅ Selection: Individual (${individualWorking} working), Select All (${selectAllWorking ? '✅' : '❌'})`);
    }
    
    if (results.bulkDelete) {
      console.log(`🗑️ Bulk Delete: ${results.bulkDelete.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (results.bulkDelete.success) {
        console.log(`   Deleted ${results.bulkDelete.originalCount} campaigns, ${results.bulkDelete.remainingCount} remaining`);
      } else {
        console.log(`   Reason: ${results.bulkDelete.reason || results.bulkDelete.error || 'Unknown'}`);
      }
    }
    
    if (results.skipped) {
      console.log(`⏭️ Test Skipped: ${results.reason}`);
    }
    
    console.log('\n📸 Screenshots saved to:', CONFIG.screenshotDir);
    console.log('📋 Test logs saved to:', CONFIG.logDir);
    console.log('🖥️ Server logs saved to:', CONFIG.serverLogsDir);
    
    // Analyze results for issues
    console.log('\n🔍 ISSUE ANALYSIS:');
    let issuesFound = 0;
    
    if (results.progressBars) {
      const zeroProgressCount = results.progressBars.progressValues?.filter(
        bar => bar.percentageFromText === '0' || bar.value === '0%'
      ).length || 0;
      
      if (zeroProgressCount > 0) {
        console.log(`❌ ISSUE: ${zeroProgressCount} progress bars still showing 0%`);
        issuesFound++;
      }
    }
    
    if (results.bulkDelete && !results.bulkDelete.success && !results.skipped) {
      console.log(`❌ ISSUE: Bulk delete failed - ${results.bulkDelete.reason || 'Unknown reason'}`);
      issuesFound++;
    }
    
    if (results.selection?.selectAll && !results.selection.selectAll.selectionWorked) {
      console.log(`❌ ISSUE: Select All functionality not working`);
      issuesFound++;
    }
    
    if (issuesFound === 0) {
      console.log(`✅ No issues detected - all fixes appear to be working!`);
    } else {
      console.log(`⚠️ Found ${issuesFound} issues that need attention`);
    }
    
    process.exit(issuesFound === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Bulk delete test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BulkDeleteTester, CONFIG };