// Debug script to validate API issues diagnosis
console.log('=== API ISSUES DIAGNOSTIC ===');

// Check environment configuration
console.log('\n1. Environment Configuration:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('API_URL:', process.env.API_URL); 
console.log('NODE_ENV:', process.env.NODE_ENV);

// Check current API base URL
if (typeof window !== 'undefined') {
  console.log('Current window.location:', window.location.href);
  console.log('Expected backend URL: http://localhost:8080');
}

// Test API endpoints
console.log('\n2. Testing API Endpoints:');

async function testEndpoints() {
  const endpoints = [
    'http://localhost:3000/api/v2/health',  // Frontend (should fail)
    'http://localhost:8080/api/v2/health',  // Backend (should work)
    'http://localhost:3000/me',             // Frontend (should fail) 
    'http://localhost:8080/me',             // Backend (should work but need auth)
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      console.log(`✅ ${url} → ${response.status}`);
    } catch (error) {
      console.log(`❌ ${url} → ${error.message}`);
    }
  }
}

testEndpoints();

console.log('\n3. Expected Issues:');
console.log('- Frontend (3000) endpoints should fail (not found)');
console.log('- Backend (8080) health should work');
console.log('- Backend (8080) /me should return 401 (need auth)');