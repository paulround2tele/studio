// Detailed login and campaign creation debugging script
const puppeteer = require('puppeteer');

async function debugLoginAndCampaign() {
  console.log('🔍 Starting detailed login and campaign creation debugging...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 500 // Slow down actions for better debugging
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture network failures
  const networkErrors = [];
  page.on('requestfailed', request => {
    networkErrors.push(`Failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    // Step 1: Navigate to login
    console.log('📝 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: './debug-01-login-page.png' });
    
    // Debug: Check what's on the page
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Wait for and inspect login form
    console.log('🔍 Looking for login form elements...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try different selectors for email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
      'input[id*="email"]'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        emailInput = selector;
        console.log(`✅ Found email input with selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`❌ Email selector failed: ${selector}`);
      }
    }
    
    if (!emailInput) {
      console.log('❌ Could not find email input field');
      await page.screenshot({ path: './debug-02-no-email-field.png' });
      const forms = await page.$$('form');
      console.log(`Found ${forms.length} forms on the page`);
      const inputs = await page.$$('input');
      console.log(`Found ${inputs.length} input fields on the page`);
      for (let i = 0; i < inputs.length; i++) {
        const type = await inputs[i].evaluate(el => el.type);
        const name = await inputs[i].evaluate(el => el.name);
        const placeholder = await inputs[i].evaluate(el => el.placeholder);
        console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
      }
      throw new Error('Cannot find email input');
    }
    
    // Try different selectors for password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password"]',
      'input[placeholder*="Password"]',
      'input[id*="password"]'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        passwordInput = selector;
        console.log(`✅ Found password input with selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`❌ Password selector failed: ${selector}`);
      }
    }
    
    if (!passwordInput) {
      console.log('❌ Could not find password input field');
      throw new Error('Cannot find password input');
    }
    
    // Step 2: Attempt login
    console.log('🔐 Step 2: Attempting login...');
    
    // Clear and type credentials
    await page.click(emailInput, { clickCount: 3 });
    await page.type(emailInput, 'test@example.com');
    console.log('✅ Typed email');
    
    await page.click(passwordInput, { clickCount: 3 });
    await page.type(passwordInput, 'password123');
    console.log('✅ Typed password');
    
    await page.screenshot({ path: './debug-03-filled-form.png' });
    
    // Find submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Submit")',
      'form button'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          submitButton = selector;
          console.log(`✅ Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Submit selector failed: ${selector}`);
      }
    }
    
    if (!submitButton) {
      console.log('❌ Could not find submit button');
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons on the page`);
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].evaluate(el => el.textContent);
        const type = await buttons[i].evaluate(el => el.type);
        console.log(`Button ${i}: text="${text}", type=${type}`);
      }
      throw new Error('Cannot find submit button');
    }
    
    // Monitor network requests during login
    const loginRequests = [];
    page.on('request', request => {
      if (request.url().includes('login') || request.url().includes('auth')) {
        loginRequests.push(`${request.method()} ${request.url()}`);
      }
    });
    
    const loginResponses = [];
    page.on('response', response => {
      if (response.url().includes('login') || response.url().includes('auth')) {
        loginResponses.push(`${response.status()} ${response.url()}`);
      }
    });
    
    // Submit the form
    console.log('🚀 Submitting login form...');
    await page.click(submitButton);
    
    // Wait and see what happens
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: './debug-04-after-submit.png' });
    
    console.log('Current URL after submit:', page.url());
    console.log('Page title after submit:', await page.title());
    
    // Check for error messages
    const errorElements = await page.$$('[class*="error"], [class*="alert"], .text-red, .text-destructive');
    if (errorElements.length > 0) {
      console.log('❌ Found error elements:');
      for (const el of errorElements) {
        const text = await el.evaluate(el => el.textContent);
        console.log(`  Error: ${text}`);
      }
    }
    
    // Check for success indicators
    if (page.url() !== 'http://localhost:3000/login') {
      console.log('✅ Navigation occurred after login - likely successful');
      
      // Try to go to campaigns page
      console.log('📋 Step 3: Navigating to campaigns...');
      await page.goto('http://localhost:3000/campaigns', { waitUntil: 'networkidle2' });
      await page.screenshot({ path: './debug-05-campaigns-page.png' });
      
      // Check if we're still on campaigns page (not redirected to login)
      if (page.url().includes('/campaigns')) {
        console.log('✅ Successfully accessed campaigns page');
        
        // Look for campaign creation button
        const createButton = await page.$('a[href*="/campaigns/new"], button:has-text("Create"), button:has-text("New")');
        if (createButton) {
          console.log('✅ Found campaign creation button');
          
          // Navigate to campaign creation
          await page.goto('http://localhost:3000/campaigns/new', { waitUntil: 'networkidle2' });
          await page.screenshot({ path: './debug-06-campaign-form.png' });
          
          if (page.url().includes('/campaigns/new')) {
            console.log('✅ Successfully accessed campaign creation form');
            
            // Analyze the form
            const forms = await page.$$('form');
            console.log(`Found ${forms.length} forms on campaign creation page`);
            
            const inputs = await page.$$('input, select, textarea');
            console.log(`Found ${inputs.length} form inputs on campaign creation page`);
            
            for (let i = 0; i < Math.min(inputs.length, 10); i++) {
              const tag = await inputs[i].evaluate(el => el.tagName);
              const type = await inputs[i].evaluate(el => el.type);
              const name = await inputs[i].evaluate(el => el.name);
              const placeholder = await inputs[i].evaluate(el => el.placeholder);
              console.log(`Input ${i}: ${tag} type=${type}, name=${name}, placeholder=${placeholder}`);
            }
          } else {
            console.log('❌ Redirected away from campaign creation form');
          }
        } else {
          console.log('❌ Could not find campaign creation button');
        }
      } else {
        console.log('❌ Redirected away from campaigns page - likely authentication issue');
      }
    } else {
      console.log('❌ Still on login page - login likely failed');
    }
    
    // Report network activity
    console.log('\n📡 Network Activity:');
    console.log('Login Requests:', loginRequests);
    console.log('Login Responses:', loginResponses);
    console.log('Network Errors:', networkErrors);
    
    // Report console logs
    console.log('\n📋 Console Logs:');
    consoleLogs.forEach(log => console.log(`  ${log}`));
    
    console.log('\n✅ Debugging completed - check debug-*.png files for visual evidence');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    await page.screenshot({ path: './debug-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the debug test
debugLoginAndCampaign()
  .then(() => {
    console.log('🎉 Debug test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug test failed:', error);
    process.exit(1);
  });