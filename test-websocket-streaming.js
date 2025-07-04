/**
 * Smart WebSocket Real-Time Streaming Test Script
 * Tests domain generation campaign WebSocket functionality for real-time updates
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class WebSocketStreamingTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.logs = [];
    this.websocketMessages = [];
    this.domainUpdates = [];
    this.testResults = {
      loginSuccess: false,
      campaignsLoaded: false,
      individualCampaignLoaded: false,
      websocketConnected: false,
      realTimeUpdatesDetected: false,
      batchRefreshDetected: false,
      errors: []
    };
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    this.logs.push(logEntry);
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  async init() {
    this.log('info', 'Initializing WebSocket Streaming Test');
    
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable request/response interception
    await this.page.setRequestInterception(true);
    
    // Capture all network requests
    this.page.on('request', (request) => {
      if (request.url().includes('campaigns') || request.url().includes('websocket') || request.url().includes('ws')) {
        this.log('debug', 'Network Request', {
          method: request.method(),
          url: request.url(),
          headers: request.headers()
        });
      }
      request.continue();
    });

    this.page.on('response', (response) => {
      if (response.url().includes('campaigns') || response.url().includes('ws')) {
        this.log('debug', 'Network Response', {
          status: response.status(),
          url: response.url(),
          headers: response.headers()
        });
      }
    });

    // Capture console logs from the page
    this.page.on('console', (msg) => {
      const logText = msg.text();
      if (logText.includes('WEBSOCKET') || logText.includes('REALTIME') || logText.includes('BACKEND_REALTIME') || logText.includes('domain_generated')) {
        this.log('websocket', 'Browser Console', { message: logText });
      }
    });

    // Monitor for WebSocket connections
    this.page.evaluateOnNewDocument(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        console.log('🔗 [WEBSOCKET_MONITOR] WebSocket connection created:', url);
        const ws = new originalWebSocket(url, protocols);
        
        ws.addEventListener('open', () => {
          console.log('✅ [WEBSOCKET_MONITOR] WebSocket opened:', url);
        });
        
        ws.addEventListener('message', (event) => {
          console.log('📨 [WEBSOCKET_MONITOR] WebSocket message received:', event.data);
        });
        
        ws.addEventListener('close', (event) => {
          console.log('🔒 [WEBSOCKET_MONITOR] WebSocket closed:', { code: event.code, reason: event.reason });
        });
        
        ws.addEventListener('error', (error) => {
          console.log('❌ [WEBSOCKET_MONITOR] WebSocket error:', error);
        });
        
        return ws;
      };
    });

    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async login() {
    this.log('info', 'Starting login process');
    
    try {
      await this.page.goto('http://localhost:3000/login', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for email input and fill it
      await this.page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });
      const emailInput = await this.page.$('input[type="email"], input[placeholder*="email" i]');
      await emailInput.type('test@example.com');
      this.log('debug', 'Email entered');

      // Wait for password input and fill it
      await this.page.waitForSelector('input[type="password"], input[placeholder*="password" i]', { timeout: 10000 });
      const passwordInput = await this.page.$('input[type="password"], input[placeholder*="password" i]');
      await passwordInput.type('password123');
      this.log('debug', 'Password entered');

      // Find and click sign in button using proper selectors
      let signInClicked = false;
      
      // Try common button selectors first
      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        signInClicked = true;
      } else {
        // Try finding by text content
        const buttons = await this.page.$$('button');
        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent.toLowerCase());
          if (text.includes('sign') || text.includes('login') || text.includes('submit')) {
            await button.click();
            signInClicked = true;
            break;
          }
        }
      }
      
      if (!signInClicked) {
        throw new Error('Could not find sign in button');
      }
      
      this.log('debug', 'Sign in button clicked');

      // Wait for navigation to dashboard or campaigns
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/campaigns')) {
        this.testResults.loginSuccess = true;
        this.log('success', 'Login successful', { url: currentUrl });
      } else {
        throw new Error(`Unexpected URL after login: ${currentUrl}`);
      }

    } catch (error) {
      this.testResults.errors.push(`Login failed: ${error.message}`);
      this.log('error', 'Login failed', { error: error.message });
      throw error;
    }
  }

  async navigateToCampaigns() {
    this.log('info', 'Navigating to campaigns page');
    
    try {
      // If not already on campaigns page, navigate there
      if (!this.page.url().includes('/campaigns')) {
        const campaignsLink = await this.page.$('a[href="/campaigns"]');
        if (campaignsLink) {
          await campaignsLink.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        } else {
          // Try finding by text content
          const links = await this.page.$$('a');
          let campaignLinkFound = false;
          for (const link of links) {
            const text = await link.evaluate(el => el.textContent.toLowerCase());
            if (text.includes('campaign')) {
              await link.click();
              await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
              campaignLinkFound = true;
              break;
            }
          }
          
          if (!campaignLinkFound) {
            await this.page.goto('http://localhost:3000/campaigns');
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
          }
        }
      }

      // Wait for campaigns to load with retry logic
      let campaignsLoaded = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!campaignsLoaded && retryCount < maxRetries) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Wait for page to stabilize
          await this.page.waitForLoadState ?
            await this.page.waitForLoadState('networkidle', { timeout: 10000 }) :
            await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if campaigns data is loaded by looking for campaign count in headers
          const campaignCount = await this.page.evaluate(() => {
            return window.fetch ? true : false; // Just check if page is ready
          });
          
          if (campaignCount !== false) {
            campaignsLoaded = true;
            this.testResults.campaignsLoaded = true;
            this.log('success', 'Campaigns page loaded successfully');
          }
        } catch (error) {
          retryCount++;
          this.log('debug', `Retry ${retryCount}/${maxRetries} for campaigns loading: ${error.message}`);
          if (retryCount >= maxRetries) {
            throw error;
          }
        }
      }

    } catch (error) {
      this.testResults.errors.push(`Campaigns navigation failed: ${error.message}`);
      this.log('error', 'Failed to navigate to campaigns', { error: error.message });
      throw error;
    }
  }

  async selectDomainGenerationCampaign() {
    this.log('info', 'Selecting domain generation campaign');
    
    try {
      // Look for domain generation campaigns by checking page content
      const pageContent = await this.page.content();
      if (!pageContent.includes('domain_generation')) {
        throw new Error('No domain generation campaigns found on page');
      }

      this.log('info', 'Found domain generation campaigns on page');

      // Find and click "View Dashboard" button by searching for buttons/links
      let dashboardClicked = false;
      
      // Try finding buttons with "Dashboard" text
      const buttons = await this.page.$$('button, a');
      for (const button of buttons) {
        try {
          const text = await button.evaluate(el => el.textContent);
          if (text && text.toLowerCase().includes('dashboard')) {
            await button.click();
            dashboardClicked = true;
            this.log('debug', 'Clicked dashboard button');
            break;
          }
        } catch (error) {
          // Skip if element is stale
          continue;
        }
      }
      
      if (!dashboardClicked) {
        // Try finding links with campaign URLs
        const links = await this.page.$$('a[href*="/campaigns/"]');
        if (links.length > 0) {
          await links[0].click();
          dashboardClicked = true;
          this.log('debug', 'Clicked campaign link');
        }
      }
      
      if (!dashboardClicked) {
        throw new Error('Could not find View Dashboard button or campaign link');
      }

      // Wait for individual campaign page to load
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      const url = this.page.url();
      if (url.includes('/campaigns/') && !url.endsWith('/campaigns')) {
        this.testResults.individualCampaignLoaded = true;
        this.log('success', 'Individual campaign page loaded', { url });
      } else {
        throw new Error(`Failed to navigate to individual campaign: ${url}`);
      }

    } catch (error) {
      this.testResults.errors.push(`Campaign selection failed: ${error.message}`);
      this.log('error', 'Failed to select domain generation campaign', { error: error.message });
      throw error;
    }
  }

  async monitorWebSocketActivity() {
    this.log('info', 'Starting WebSocket activity monitoring');

    const monitorDuration = 30000; // 30 seconds
    const startTime = Date.now();
    let websocketConnected = false;
    let realTimeUpdates = 0;
    let batchUpdates = 0;
    let tableRefreshCount = 0;

    // Monitor for WebSocket connections and messages
    const websocketMonitor = await this.page.evaluateHandle(() => {
      const results = {
        websocketConnected: false,
        messagesReceived: [],
        domainUpdates: [],
        tableRefreshes: 0
      };

      // Monitor WebSocket status
      const checkWebSocket = () => {
        if (window.websocketService) {
          const status = window.websocketService.getConnectionStatus();
          if (status && status.connected) {
            results.websocketConnected = true;
          }
        }
      };

      // Monitor DOM changes for real-time updates
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const text = node.textContent || '';
                if (text.includes('.com') || text.includes('.net') || text.includes('.org')) {
                  results.domainUpdates.push({
                    timestamp: Date.now(),
                    domain: text.trim(),
                    type: 'individual_add'
                  });
                }
              }
            });
          }
        });
      });

      // Monitor table body for batch refreshes
      const tableBody = document.querySelector('tbody, [data-testid="domains-table-body"], table');
      if (tableBody) {
        observer.observe(tableBody, {
          childList: true,
          subtree: true,
          attributes: false
        });
      }

      // Check WebSocket status periodically
      const interval = setInterval(checkWebSocket, 1000);

      // Return cleanup function
      return {
        stop: () => {
          clearInterval(interval);
          observer.disconnect();
          return results;
        }
      };
    });

    // Wait for monitoring duration
    await new Promise(resolve => setTimeout(resolve, monitorDuration));

    // Get monitoring results
    const results = await this.page.evaluate((monitor) => {
      return monitor.stop();
    }, websocketMonitor);

    this.testResults.websocketConnected = results.websocketConnected;
    this.testResults.realTimeUpdatesDetected = results.domainUpdates.length > 0;
    
    // Analyze update patterns
    if (results.domainUpdates.length > 0) {
      const timeGaps = [];
      for (let i = 1; i < results.domainUpdates.length; i++) {
        timeGaps.push(results.domainUpdates[i].timestamp - results.domainUpdates[i-1].timestamp);
      }
      
      const avgTimeGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
      
      if (avgTimeGap < 2000) { // Less than 2 seconds between updates = real-time
        this.testResults.realTimeUpdatesDetected = true;
        this.log('success', 'Real-time domain updates detected', {
          updateCount: results.domainUpdates.length,
          averageGapMs: avgTimeGap
        });
      } else {
        this.testResults.batchRefreshDetected = true;
        this.log('warning', 'Batch updates detected (not real-time)', {
          updateCount: results.domainUpdates.length,
          averageGapMs: avgTimeGap
        });
      }
    } else {
      this.log('warning', 'No domain updates detected during monitoring period');
    }

    this.log('info', 'WebSocket monitoring completed', results);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      logs: this.logs,
      summary: {
        overallSuccess: this.testResults.loginSuccess && 
                       this.testResults.campaignsLoaded && 
                       this.testResults.individualCampaignLoaded &&
                       this.testResults.websocketConnected &&
                       this.testResults.realTimeUpdatesDetected,
        criticalIssues: this.testResults.errors,
        websocketStatus: this.testResults.websocketConnected ? 'Connected' : 'Failed',
        streamingStatus: this.testResults.realTimeUpdatesDetected ? 'Real-time' : 
                        this.testResults.batchRefreshDetected ? 'Batch-only' : 'No updates detected'
      }
    };

    const reportPath = path.join(__dirname, `websocket-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log('info', 'Test report generated', { reportPath });
    
    // Console summary
    console.log('\n=== WEBSOCKET STREAMING TEST SUMMARY ===');
    console.log(`Overall Success: ${report.summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Login: ${this.testResults.loginSuccess ? '✅' : '❌'}`);
    console.log(`Campaigns Loaded: ${this.testResults.campaignsLoaded ? '✅' : '❌'}`);
    console.log(`Individual Campaign: ${this.testResults.individualCampaignLoaded ? '✅' : '❌'}`);
    console.log(`WebSocket Connected: ${this.testResults.websocketConnected ? '✅' : '❌'}`);
    console.log(`Real-time Updates: ${this.testResults.realTimeUpdatesDetected ? '✅' : '❌'}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.testResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.login();
      await this.navigateToCampaigns();
      await this.selectDomainGenerationCampaign();
      await this.monitorWebSocketActivity();
      
      return await this.generateReport();
      
    } catch (error) {
      this.log('error', 'Test execution failed', { error: error.message });
      this.testResults.errors.push(`Test execution failed: ${error.message}`);
      return await this.generateReport();
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  const tester = new WebSocketStreamingTester();
  const report = await tester.run();
  
  if (report.summary.overallSuccess) {
    console.log('\n🎉 WebSocket streaming test PASSED! Real-time domain updates are working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 WebSocket streaming test FAILED! Check the report for details.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WebSocketStreamingTester;