#!/usr/bin/env node

/**
 * Session Persistence Testing Script
 * 
 * This script tests the complete session persistence flow:
 * 1. Login with test credentials
 * 2. Extract session cookie from response
 * 3. Test that the session cookie persists and works
 * 4. Verify authenticated requests work with the cookie
 */

const axios = require('axios');
const { parse: parseCookie } = require('cookie');

const BASE_URL = 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

// Configure axios to handle cookies
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Origin': FRONTEND_URL,
    'Referer': `${FRONTEND_URL}/login`,
    'User-Agent': 'SessionPersistenceTest/1.0'
  },
  withCredentials: true,
  validateStatus: (status) => status < 500 // Don't throw on 4xx errors
});

let sessionCookie = null;

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  switch(level) {
    case 'SUCCESS':
      console.log(`\x1b[32m${prefix} ✅ ${message}\x1b[0m`);
      break;
    case 'ERROR':
      console.log(`\x1b[31m${prefix} ❌ ${message}\x1b[0m`);
      break;
    case 'WARNING':
      console.log(`\x1b[33m${prefix} ⚠️  ${message}\x1b[0m`);
      break;
    case 'INFO':
    default:
      console.log(`\x1b[36m${prefix} ℹ️  ${message}\x1b[0m`);
      break;
  }
}

function extractSessionCookie(response) {
  const setCookieHeaders = response.headers['set-cookie'];
  log(`Raw Set-Cookie headers: ${JSON.stringify(setCookieHeaders)}`, 'DEBUG');
  
  if (!setCookieHeaders) {
    log('No Set-Cookie headers found in response', 'ERROR');
    return null;
  }

  for (const cookieHeader of setCookieHeaders) {
    log(`Parsing cookie header: ${cookieHeader}`, 'DEBUG');
    const cookies = parseCookie(cookieHeader);
    if (cookies.domainflow_session) {
      return {
        name: 'domainflow_session',
        value: cookies.domainflow_session,
        raw: cookieHeader
      };
    }
  }
  log('No domainflow_session cookie found', 'ERROR');
  return null;
}

async function testLogin() {
  log('Starting login test...');
  
  try {
    log(`POST ${BASE_URL}/auth/login`, 'DEBUG');
    log(`Request payload: ${JSON.stringify({email: TEST_EMAIL, password: "***"}, null, 2)}`, 'DEBUG');
    
    const response = await client.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    log(`Response status: ${response.status}`, 'DEBUG');
    log(`Response headers: ${JSON.stringify(response.headers, null, 2)}`, 'DEBUG');
    log(`Response data: ${JSON.stringify(response.data, null, 2)}`, 'DEBUG');

    if (response.status === 200) {
      log('Login request successful', 'SUCCESS');
      
      // Extract session cookie
      sessionCookie = extractSessionCookie(response);
      
      if (sessionCookie) {
        log(`Session cookie extracted: ${sessionCookie.name}=${sessionCookie.value.substring(0, 20)}...`, 'SUCCESS');
        log(`Full cookie: ${sessionCookie.raw}`, 'INFO');
        return true;
      } else {
        log('No session cookie found in response headers', 'ERROR');
        return false;
      }
    } else {
      log(`Login failed with status: ${response.status}`, 'ERROR');
      log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`Login request failed: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Error status: ${error.response.status}`, 'ERROR');
      log(`Error response: ${JSON.stringify(error.response.data, null, 2)}`, 'ERROR');
      log(`Error headers: ${JSON.stringify(error.response.headers, null, 2)}`, 'ERROR');
    }
    return false;
  }
}

