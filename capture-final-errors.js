const { chromium } = require('playwright');

async function captureFinalErrors() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Track all errors
    const allErrors = [];
    const allLogs = [];

    // Capture console messages
    page.on('console', msg => {
        const logEntry = `[${msg.type()}] ${msg.text()}`;
        allLogs.push(logEntry);
        console.log('Console:', logEntry);
    });

    // Capture page errors
    page.on('pageerror', error => {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        allErrors.push(errorInfo);
        console.log('Page Error:', errorInfo);
    });

    // Capture unhandled rejections
    page.on('requestfailed', request => {
        console.log('Request failed:', request.url(), request.failure());
    });

    try {
        console.log('🚀 Starting login flow...');
        
        // Navigate to login
        await page.goto('http://localhost:3000/login');
        await page.waitForLoadState('networkidle');
        
        console.log('📝 Filling login form...');
        await page.fill('input[name="email"]', 'admin@domainflow.ai');
        await page.fill('input[name="password"]', 'secure_admin_pass_2024');
        
        // Take screenshot before login
        await page.screenshot({ path: 'before-login.png', fullPage: true });
        
        console.log('🔑 Clicking login...');
        await page.click('button[type="submit"]');
        
        // Wait for navigation and potential errors
        await page.waitForTimeout(3000);
        
        console.log('📊 Waiting on dashboard...');
        // Wait longer to see if we get to dashboard
        await page.waitForTimeout(5000);
        
        // Take screenshot after login
        await page.screenshot({ path: 'after-login.png', fullPage: true });
        
        console.log('🔍 Checking for navigation elements...');
        // Try to interact with navigation to trigger any additional errors
        try {
            const navItems = await page.locator('nav a, [role="menuitem"], .nav-item').all();
            console.log(`Found ${navItems.length} navigation items`);
            
            // Click on some navigation items to trigger more potential errors
            if (navItems.length > 0) {
                for (let i = 0; i < Math.min(3, navItems.length); i++) {
                    try {
                        await navItems[i].click();
                        await page.waitForTimeout(1000);
                    } catch (e) {
                        console.log(`Navigation click ${i} failed:`, e.message);
                    }
                }
            }
        } catch (e) {
            console.log('Navigation interaction failed:', e.message);
        }
        
        console.log('⏱️  Waiting for potential final errors...');
        // Wait longer to capture any delayed errors
        await page.waitForTimeout(8000);
        
        // Take a final screenshot
        await page.screenshot({ path: 'final-state.png', fullPage: true });
        
        console.log('🧪 Triggering additional interactions...');
        // Try to trigger more errors by interacting with common elements
        try {
            // Try clicking on user menu, settings, etc.
            const commonSelectors = [
                '[data-testid="user-menu"]',
                '.user-menu',
                '[aria-label*="user"]',
                '[aria-label*="profile"]',
                '[aria-label*="menu"]',
                'button[aria-expanded]',
                '.dropdown-toggle'
            ];
            
            for (const selector of commonSelectors) {
                try {
                    const element = await page.locator(selector).first();
                    if (await element.isVisible()) {
                        await element.click();
                        await page.waitForTimeout(1000);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
        } catch (e) {
            console.log('Additional interactions failed:', e.message);
        }
        
        console.log('⏳ Final wait before closure...');
        // Extra long wait to catch any final errors
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('❌ Script error:', error);
        allErrors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            source: 'script'
        });
    }

    // Take final screenshot before closing
    try {
        await page.screenshot({ path: 'pre-closure.png', fullPage: true });
    } catch (e) {
        console.log('Final screenshot failed:', e.message);
    }

    console.log('\n📋 FINAL ERROR SUMMARY:');
    console.log('='.repeat(50));
    
    if (allErrors.length > 0) {
        allErrors.forEach((error, index) => {
            console.log(`\n🔴 Error ${index + 1}:`);
            console.log(`Time: ${error.timestamp}`);
            console.log(`Message: ${error.message}`);
            if (error.stack) {
                console.log(`Stack: ${error.stack}`);
            }
            console.log('-'.repeat(30));
        });
    } else {
        console.log('✅ No errors captured');
    }
    
    console.log('\n📝 FINAL CONSOLE LOG SUMMARY:');
    console.log('='.repeat(50));
    allLogs.slice(-20).forEach((log, index) => {
        console.log(`${index + 1}: ${log}`);
    });

    // Write detailed error report
    const errorReport = {
        timestamp: new Date().toISOString(),
        totalErrors: allErrors.length,
        errors: allErrors,
        recentLogs: allLogs.slice(-50),
        allLogs: allLogs
    };
    
    require('fs').writeFileSync('error-report.json', JSON.stringify(errorReport, null, 2));
    console.log('\n💾 Detailed error report saved to error-report.json');

    console.log('\n🔄 Closing browser...');
    // Wait a bit more before actual closure to catch any cleanup errors
    await page.waitForTimeout(3000);
    
    await browser.close();
    console.log('✅ Browser closed');
}

captureFinalErrors().catch(console.error);
