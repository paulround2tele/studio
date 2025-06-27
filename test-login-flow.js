const { chromium } = require('playwright');

async function testLoginFlow() {
    console.log('🔐 Testing Login Flow...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1500 });
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.log(`❌ CONSOLE ERROR: ${text}`);
        } else if (text.includes('[Auth]') || text.includes('login') || text.includes('Login')) {
            console.log(`📝 AUTH LOG: ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log(`💥 PAGE ERROR: ${error.message}`);
    });
    
    page.on('requestfailed', request => {
        console.log(`🚨 REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    try {
        console.log('📱 Loading login page...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        
        console.log('📸 Screenshot: Login page loaded');
        await page.screenshot({ path: '/tmp/login-loaded.png' });
        
        console.log('📝 Filling email...');
        await page.fill('#email', 'test@example.com');
        
        console.log('📝 Filling password...');
        await page.fill('#password', 'testpassword123456');
        
        console.log('📸 Screenshot: Credentials filled');
        await page.screenshot({ path: '/tmp/credentials-filled.png' });
        
        console.log('🔄 Clicking submit button...');
        await page.click('button[type="submit"]');
        
        console.log('⏱️  Waiting for response/navigation...');
        
        try {
            // Wait for either success navigation or error
            await Promise.race([
                page.waitForURL('**/dashboard', { timeout: 10000 }),
                page.waitForSelector('[role="alert"], .error', { timeout: 10000 }),
                page.waitForTimeout(10000)
            ]);
            
            const currentUrl = page.url();
            console.log(`📍 Current URL: ${currentUrl}`);
            
            if (currentUrl.includes('dashboard')) {
                console.log('✅ SUCCESS: Redirected to dashboard!');
                
                console.log('📸 Screenshot: Dashboard page');
                await page.screenshot({ path: '/tmp/dashboard-success.png' });
                
                // Check for navigation elements
                console.log('🔍 Checking for navigation elements...');
                const navElements = await page.$$eval('nav a, [data-sidebar] a, aside a', links => 
                    links.map(link => ({
                        text: link.textContent?.trim(),
                        href: link.href,
                        visible: link.offsetParent !== null
                    })).filter(link => link.visible && link.text)
                );
                
                console.log('📋 Navigation elements found:');
                navElements.forEach(nav => console.log(`   • ${nav.text} -> ${nav.href}`));
                
                // Check for main content areas
                const mainContent = await page.$$eval('main, [role="main"], .content', elements => elements.length);
                console.log(`📊 Main content areas: ${mainContent}`);
                
                // Test clicking on dashboard navigation if available
                if (navElements.length > 0) {
                    console.log(`🔗 Testing navigation: ${navElements[0].text}`);
                    await page.click(`text="${navElements[0].text}"`);
                    await page.waitForTimeout(2000);
                    
                    console.log('📸 Screenshot: After navigation click');
                    await page.screenshot({ path: '/tmp/navigation-test.png' });
                }
                
            } else if (currentUrl.includes('login')) {
                console.log('❌ FAILED: Still on login page');
                
                // Check for error messages
                const errorMessage = await page.locator('[role="alert"], .error, .alert-error').textContent().catch(() => null);
                if (errorMessage) {
                    console.log(`🚨 Error message: ${errorMessage}`);
                }
                
                console.log('📸 Screenshot: Login failed');
                await page.screenshot({ path: '/tmp/login-failed.png' });
            } else {
                console.log(`⚠️  UNEXPECTED: Redirected to ${currentUrl}`);
                console.log('📸 Screenshot: Unexpected location');
                await page.screenshot({ path: '/tmp/unexpected-location.png' });
            }
            
        } catch (waitError) {
            console.log(`⚠️  Wait timeout or error: ${waitError.message}`);
            const currentUrl = page.url();
            console.log(`📍 Final URL: ${currentUrl}`);
            
            console.log('📸 Screenshot: Timeout state');
            await page.screenshot({ path: '/tmp/timeout-state.png' });
        }
        
        console.log('⏱️  Keeping browser open for 15 seconds for inspection...');
        await page.waitForTimeout(15000);
        
    } catch (error) {
        console.log('💥 Test error:', error.message);
        await page.screenshot({ path: '/tmp/test-error.png' });
    }
    
    await browser.close();
    console.log('🏁 Login test complete');
}

testLoginFlow().catch(console.error);
