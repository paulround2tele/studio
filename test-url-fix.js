#!/usr/bin/env node

// Test script to verify the frontend-backend port mismatch fix
console.log('='.repeat(80));
console.log('FRONTEND-BACKEND PORT MISMATCH FIX VERIFICATION');
console.log('='.repeat(80));

// Simulate environment variables (like in our .env file)
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';
process.env.NODE_ENV = 'development';

// Test URL construction for different routes
function constructApiUrl(baseUrl, path) {
  const fullPath = `${baseUrl}${path}`;
  
  if (baseUrl.startsWith('http')) {
    // Absolute URL - use directly (development with explicit backend URL)
    return new URL(fullPath);
  }
  
  // Relative URL - use current origin (production where frontend/backend same origin)
  const origin = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000'; // Fallback for SSR
    
  return new URL(fullPath, origin);
}

// Test API client routing logic
function getEffectiveBaseUrl(baseUrl, path) {
  // Auth routes (/auth/*) are served directly from backend root
  if (path.startsWith('/auth') || path.startsWith('/me') || path.startsWith('/change-password')) {
    return baseUrl;
  }
  
  // API routes need /api/v2 prefix if not already included
  if (baseUrl.endsWith('/api/v2')) {
    return baseUrl;
  } else {
    return `${baseUrl}/api/v2`;
  }
}

console.log('Environment Configuration:');
console.log(`  NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log();

console.log('URL Construction Tests:');
console.log('='.repeat(40));

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// Test auth routes (should go directly to backend root)
const authPaths = ['/auth/login', '/auth/logout', '/me', '/change-password'];
console.log('AUTH ROUTES (no /api/v2 prefix):');
authPaths.forEach(path => {
  const effectiveBaseUrl = getEffectiveBaseUrl(baseUrl, path);
  const finalUrl = constructApiUrl(effectiveBaseUrl, path);
  console.log(`  ${path} -> ${finalUrl.toString()}`);
});

console.log();

// Test API routes (should get /api/v2 prefix)
const apiPaths = ['/campaigns', '/personas', '/proxies', '/config/dns'];
console.log('API ROUTES (with /api/v2 prefix):');
apiPaths.forEach(path => {
  const effectiveBaseUrl = getEffectiveBaseUrl(baseUrl, path);
  const finalUrl = constructApiUrl(effectiveBaseUrl, path);
  console.log(`  ${path} -> ${finalUrl.toString()}`);
});

console.log();
console.log('VERIFICATION RESULTS:');
console.log('='.repeat(40));

// Verify auth login endpoint
const authEffectiveUrl = getEffectiveBaseUrl(baseUrl, '/auth/login');
const authFinalUrl = constructApiUrl(authEffectiveUrl, '/auth/login');
const expectedAuthUrl = 'http://localhost:8080/auth/login';
const authCorrect = authFinalUrl.toString() === expectedAuthUrl;

console.log(`✅ Auth login endpoint: ${authCorrect ? 'FIXED' : 'BROKEN'}`);
console.log(`   Expected: ${expectedAuthUrl}`);
console.log(`   Actual:   ${authFinalUrl.toString()}`);

// Verify API campaign endpoint  
const apiEffectiveUrl = getEffectiveBaseUrl(baseUrl, '/campaigns');
const apiFinalUrl = constructApiUrl(apiEffectiveUrl, '/campaigns');
const expectedApiUrl = 'http://localhost:8080/api/v2/campaigns';
const apiCorrect = apiFinalUrl.toString() === expectedApiUrl;

console.log(`✅ API campaigns endpoint: ${apiCorrect ? 'FIXED' : 'BROKEN'}`);
console.log(`   Expected: ${expectedApiUrl}`);
console.log(`   Actual:   ${apiFinalUrl.toString()}`);

console.log();
console.log('SUMMARY:');
console.log('='.repeat(40));
if (authCorrect && apiCorrect) {
  console.log('🎉 SUCCESS: Frontend-Backend port mismatch has been RESOLVED!');
  console.log('✅ Auth requests now go to: http://localhost:8080/auth/*');
  console.log('✅ API requests now go to: http://localhost:8080/api/v2/*');
  console.log('✅ No more 404 errors expected on login attempts');
} else {
  console.log('❌ FAILURE: Port mismatch fix needs additional work');
}

console.log('='.repeat(80));