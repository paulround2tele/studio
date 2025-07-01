#!/usr/bin/env node

// Simple connectivity test script to verify frontend-backend communication
const fetch = require('node-fetch');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';

async function testConnectivity() {
  console.log('🔍 Testing frontend-backend connectivity...');
  console.log(`Backend URL: ${API_BASE_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('');

  // Test 1: Backend health check
  console.log('1️⃣  Testing backend health endpoint...');
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend health check: PASSED');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   Response: ${JSON.stringify(healthData, null, 2)}`);
    } else {
      console.log('❌ Backend health check: FAILED');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   StatusText: ${healthResponse.statusText}`);
    }
  } catch (error) {
    console.log('❌ Backend health check: ERROR');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Test 2: Backend ping endpoint
  console.log('2️⃣  Testing backend ping endpoint...');
  try {
    const pingResponse = await fetch(`${API_BASE_URL}/ping`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (pingResponse.ok) {
      const pingText = await pingResponse.text();
      console.log('✅ Backend ping: PASSED');
      console.log(`   Status: ${pingResponse.status}`);
      console.log(`   Response: ${pingText}`);
    } else {
      console.log('❌ Backend ping: FAILED');
      console.log(`   Status: ${pingResponse.status}`);
    }
  } catch (error) {
    console.log('❌ Backend ping: ERROR');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Test 3: Frontend accessibility
  console.log('3️⃣  Testing frontend accessibility...');
  try {
    const frontendResponse = await fetch(FRONTEND_URL, {
      method: 'GET',
      timeout: 5000
    });
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend accessibility: PASSED');
      console.log(`   Status: ${frontendResponse.status}`);
    } else {
      console.log('❌ Frontend accessibility: FAILED');
      console.log(`   Status: ${frontendResponse.status}`);
    }
  } catch (error) {
    console.log('❌ Frontend accessibility: ERROR');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Test 4: CORS configuration
  console.log('4️⃣  Testing CORS configuration...');
  try {
    const corsResponse = await fetch(`${API_BASE_URL}/ping`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
      },
      timeout: 5000
    });
    
    console.log('✅ CORS test completed');
    console.log(`   Status: ${corsResponse.status}`);
    console.log(`   CORS Headers: ${JSON.stringify({
      'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': corsResponse.headers.get('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
    }, null, 2)}`);
  } catch (error) {
    console.log('❌ CORS test: ERROR');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  console.log('🏁 Connectivity test completed!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   - If backend tests fail, check if Go server is running on port 8080');
  console.log('   - If frontend test fails, check if Next.js is running on port 3000'); 
  console.log('   - If CORS fails, check backend CORS configuration');
  console.log('   - Try accessing: http://localhost:3000/login to test login');
}

// Install node-fetch if not available
try {
  require.resolve('node-fetch');
} catch {
  console.log('📦 Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('✅ node-fetch installed');
}

testConnectivity().catch(console.error);