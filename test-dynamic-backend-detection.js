/**
 * Test script to verify dynamic backend detection works without hardcoded URLs
 */

// Simulate browser environment for testing
globalThis.window = {
  location: {
    hostname: 'localhost',
    origin: 'http://localhost:3000'
  }
};

// Simulate fetch for testing
globalThis.fetch = async (url, options) => {
  console.log(`📡 Testing backend at: ${url}`);
  
  // Simulate backend being available at port 8080
  if (url.includes(':8080/health')) {
    console.log(`✅ Backend found at port 8080`);
    return { ok: true };
  }
  
  // Simulate other ports failing
  console.log(`❌ No backend at ${url}`);
  throw new Error('Backend not available');
};

// Simulate AbortSignal.timeout
globalThis.AbortSignal = {
  timeout: () => ({ timeout: true })
};

// Test the detection functions
async function testBackendDetection() {
  console.log('\n🔍 Testing Dynamic Backend Auto-Detection\n');
  
  // Import our detection functions
  const { detectBackendUrl, getBackendUrl } = await import('./src/lib/utils/url.ts');
  
  // Test 1: Auto-detection in development
  console.log('Test 1: Auto-detection in development');
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_API_URL = ''; // Empty to trigger auto-detection
  
  const detectedUrl = await detectBackendUrl();
  console.log(`✅ Detected URL: "${detectedUrl}"`);
  console.log(`Expected: "http://localhost:8080"`);
  console.log(`Match: ${detectedUrl === 'http://localhost:8080' ? '✅' : '❌'}\n`);
  
  // Test 2: Production mode (should use relative URLs)
  console.log('Test 2: Production mode');
  process.env.NODE_ENV = 'production';
  
  const productionUrl = await detectBackendUrl();
  console.log(`✅ Production URL: "${productionUrl}"`);
  console.log(`Expected: "" (relative URLs)`);
  console.log(`Match: ${productionUrl === '' ? '✅' : '❌'}\n`);
  
  // Test 3: Configured URL (should use it)
  console.log('Test 3: Explicit configuration');
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  
  const configuredUrl = await getBackendUrl();
  console.log(`✅ Configured URL: "${configuredUrl}"`);
  console.log(`Expected: "https://api.example.com"`);
  console.log(`Match: ${configuredUrl === 'https://api.example.com' ? '✅' : '❌'}\n`);
  
  // Test 4: Empty config triggers auto-detection
  console.log('Test 4: Empty config triggers auto-detection');
  process.env.NEXT_PUBLIC_API_URL = '';
  
  const autoDetectedUrl = await getBackendUrl();
  console.log(`✅ Auto-detected URL: "${autoDetectedUrl}"`);
  console.log(`Expected: "http://localhost:8080"`);
  console.log(`Match: ${autoDetectedUrl === 'http://localhost:8080' ? '✅' : '❌'}\n`);
  
  console.log('🎉 Dynamic Backend Detection Test Complete!');
  
  return {
    autoDetection: detectedUrl === 'http://localhost:8080',
    production: productionUrl === '',
    configuration: configuredUrl === 'https://api.example.com',
    emptyConfigDetection: autoDetectedUrl === 'http://localhost:8080'
  };
}

// Run the test
testBackendDetection()
  .then(results => {
    console.log('\n📊 Test Results Summary:');
    console.log(`Auto-detection: ${results.autoDetection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Production mode: ${results.production ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Configuration override: ${results.configuration ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Empty config detection: ${results.emptyConfigDetection ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log(`\n🏁 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🚀 Dynamic backend detection is working correctly!');
      console.log('✅ No hardcoded localhost URLs needed');
      console.log('✅ Auto-detection finds backend on port 8080');
      console.log('✅ Production uses relative URLs');
      console.log('✅ Configuration override works');
    }
    
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });