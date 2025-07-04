#!/usr/bin/env node

/**
 * End-to-End Campaign Creation Test Script
 * 
 * Tests the complete campaign creation workflow with real-time updates:
 * 1. Login as valid user
 * 2. Navigate to campaign creation
 * 3. Select domain_generation campaign type
 * 4. Fill and submit campaign form
 * 5. Verify campaign creation and real-time updates
 * 
 * Usage: node scripts/e2e-campaign-test.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const CONFIG = {
  frontend_url: 'http://localhost:3000',
  backend_url: 'http://localhost:8080',
  credentials: {
    email: 'test@example.com',
    password: 'password123'
  },
  campaign: {
    name: 'E2E Test Domain Generation Campaign',
    type: 'domain_generation',
    description: 'Automated test campaign for QA verification'
  },
  screenshot_dir: './test-videos',
  timeout: 30000
};

class E2ECampaignTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      steps: [],
      errors: [],
      screenshots: [],
      startTime: new Date(),
      endTime: null
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.testResults.steps.push(logEntry);
    
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Screenshots removed per user request

  async waitForElement(selector, timeout = CONFIG.timeout) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      await this.log(`Element not found: ${selector} - ${error.message}`, 'error');
      return false;
    }
  }

  async verifyApiResponse(apiCall, expectedStatus = 200) {
    try {
      const response = await apiCall;
      const acceptableStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
      
      if (acceptableStatuses.includes(response.status())) {
        await this.log(`API call successful: ${response.url()} - Status: ${response.status()}`);
        return await response.json();
      } else {
        await this.log(`API call failed: ${response.url()} - Status: ${response.status()}, Expected: ${acceptableStatuses.join(' or ')}`, 'error');
        return null;
      }
    } catch (error) {
      await this.log(`API call error: ${error.message}`, 'error');
      return null;
    }
  }

  async setup() {
    await this.log('Setting up browser and page...');
    
    this.browser = await chromium.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport size
    await this.page.setViewportSize({ width: 1200, height: 800 });
    
    // CAPTURE ALL CONSOLE LOGS
    this.page.on('console', msg => {
      console.log(`🖥️  BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
      this.testResults.errors.push({
        type: 'console_log',
        level: msg.type(),
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // CAPTURE ALL NETWORK REQUESTS
    this.page.on('request', request => {
      console.log(`📤 NETWORK REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📤 REQUEST BODY: ${request.postData().substring(0, 200)}...`);
      }
    });
    
    this.page.on('response', response => {
      console.log(`📥 NETWORK RESPONSE: ${response.status()} ${response.url()}`);
      this.testResults.errors.push({
        type: 'network_response',
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        timestamp: new Date().toISOString()
      });
    });
    
    // CAPTURE WEBSOCKET ACTIVITY
    this.page.on('websocket', ws => {
      console.log(`🔌 WEBSOCKET CONNECTED: ${ws.url()}`);
      
      ws.on('framesent', event => {
        console.log(`📤 WS FRAME SENT: ${event.payload.substring(0, 200)}...`);
      });
      
      ws.on('framereceived', event => {
        console.log(`📥 WS FRAME RECEIVED: ${event.payload.substring(0, 200)}...`);
      });
      
      ws.on('close', () => {
        console.log(`🔌 WEBSOCKET CLOSED: ${ws.url()}`);
      });
    });
    
    await this.log('Browser setup complete');
  }

  async step1_login() {
    await this.log('STEP 1: Starting login process...');
    
    // Navigate to frontend
    await this.page.goto(CONFIG.frontend_url);
    
    // Wait for login form
    const loginFormFound = await this.waitForElement('input[type="email"]');
    if (!loginFormFound) {
      throw new Error('Login form not found');
    }
    
    // Fill credentials
    await this.page.fill('input[type="email"]', CONFIG.credentials.email);
    await this.page.fill('input[type="password"]', CONFIG.credentials.password);
    
    // Monitor login API call
    const loginPromise = this.page.waitForResponse(response =>
      response.url().includes('/login') && response.status() === 200
    );
    
    // Submit login
    await this.page.click('button[type="submit"]');
    
    // Wait for login to complete
    const loginResponse = await loginPromise;
    const loginData = await this.verifyApiResponse(loginResponse, 200);
    
    if (!loginData) {
      throw new Error('Login API call failed');
    }
    
    // Wait for dashboard to load
    await this.waitForElement('text=Dashboard');
    
    await this.log(`Login successful - User ID: ${loginData.user?.id || 'unknown'}`);
  }

  async step2_navigateToCampaigns() {
    await this.log('STEP 2: Navigating to campaigns page...');
    
    // Click on campaigns navigation or "Go to Campaigns" button
    const campaignsButton = await this.page.locator('text=Go to Campaigns').first();
    await campaignsButton.click();
    
    // Wait for campaigns page to load
    await this.waitForElement('text=Create New Campaign');
    
    await this.log('Successfully navigated to campaigns page');
  }

  async step3_startCampaignCreation() {
    await this.log('STEP 3: Starting campaign creation...');
    
    // Click "Create New Campaign" button
    await this.page.click('text=Create New Campaign');
    
    // Wait for campaign creation form
    await this.waitForElement('text=Campaign Configuration');
    
    await this.log('Campaign creation form loaded');
  }

  async step4_fillCampaignForm() {
    await this.log('STEP 4: Filling campaign form...');
    
    // Fill campaign name
    const nameField = this.page.locator('input[placeholder*="Campaign Name"], input[name="name"]').first();
    await nameField.fill(CONFIG.campaign.name);
    
    // Fill description if field exists
    const descField = this.page.locator('textarea[placeholder*="description"], textarea[name="description"]').first();
    if (await descField.count() > 0) {
      await descField.fill(CONFIG.campaign.description);
    }
    
    // Select campaign type
    const typeDropdown = this.page.locator('select, [role="combobox"]').first();
    await typeDropdown.click();
    
    // Wait for dropdown options and select domain_generation
    await this.page.waitForSelector('text=domain_generation');
    await this.page.click('text=domain_generation');
    
    // Wait for domain generation specific fields to appear
    await this.waitForElement('text=Domain Generation Configuration');
    
    // Verify domain generation fields are populated with defaults
    const constantPartField = this.page.locator('input[name="constant_part"], input[value="business"]').first();
    if (await constantPartField.count() > 0) {
      await this.log('Domain generation configuration fields loaded with defaults');
    }
    
    await this.log('Campaign form filled successfully');
  }

  async step5_submitCampaign() {
    await this.log('STEP 5: Submitting campaign...');
    
    // Monitor campaign creation API call - accept both 200 and 201 status codes
    const createCampaignPromise = this.page.waitForResponse(response =>
      response.url().includes('/campaigns') &&
      response.request().method() === 'POST' &&
      (response.status() === 200 || response.status() === 201)
    );
    
    // Find and click submit button
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
    await submitButton.click();
    
    // Wait for campaign creation response
    const createResponse = await createCampaignPromise;
    const campaignData = await this.verifyApiResponse(createResponse, [200, 201]);
    
    if (!campaignData) {
      throw new Error('Campaign creation API call failed');
    }
    
    await this.log(`Campaign created successfully - ID: ${campaignData.id || 'unknown'}`);
    
    // Store campaign ID for further verification
    this.testResults.campaignId = campaignData.id;
    
    return campaignData;
  }

  async step6_monitorWebSocketStreaming() {
    await this.log('STEP 6: STAYING ON CURRENT PAGE - Monitoring WebSocket streaming...');
    
    // DO NOT NAVIGATE ANYWHERE - Wait and monitor on current page
    await this.log('Waiting for app redirect after campaign creation...');
    await this.page.waitForTimeout(3000);
    
    const currentUrl = this.page.url();
    await this.log(`Current page URL: ${currentUrl}`);
    
    await this.log('Starting ENHANCED WebSocket streaming monitoring on current page...');
  }

  async step7_verifyWebSocketUpdates() {
    await this.log('STEP 7: ENHANCED WebSocket streaming monitoring on current page...');
    
    // Enhanced tracking variables
    let backendWsConnections = 0;
    let campaignUpdates = 0;
    let apiRequests = 0;
    let messageFormatStats = {
      'domain.generated': 0,
      'domain_generated': 0,
      'campaign.progress': 0,
      'campaign_progress': 0,
      'campaign.status': 0,
      'campaign_status': 0,
      'other': 0
    };
    let campaignIdFields = {};
    let wsEndpoints = new Set();
    let unknownMessageTypes = new Set();
    
    // Monitor backend WebSocket connections (actual campaign streaming)
    this.page.on('websocket', ws => {
      const wsUrl = ws.url();
      wsEndpoints.add(wsUrl);
      
      if (wsUrl.includes('localhost:8080') || wsUrl.includes('/api/v2/ws')) {
        backendWsConnections++;
        console.log(`🎯 [DIAGNOSTIC] Backend WebSocket connected: ${wsUrl}`);
        // Store for later logging (can't use await in event handler)
        this.testResults.diagnosticLogs = this.testResults.diagnosticLogs || [];
        this.testResults.diagnosticLogs.push(`BACKEND_WS_CONNECTED: ${wsUrl}`);
        
        ws.on('framereceived', event => {
          try {
            const rawPayload = event.payload;
            console.log(`📥 [DIAGNOSTIC] Raw WebSocket Frame: ${rawPayload.substring(0, 300)}...`);
            
            const data = JSON.parse(rawPayload);
            
            // ENHANCED MESSAGE TYPE LOGGING
            const messageType = data.type || 'unknown';
            if (messageFormatStats.hasOwnProperty(messageType)) {
              messageFormatStats[messageType]++;
            } else {
              messageFormatStats.other++;
              unknownMessageTypes.add(messageType);
            }
            
            // CAMPAIGN ID FIELD DETECTION
            const possibleCampaignIds = [
              data.campaignId,
              data.campaign_id,
              data.campaignID,
              data.data?.campaignId,
              data.data?.campaign_id
            ].filter(id => id);
            
            if (possibleCampaignIds.length > 0) {
              campaignIdFields[messageType] = possibleCampaignIds;
            }
            
            // Log detailed message information
            console.log(`📊 [DIAGNOSTIC] Message Details:`, {
              type: messageType,
              campaignId: possibleCampaignIds[0] || 'NOT_FOUND',
              expectedCampaignId: this.testResults.campaignId,
              hasData: !!data.data,
              timestamp: data.timestamp,
              sequenceNumber: data.sequenceNumber,
              messageSize: rawPayload.length
            });
            
            // Look for actual campaign/domain updates with enhanced detection
            const isRelevantUpdate =
              messageType.includes('domain') ||
              messageType.includes('campaign') ||
              possibleCampaignIds.includes(this.testResults.campaignId) ||
              (data.domains && Array.isArray(data.domains)) ||
              (data.data && typeof data.data === 'object');
              
            if (isRelevantUpdate) {
              campaignUpdates++;
              console.log(`🚀 [DIAGNOSTIC] Campaign Update #${campaignUpdates}:`, {
                type: messageType,
                campaignMatch: possibleCampaignIds.includes(this.testResults.campaignId),
                payload: JSON.stringify(data).substring(0, 200) + '...'
              });
              
              // Store for later logging (can't use await in event handler)
              this.testResults.diagnosticLogs.push(`CAMPAIGN_UPDATE_${campaignUpdates}: Type=${messageType}, CampaignMatch=${possibleCampaignIds.includes(this.testResults.campaignId)}`);
            }
            
          } catch (e) {
            console.log(`❌ [DIAGNOSTIC] Failed to parse WebSocket message: ${e.message}`);
            console.log(`❌ [DIAGNOSTIC] Raw payload: ${event.payload.substring(0, 200)}...`);
            // Store for later logging (can't use await in event handler)
            this.testResults.diagnosticLogs.push(`WEBSOCKET_PARSE_ERROR: ${e.message}`);
          }
        });
        
        ws.on('framesent', event => {
          console.log(`📤 [DIAGNOSTIC] WebSocket Frame Sent: ${event.payload.substring(0, 100)}...`);
        });
        
      } else if (wsUrl.includes('webpack-hmr') || wsUrl.includes('_next')) {
        console.log(`⚙️ [DIAGNOSTIC] Development WebSocket detected (ignoring): ${wsUrl}`);
      } else {
        console.log(`🔍 [DIAGNOSTIC] Unknown WebSocket detected: ${wsUrl}`);
      }
    });
    
    // Monitor API requests to detect polling
    this.page.on('response', response => {
      if (response.url().includes('/campaigns') && response.request().method() === 'GET') {
        apiRequests++;
        console.log(`📡 Campaign API request detected: ${response.url()} - Status: ${response.status()}`);
      }
    });
    
    const currentUrl = this.page.url();
    await this.log(`Current page for monitoring: ${currentUrl}`);
    
    // Monitor for 60 seconds to catch real-time updates
    await this.log('⏱️ Starting 60-second monitoring period for real-time updates...');
    const monitoringIntervals = 12; // 60 seconds total, check every 5 seconds
    
    for (let i = 0; i < monitoringIntervals; i++) {
      await this.page.waitForTimeout(5000);
      
      // Check for DOM changes that might indicate streaming
      const progressBars = await this.page.locator('.progress, [role="progressbar"], .percentage, [class*="progress"]').count();
      const statusElements = await this.page.locator('[class*="status"], .status, .badge').count();
      const tableRows = await this.page.locator('table tbody tr, .campaign-row, [data-testid*="campaign"]').count();
      
      await this.log(`📈 Interval ${i + 1}/${monitoringIntervals}: Progress=${progressBars}, Status=${statusElements}, TableRows=${tableRows}, BackendWS=${backendWsConnections}, API=${apiRequests}, CampaignUpdates=${campaignUpdates}`);
    }
    
    // Output stored diagnostic logs
    if (this.testResults.diagnosticLogs && this.testResults.diagnosticLogs.length > 0) {
      await this.log('=== DIAGNOSTIC LOGS ===');
      for (const logEntry of this.testResults.diagnosticLogs) {
        await this.log(logEntry);
      }
    }
    
    // ENHANCED Final assessment with diagnostic data
    await this.log('=== ENHANCED REAL-TIME STREAMING VERIFICATION RESULTS ===');
    await this.log(`🔌 Backend WebSocket connections: ${backendWsConnections}`);
    await this.log(`🚀 Campaign updates via WebSocket: ${campaignUpdates}`);
    await this.log(`📡 API polling requests: ${apiRequests}`);
    
    // DIAGNOSTIC: Message format analysis
    await this.log('=== MESSAGE FORMAT ANALYSIS ===');
    for (const [format, count] of Object.entries(messageFormatStats)) {
      if (count > 0) {
        await this.log(`📊 Message format "${format}": ${count} messages`);
      }
    }
    
    if (unknownMessageTypes.size > 0) {
      await this.log(`🔍 Unknown message types detected: ${Array.from(unknownMessageTypes).join(', ')}`);
    }
    
    // DIAGNOSTIC: Campaign ID field analysis
    await this.log('=== CAMPAIGN ID FIELD ANALYSIS ===');
    await this.log(`🎯 Expected Campaign ID: ${this.testResults.campaignId}`);
    for (const [messageType, campaignIds] of Object.entries(campaignIdFields)) {
      await this.log(`📋 "${messageType}" message campaign IDs: ${campaignIds.join(', ')}`);
    }
    
    // DIAGNOSTIC: WebSocket endpoint analysis
    await this.log('=== WEBSOCKET ENDPOINT ANALYSIS ===');
    for (const endpoint of wsEndpoints) {
      const isBackend = endpoint.includes('localhost:8080') || endpoint.includes('/api/v2/ws');
      await this.log(`🔗 ${isBackend ? 'BACKEND' : 'OTHER'}: ${endpoint}`);
    }
    
    // Enhanced determination logic
    const hasCorrectFormat = messageFormatStats['domain.generated'] > 0 || messageFormatStats['campaign.progress'] > 0;
    const hasLegacyFormat = messageFormatStats['domain_generated'] > 0 || messageFormatStats['campaign_progress'] > 0;
    const hasCampaignMatch = Object.values(campaignIdFields).some(ids =>
      ids.includes(this.testResults.campaignId)
    );
    
    await this.log('=== DIAGNOSTIC SUMMARY ===');
    if (backendWsConnections > 0 && campaignUpdates > 0 && hasCampaignMatch) {
      await this.log('✅ RESULT: Real-time updates working via WebSocket streaming with campaign ID match');
    } else if (backendWsConnections > 0 && campaignUpdates > 0) {
      await this.log('⚠️ RESULT: WebSocket streaming working but campaign ID mismatch detected');
    } else if (backendWsConnections > 0) {
      await this.log('⚠️ RESULT: WebSocket connected but no campaign updates detected');
      
      if (hasLegacyFormat && !hasCorrectFormat) {
        await this.log('🔍 DIAGNOSIS: Backend sending legacy message format (domain_generated vs domain.generated)');
      }
    } else if (apiRequests > 5) {
      await this.log('✅ RESULT: Updates working via API polling');
    } else {
      await this.log('❌ RESULT: No real-time update mechanism detected');
    }
    
    // Store diagnostic data for report
    this.testResults.diagnostics = {
      messageFormatStats,
      campaignIdFields,
      wsEndpoints: Array.from(wsEndpoints),
      unknownMessageTypes: Array.from(unknownMessageTypes),
      hasCampaignMatch,
      hasCorrectFormat,
      hasLegacyFormat
    };
  }

  async cleanup() {
    await this.log('Cleaning up test environment...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    this.testResults.endTime = new Date();
    this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
    
    await this.log('Test cleanup complete');
  }

  async generateReport() {
    const report = {
      ...this.testResults,
      summary: {
        totalSteps: this.testResults.steps.length,
        totalErrors: this.testResults.errors.length,
        success: this.testResults.errors.length === 0,
        durationMs: this.testResults.duration
      }
    };
    
    const reportPath = path.join('./test-videos', 'test-report.json');
    await fs.mkdir('./test-videos', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 TEST REPORT SUMMARY:');
    console.log(`✅ Steps completed: ${report.summary.totalSteps}`);
    console.log(`❌ Errors encountered: ${report.summary.totalErrors}`);
    console.log(`⏱️ Total duration: ${Math.round(report.summary.durationMs / 1000)}s`);
    console.log(`🎯 Overall result: ${report.summary.success ? 'SUCCESS' : 'FAILURE'}`);
    
    if (this.testResults.campaignId) {
      console.log(`🆔 Campaign ID: ${this.testResults.campaignId}`);
    }
    
    console.log(`📄 Full report saved to: ${reportPath}`);
    
    return report;
  }

  async run() {
    try {
      await this.setup();
      
      await this.step1_login();
      await this.step2_navigateToCampaigns();
      await this.step3_startCampaignCreation();
      await this.step4_fillCampaignForm();
      await this.step5_submitCampaign();
      await this.step6_monitorWebSocketStreaming();
      await this.step7_verifyWebSocketUpdates();
      
      await this.log('🎉 All test steps completed successfully!');
      
    } catch (error) {
      await this.log(`💥 Test failed: ${error.message}`, 'error');
      this.testResults.errors.push({
        type: 'test_failure',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      await this.cleanup();
      const report = await this.generateReport();
      
      // Exit with appropriate code
      process.exit(report.summary.success ? 0 : 1);
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  const test = new E2ECampaignTest();
  test.run().catch(console.error);
}

module.exports = E2ECampaignTest;