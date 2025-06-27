const { chromium } = require('playwright');

async function debugLoginPage() {
    console.log('🔍 Debugging Login Page Issues...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();
    
    // Listen for all console messages and errors
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.log(`❌ CONSOLE ERROR: ${text}`);
        } else if (type === 'warning') {
            console.log(`⚠️  CONSOLE WARNING: ${text}`);
        } else if (type === 'log') {
            console.log(`📝 CONSOLE LOG: ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log(`💥 PAGE ERROR: ${error.message}`);
        console.log(`📍 Stack: ${error.stack}`);
    });
    
    page.on('requestfailed', request => {
        console.log(`🚨 REQUEST FAILED: ${request.url()}`);
        console.log(`📍 Error: ${request.failure()?.errorText}`);
    });
    
    try {
        console.log('📱 Loading login page...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        
        console.log('📸 Taking screenshot...');
        await page.screenshot({ path: '/tmp/debug-login.png' });
        
        console.log('🔍 Checking for form elements...');
        
        // Check for email input
        const emailInput = await page.$('#email');
        if (emailInput) {
            console.log('✅ Email input found');
        } else {
            console.log('❌ Email input NOT found');
        }
        
        // Check for password input
        const passwordInput = await page.$('#password');
        if (passwordInput) {
            console.log('✅ Password input found');
        } else {
            console.log('❌ Password input NOT found');
        }
        
        // Check for submit button
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
            console.log('✅ Submit button found');
        } else {
            console.log('❌ Submit button NOT found');
        }
        
        // Check for rememberMe checkbox
        const rememberMe = await page.$('#rememberMe');
        if (rememberMe) {
            console.log('✅ Remember me checkbox found');
        } else {
            console.log('❌ Remember me checkbox NOT found');
        }
        
        console.log('🔍 Getting all input elements...');
        const allInputs = await page.$$eval('input', inputs => 
            inputs.map(input => ({
                id: input.id,
                type: input.type,
                name: input.name,
                placeholder: input.placeholder,
                visible: input.offsetParent !== null
            }))
        );
        console.log('📋 All inputs found:', JSON.stringify(allInputs, null, 2));
        
        console.log('🔍 Getting all button elements...');
        const allButtons = await page.$$eval('button', buttons => 
            buttons.map(button => ({
                id: button.id,
                type: button.type,
                textContent: button.textContent?.trim(),
                visible: button.offsetParent !== null
            }))
        );
        console.log('📋 All buttons found:', JSON.stringify(allButtons, null, 2));
        
        console.log('⏱️  Waiting 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.log('💥 Debug error:', error.message);
    }
    
    await browser.close();
    console.log('🏁 Debug session complete');
}

debugLoginPage().catch(console.error);