async function testSessionPersistence() {
  if (!sessionCookie) {
    log('No session cookie available for persistence test', 'ERROR');
    return false;
  }

  log('Testing session persistence with fresh client (simulating browser refresh)...');

  try {
    // Create a completely new client instance to simulate a fresh browser session
    const cookieString = `${sessionCookie.name}=${sessionCookie.value}`;
    log(`Using cookie: ${cookieString}`, 'DEBUG');
    
    const newClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': `${FRONTEND_URL}/dashboard`,
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 SessionPersistenceTest'
      },
      withCredentials: true,
      validateStatus: (status) => status < 500
    });

    log(`GET ${BASE_URL}/me with cookie`, 'DEBUG');
    
    // Test authenticated endpoint
    const response = await newClient.get('/me');

    log(`Persistence test response status: ${response.status}`, 'DEBUG');
    log(`Persistence test response headers: ${JSON.stringify(response.headers, null, 2)}`, 'DEBUG');
    log(`Persistence test response data: ${JSON.stringify(response.data, null, 2)}`, 'DEBUG');

    if (response.status === 200) {
      log('Session persistence test successful - user authenticated with cookie', 'SUCCESS');
      log(`Authenticated user: ${response.data.email || 'user data incomplete'}`, 'SUCCESS');
      return true;
    } else if (response.status === 401) {
      log('Session persistence FAILED - cookie not recognized or expired', 'ERROR');
      log('This means the session cookie is not working correctly', 'ERROR');
      return false;
    } else {
      log(`Unexpected response status: ${response.status}`, 'WARNING');
      log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'INFO');
      return false;
    }
  } catch (error) {
    log(`Session persistence test failed: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Error status: ${error.response.status}`, 'ERROR');
      log(`Error response: ${JSON.stringify(error.response.data, null, 2)}`, 'ERROR');
      log(`Error headers: ${JSON.stringify(error.response.headers, null, 2)}`, 'ERROR');
    }
    return false;
  }
}

async function testCookieFormat() {
  if (!sessionCookie) {
    log('No session cookie available for format test', 'ERROR');
    return false;
  }

  log('Analyzing cookie format...');
  
  const cookieParts = sessionCookie.raw.split(';').map(part => part.trim());
  const analysis = {
    hasPath: false,
    hasMaxAge: false,
    hasHttpOnly: false,
    hasSameSite: false,
    hasSecure: false,
    hasDomain: false
  };

  cookieParts.forEach(part => {
    if (part.toLowerCase().includes('path=')) analysis.hasPath = true;
    if (part.toLowerCase().includes('max-age=')) analysis.hasMaxAge = true;
    if (part.toLowerCase().includes('httponly')) analysis.hasHttpOnly = true;
    if (part.toLowerCase().includes('samesite=')) analysis.hasSameSite = true;
    if (part.toLowerCase().includes('secure')) analysis.hasSecure = true;
    if (part.toLowerCase().includes('domain=')) analysis.hasDomain = true;
  });

  log(`Cookie format analysis:`, 'INFO');
  log(`  Path: ${analysis.hasPath ? '✅' : '❌'}`, 'INFO');
  log(`  Max-Age: ${analysis.hasMaxAge ? '✅' : '❌'}`, 'INFO');
  log(`  HttpOnly: ${analysis.hasHttpOnly ? '✅' : '❌'}`, 'INFO');
  log(`  SameSite: ${analysis.hasSameSite ? '✅' : '❌'}`, 'INFO');
  log(`  Secure: ${analysis.hasSecure ? '❌ (correct for localhost)' : '✅ (correct for localhost)'}`, 'INFO');
  log(`  Domain: ${analysis.hasDomain ? '❌ (should be empty for localhost)' : '✅ (correct for localhost)'}`, 'INFO');

  return true;
}

async function runTests() {
  console.log('\n🧪 Session Persistence Testing Script\n');
  console.log('='*50);
  
  // Test backend connectivity
  log('Testing backend connectivity...');
  try {
    await client.get('/health');
    log('Backend server is responding', 'SUCCESS');
  } catch (error) {
    log('Backend server is not responding - make sure it\'s running on localhost:8080', 'ERROR');
    process.exit(1);
  }

  let allTestsPassed = true;

  // Test 1: Login and cookie extraction
  log('\n--- Test 1: Login and Cookie Extraction ---');
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    allTestsPassed = false;
  }

  // Test 2: Cookie format analysis
  if (loginSuccess) {
    log('\n--- Test 2: Cookie Format Analysis ---');
    await testCookieFormat();
  }

  // Test 3: Session persistence
  if (loginSuccess) {
    log('\n--- Test 3: Session Persistence ---');
    const persistenceSuccess = await testSessionPersistence();
    if (!persistenceSuccess) {
      allTestsPassed = false;
    }
  }

  // Final results
  console.log('\n' + '='*50);
  if (allTestsPassed) {
    log('🎉 ALL TESTS PASSED - Session persistence is working correctly!', 'SUCCESS');
  } else {
    log('💥 SOME TESTS FAILED - Session persistence issues detected', 'ERROR');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  log(`Unexpected error: ${error.message}`, 'ERROR');
  console.error(error);
  process.exit(1);
});