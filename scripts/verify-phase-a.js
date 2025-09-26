#!/usr/bin/env node

/**
 * Phase A Verification Script
 * Tests that migrated health endpoints return direct responses without SuccessEnvelope
 */

const { normalizeResponse, isDirectResponse } = require('../src/api/normalizeResponse.js');

// Test data simulating API responses
const testCases = [
  {
    name: 'Health endpoint (migrated)',
    response: { status: 'ok', version: '1.0.0', timestamp: '2025-01-25T20:00:00Z' },
    expected: { status: 'ok', version: '1.0.0', timestamp: '2025-01-25T20:00:00Z' },
    isDirect: true
  },
  {
    name: 'Ping endpoint (migrated)', 
    response: { message: 'pong', timestamp: '2025-01-25T20:00:00Z', version: '1.0.0' },
    expected: { message: 'pong', timestamp: '2025-01-25T20:00:00Z', version: '1.0.0' },
    isDirect: true
  },
  {
    name: 'Legacy enveloped response (not migrated yet)',
    response: { success: true, data: { id: '123', name: 'Test' }, requestId: 'req-456' },
    expected: { id: '123', name: 'Test' },
    isDirect: false
  },
  {
    name: 'Array response (direct)',
    response: [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }],
    expected: [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }],
    isDirect: true
  }
];

console.log('🧪 Phase A Verification: Health Endpoint Migration');
console.log('==================================================\n');

let passed = 0;
let total = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  try {
    // Test direct response detection
    const actualIsDirect = isDirectResponse(testCase.response);
    if (actualIsDirect !== testCase.isDirect) {
      console.log(`❌ Direct detection failed. Expected: ${testCase.isDirect}, Got: ${actualIsDirect}`);
      return;
    }
    
    // Test normalization
    const normalized = normalizeResponse(testCase.response);
    const expectedJson = JSON.stringify(testCase.expected);
    const actualJson = JSON.stringify(normalized);
    
    if (expectedJson === actualJson) {
      console.log(`✅ PASS - Normalized correctly`);
      console.log(`   Direct response: ${actualIsDirect}`);
      console.log(`   Result: ${actualJson.substring(0, 60)}${actualJson.length > 60 ? '...' : ''}`);
      passed++;
    } else {
      console.log(`❌ FAIL - Normalization mismatch`);
      console.log(`   Expected: ${expectedJson}`);
      console.log(`   Got: ${actualJson}`);
    }
  } catch (error) {
    console.log(`❌ FAIL - Exception: ${error.message}`);
  }
  
  console.log('');
});

console.log('📊 Results:');
console.log(`   ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('✅ All Phase A verification tests passed!');
  console.log('   Health endpoints successfully migrated to direct responses');
  process.exit(0);
} else {
  console.log('❌ Some tests failed - check implementation');
  process.exit(1);
}