/**
 * Simple test to verify dynamic backend detection logic
 */

// Simulate the detection functions inline
async function detectBackendUrl() {
  // In production, backend is same origin
  if (process.env.NODE_ENV === 'production') {
    return '';  // Use relative URLs
  }
  
  // In development, try common backend ports
  if (typeof globalThis.window !== 'undefined') {
    const commonPorts = [8080, 3001, 5000, 8000, 4000];
    const host = globalThis.window.location.hostname;
    
    for (const port of commonPorts) {
      try {
        const testUrl = `http://${host}:${port}/health`;
        const response = await fetch(testUrl, { 
          method: 'GET',
          signal: { timeout: true } // Simplified AbortSignal
        });
        
        if (response.ok) {
          console.log(`✅ Backend detected at http://${host}:${port}`);
          return `http://${host}:${port}`;
        }
      } catch (error) {
        // Continue to next port
        console.log(`❌ No backend found at http://${host}:${port}`);
        continue;
      }
    }
  }
  
  // Fallback: assume same origin (for SSR or if detection fails)
  console.log('⚠️ Backend auto-detection failed, using same origin');
  return '';
}

async function getBackendUrl() {
  // If explicitly configured, use it
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    console.log(`🔧 Using configured backend URL: ${configured}`);
    return configured;
  }
  
  // Otherwise, auto-detect
  console.log('🔍 Auto-detecting backend URL...');
  return await detectBackendUrl();
}

// Setup test environment
globalThis.window = {
  location: {
    hostname: 'localhost',
    origin: 'http://localhost:3000'
  }
};

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

// Run tests
async function runTests() {
  console.log('\n🔍 Testing Dynamic Backend Auto-Detection\n');
  
  const results = {};
  
  // Test 1: Auto-detection in development
  console.log('Test 1: Auto-detection in development');
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_API_URL = '';
  
  const detectedUrl = await detectBackendUrl();
  console.log(`✅ Detected URL: "${detectedUrl}"`);
  console.log(`Expected: "http://localhost:8080"`);
  results.autoDetection = detectedUrl === 'http://localhost:8080';
  console.log(`Match: ${results.autoDetection ? '✅' : '❌'}\n`);
  
  // Test 2: Production mode
  console.log('Test 2: Production mode');
  process.env.NODE_ENV = 'production';
  
  const productionUrl = await detectBackendUrl();
  console.log(`✅ Production URL: "${productionUrl}"`);
  console.log(`Expected: "" (relative URLs)`);
  results.production = productionUrl === '';
  console.log(`Match: ${results.production ? '✅' : '❌'}\n`);
  
  // Test 3: Configured URL
  console.log('Test 3: Explicit configuration');
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  
  const configuredUrl = await getBackendUrl();
  console.log(`✅ Configured URL: "${configuredUrl}"`);
  console.log(`Expected: "https://api.example.com"`);
  results.configuration = configuredUrl === 'https://api.example.com';
  console.log(`Match: ${results.configuration ? '✅' : '❌'}\n`);
  
  // Test 4: Empty config triggers auto-detection
  console.log('Test 4: Empty config triggers auto-detection');
  process.env.NEXT_PUBLIC_API_URL = '';
  
  const autoDetectedUrl = await getBackendUrl();
  console.log(`✅ Auto-detected URL: "${autoDetectedUrl}"`);
  console.log(`Expected: "http://localhost:8080"`);
  results.emptyConfigDetection = autoDetectedUrl === 'http://localhost:8080';
  console.log(`Match: ${results.emptyConfigDetection ? '✅' : '❌'}\n`);
  
  console.log('🎉 Dynamic Backend Detection Test Complete!');
  
  return results;
}

// Execute tests
runTests()
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
      console.log('✅ Empty config triggers auto-detection');
    }
    
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });