// Domain Generation Campaign Test Script
// Tests the complete flow from login to campaign creation

const puppeteer = require('puppeteer');

async function testCampaignCreation() {
  console.log('🚀 Starting Domain Generation Campaign Test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to login
    console.log('📝 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Wait for login form to be ready
    await page.waitForSelector('input[placeholder*="email"]', { timeout: 10000 });
    console.log('✅ Login form loaded');
    
    // Step 2: Login
    console.log('🔐 Step 2: Performing login...');
    await page.type('input[placeholder*="email"]', 'test@example.com');
    await page.type('input[placeholder*="password"]', 'password123');
    
    // Wait for and click login button
    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    console.log('✅ Login successful, redirected to:', page.url());
    
    // Step 3: Navigate to campaign creation
    console.log('📋 Step 3: Navigating to campaign creation...');
    await page.goto('http://localhost:3000/campaigns/new', { waitUntil: 'networkidle2' });
    
    // Wait for campaign form to load
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('✅ Campaign creation form loaded');
    
    // Step 4: Fill out campaign form
    console.log('📝 Step 4: Filling out campaign form...');
    
    // Campaign name
    const nameInput = await page.waitForSelector('input[name="name"], input[placeholder*="name"], input[id*="name"]');
    await nameInput.type('Test Domain Campaign ' + Date.now());
    
    // Description
    const descInput = await page.$('textarea[name="description"], textarea[placeholder*="description"]');
    if (descInput) {
      await descInput.type('Automated test campaign for domain generation');
    }
    
    // Set domain count to 10
    const countInput = await page.$('input[name="domainCount"], input[type="number"]');
    if (countInput) {
      await countInput.click({ clickCount: 3 }); // Select all
      await countInput.type('10');
    }
    
    // Set domain pattern (look for pattern input)
    const patternInput = await page.$('input[name="pattern"], input[placeholder*="pattern"]');
    if (patternInput) {
      await patternInput.type('tech-{word}-{number}.com');
    }
    
    console.log('✅ Campaign form filled out');
    
    // Step 5: Submit campaign
    console.log('🚀 Step 5: Creating campaign...');
    
    // Find and click submit button
    const submitButton = await page.waitForSelector('button[type="submit"], button:has-text("Create"), button:has-text("Start")');
    await submitButton.click();
    
    // Wait for campaign creation response
    await page.waitForTimeout(3000);
    
    // Check for success or error messages
    const currentUrl = page.url();
    console.log('📍 Current URL after submission:', currentUrl);
    
    // Look for success indicators
    const successElements = await page.$$('div:has-text("success"), div:has-text("created"), div:has-text("started")');
    const errorElements = await page.$$('div:has-text("error"), div:has-text("failed"), .error, .alert-error');
    
    if (successElements.length > 0) {
      console.log('✅ Campaign creation appears successful');
    } else if (errorElements.length > 0) {
      console.log('❌ Found error indicators on page');
      for (const el of errorElements) {
        const text = await el.textContent();
        console.log('Error text:', text);
      }
    }
    
    // Step 6: Check campaign list
    console.log('📊 Step 6: Checking campaign list...');
    await page.goto('http://localhost:3000/campaigns', { waitUntil: 'networkidle2' });
    
    // Wait for campaigns to load
    await page.waitForTimeout(2000);
    
    // Look for campaign cards or list items
    const campaignElements = await page.$$('[data-testid*="campaign"], .campaign-card, .campaign-item');
    console.log(`📈 Found ${campaignElements.length} campaign elements on the page`);
    
    // Check for WebSocket connection status
    const wsIndicators = await page.$$('.ws-connected, .live-updates, [data-testid*="websocket"]');
    console.log(`🔌 Found ${wsIndicators.length} WebSocket indicators`);
    
    // Step 7: Monitor console for errors
    console.log('🔍 Step 7: Checking browser console for errors...');
    
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    // Take final screenshot
    await page.screenshot({ path: './test-campaign-final.png', fullPage: true });
    console.log('📸 Final screenshot saved as test-campaign-final.png');
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ path: './test-campaign-error.png', fullPage: true });
    console.log('📸 Error screenshot saved as test-campaign-error.png');
    
    // Log current page content for debugging
    const content = await page.content();
    console.log('Current page URL:', page.url());
    console.log('Page title:', await page.title());
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testCampaignCreation()
  .then(() => {
    console.log('🎉 Campaign creation test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Campaign creation test failed:', error);
    process.exit(1);
  });