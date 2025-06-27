// Automated Login Test Script
// This script tests the login functionality using the seeded test user

const { chromium } = require('playwright');

async function testLogin() {
    console.log('🚀 Starting automated login test...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to login page
        console.log('📱 Navigating to login page...');
        await page.goto('http://localhost:3000/login');
        await page.waitForLoadState('networkidle');
        
        // Take initial screenshot
        await page.screenshot({ path: 'login_page_initial.png' });
        console.log('📸 Initial screenshot saved');
        
        // Fill in test credentials
        console.log('🔐 Entering test credentials...');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'TestPassword123!');
        
        // Take screenshot before login
        await page.screenshot({ path: 'login_page_filled.png' });
        console.log('📸 Form filled screenshot saved');
        
        // Submit the form
        console.log('🚀 Submitting login form...');
        await page.click('button[type="submit"]');
        
        // Wait for navigation or dashboard
        try {
            await page.waitForURL('**/dashboard', { timeout: 10000 });
            console.log('✅ Successfully logged in and redirected to dashboard!');
            
            // Take success screenshot
            await page.screenshot({ path: 'login_success_dashboard.png' });
            console.log('📸 Dashboard screenshot saved');
            
            return true;
        } catch (error) {
            console.log('⏳ Dashboard not found, checking for other indicators...');
            
            // Check if we're still on login page with error
            const currentUrl = page.url();
            if (currentUrl.includes('/login')) {
                // Look for error messages
                const errorMessage = await page.locator('[role="alert"], .error, .text-red-500').first().textContent().catch(() => null);
                if (errorMessage) {
                    console.log('❌ Login failed with error:', errorMessage);
                } else {
                    console.log('❌ Login failed - still on login page');
                }
                
                await page.screenshot({ path: 'login_failed.png' });
                console.log('📸 Error screenshot saved');
                return false;
            } else {
                console.log('✅ Login succeeded - redirected to:', currentUrl);
                await page.screenshot({ path: 'login_success_other.png' });
                console.log('📸 Success screenshot saved');
                return true;
            }
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error.message);
        await page.screenshot({ path: 'login_test_error.png' });
        console.log('📸 Error screenshot saved');
        return false;
    } finally {
        await browser.close();
    }
}

// Run the test
testLogin().then(success => {
    if (success) {
        console.log('🎉 Login automation test PASSED!');
        process.exit(0);
    } else {
        console.log('💔 Login automation test FAILED!');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
});
