const { chromium } = require('playwright');

async function debugUIErrors() {
    console.log('🔍 Starting UI Debug Session...');
    
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true,
        slowMo: 1000
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console messages and errors
    page.on('console', msg => {
        console.log(`🖥️  CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
        console.log(`❌ PAGE ERROR:`, error.message);
        console.log(`📍 Stack:`, error.stack);
    });
    
    page.on('requestfailed', request => {
        console.log(`🚨 REQUEST FAILED:`, request.url(), request.failure()?.errorText);
    });
    
    try {
        console.log('📱 Navigating to login page...');
        await page.goto('http://localhost:3000/login');
        await page.waitForLoadState('networkidle');
        
        console.log('📸 Taking screenshot of login page...');
        await page.screenshot({ path: '/tmp/debug-login-page.png' });
        
        console.log('🔐 Attempting login...');
        await page.fill('#email', 'test@example.com');
        await page.fill('#password', 'testpassword123456');
        
        console.log('🔄 Submitting login form...');
        await page.click('button[type="submit"]');
        
        // Wait for navigation or error
        try {
            await page.waitForURL('**/dashboard', { timeout: 10000 });
            console.log('✅ Login successful - redirected to dashboard');
            
            console.log('📸 Taking screenshot of dashboard...');
            await page.screenshot({ path: '/tmp/debug-dashboard.png' });
            
            // Check for any runtime errors on dashboard
            await page.waitForTimeout(3000);
            
            console.log('🎯 Testing navigation elements...');
            const sidebarItems = await page.$$eval('nav a, [role="navigation"] a', items => 
                items.map(item => ({
                    text: item.textContent?.trim(),
                    href: item.href,
                    visible: item.offsetParent !== null
                }))
            );
            
            console.log('📋 Found navigation items:', JSON.stringify(sidebarItems, null, 2));
            
        } catch (waitError) {
            console.log('⚠️  Did not redirect to dashboard, checking current page...');
            const currentUrl = page.url();
            console.log('📍 Current URL:', currentUrl);
            
            await page.screenshot({ path: '/tmp/debug-after-login.png' });
            
            // Check for error messages
            const errorElements = await page.$$eval('[role="alert"], .error, .alert-error', 
                elements => elements.map(el => el.textContent?.trim())
            );
            if (errorElements.length > 0) {
                console.log('🚨 Found error messages:', errorElements);
            }
        }
        
    } catch (error) {
        console.log('💥 Test error:', error.message);
        await page.screenshot({ path: '/tmp/debug-error.png' });
    }
    
    console.log('⏱️  Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
    await browser.close();
    console.log('🏁 Debug session complete');
}

debugUIErrors().catch(console.error);
