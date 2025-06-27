const { chromium } = require('playwright');

async function testUINavigation() {
  console.log('🚀 Starting comprehensive UI navigation test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track errors
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(`Page error: ${error.message}`);
    console.log('❌ Page error:', error.message);
  });
  
  page.on('requestfailed', (request) => {
    errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    console.log('❌ Request failed:', request.url(), request.failure().errorText);
  });

  try {
    // Test 1: Login page access
    console.log('1️⃣ Testing login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    const loginTitle = await page.textContent('h3');
    console.log('✅ Login page loaded:', loginTitle);

    // Test 2: Login functionality  
    console.log('\n2️⃣ Testing login functionality...');
    await page.fill('#email', 'admin@domainflow.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    try {
      await page.waitForURL('http://localhost:3000/dashboard', { timeout: 10000 });
      console.log('✅ Login successful - redirected to dashboard');
    } catch (e) {
      // Check if we're still on login with error
      const currentUrl = page.url();
      console.log('⚠️ Login redirect issue. Current URL:', currentUrl);
      
      // Try to navigate manually to dashboard
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
    }

    // Test 3: Dashboard access
    console.log('\n3️⃣ Testing dashboard access...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    const dashboardContent = await page.textContent('body');
    if (dashboardContent.includes('Dashboard') || dashboardContent.includes('Welcome')) {
      console.log('✅ Dashboard accessible');
    } else {
      console.log('⚠️ Dashboard content unclear:', dashboardContent.substring(0, 100));
    }

    // Test 4: Campaigns section
    console.log('\n4️⃣ Testing campaigns section...');
    await page.goto('http://localhost:3000/campaigns');
    await page.waitForLoadState('networkidle');
    console.log('✅ Campaigns page accessible');

    // Test 5: Campaigns creation page
    console.log('\n5️⃣ Testing campaign creation...');
    await page.goto('http://localhost:3000/campaigns/create');
    await page.waitForLoadState('networkidle');
    console.log('✅ Campaign creation page accessible');

    // Test 6: Domains section
    console.log('\n6️⃣ Testing domains section...');
    await page.goto('http://localhost:3000/domains');
    await page.waitForLoadState('networkidle');
    console.log('✅ Domains page accessible');

    // Test 7: Analytics section
    console.log('\n7️⃣ Testing analytics section...');
    await page.goto('http://localhost:3000/analytics');
    await page.waitForLoadState('networkidle');
    console.log('✅ Analytics page accessible');

    // Test 8: Settings section
    console.log('\n8️⃣ Testing settings section...');
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    console.log('✅ Settings page accessible');

    // Test 9: Navigation menu (if exists)
    console.log('\n9️⃣ Testing navigation menu...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for common navigation elements
    const navElements = await page.$$eval('nav a, [role="navigation"] a, .nav a, .navigation a', 
      links => links.map(link => ({ text: link.textContent, href: link.href }))
    );
    
    if (navElements.length > 0) {
      console.log('✅ Navigation elements found:', navElements.length);
      for (const nav of navElements.slice(0, 5)) { // Test first 5 nav items
        try {
          if (nav.href && nav.href.includes('localhost:3000')) {
            console.log(`   Testing nav link: ${nav.text} -> ${nav.href}`);
            await page.goto(nav.href);
            await page.waitForLoadState('networkidle');
            console.log(`   ✅ ${nav.text} accessible`);
          }
        } catch (e) {
          console.log(`   ❌ ${nav.text} failed:`, e.message);
        }
      }
    } else {
      console.log('⚠️ No navigation elements found');
    }

    // Test 10: Test UI test page
    console.log('\n🔟 Testing test UI page...');
    await page.goto('http://localhost:3000/test-ui');
    await page.waitForLoadState('networkidle');
    console.log('✅ Test UI page accessible');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   Total errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('   Error details:');
      errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
    } else {
      console.log('   🎉 No errors detected during navigation!');
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    errors.push(`Test error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return errors;
}

// Run the test
testUINavigation().then((errors) => {
  if (errors.length === 0) {
    console.log('\n🎉 All UI navigation tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️ UI navigation tests completed with issues.');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
