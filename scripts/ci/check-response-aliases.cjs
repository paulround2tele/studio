#!/usr/bin/env node

/**
 * CI Script: Check Response Aliases
 * Validates that no 200-level response types alias SuccessEnvelope
 * Part of API Contract Migration Plan Phase A
 */

const fs = require('fs');
const path = require('path');

const SPEC_PATH = 'backend/openapi/dist/openapi.yaml';
const TYPES_PATH = 'src/lib/api-client/types.ts';
const LEGACY_TYPES_PATH = 'src/api/generated/types.ts';

function checkSpecFile() {
  if (!fs.existsSync(SPEC_PATH)) {
    console.log(`⚠️  Spec file not found: ${SPEC_PATH}`);
    return true; // Pass if spec doesn't exist yet
  }

  const content = fs.readFileSync(SPEC_PATH, 'utf-8');
  
  // Look for 2xx responses that still reference SuccessEnvelope
  const lines = content.split('\n');
  const violations = [];
  
  let currentPath = '';
  let currentMethod = '';
  let inResponseSection = false;
  let currentResponseCode = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Track current path
    if (trimmed.match(/^\/[^:]*:$/)) {
      currentPath = trimmed.replace(':', '');
    }
    
    // Track current method
    if (trimmed.match(/^(get|post|put|delete|patch|head|options):$/)) {
      currentMethod = trimmed.replace(':', '');
    }
    
    // Track responses section
    if (trimmed === 'responses:') {
      inResponseSection = true;
      continue;
    }
    
    // Track response code
    if (inResponseSection && trimmed.match(/^'[2]\d\d':$/)) {
      currentResponseCode = trimmed.replace(/[':]/g, '');
    }
    
    // Check for SuccessEnvelope reference in 2xx response
    if (inResponseSection && currentResponseCode.startsWith('2') && 
        trimmed.includes('SuccessEnvelope')) {
      violations.push({
        path: currentPath,
        method: currentMethod.toUpperCase(),
        responseCode: currentResponseCode,
        line: i + 1,
        content: trimmed
      });
    }
    
    // Reset context on new path/method
    if (trimmed.match(/^[a-zA-Z]/)) {
      inResponseSection = false;
      currentResponseCode = '';
    }
  }
  
  if (violations.length > 0) {
    console.error('❌ ERROR: Found SuccessEnvelope references in 2xx responses:');
    violations.forEach(v => {
      console.error(`   ${v.method} ${v.path} (${v.responseCode}) - Line ${v.line}`);
      console.error(`   Content: ${v.content}`);
    });
    return false;
  }
  
  console.log('✅ SPEC: No SuccessEnvelope references found in 2xx responses');
  return true;
}

function checkGeneratedTypes() {
  const pathsToCheck = [TYPES_PATH, LEGACY_TYPES_PATH];
  let allPassed = true;
  
  for (const typesPath of pathsToCheck) {
    if (!fs.existsSync(typesPath)) {
      console.log(`⚠️  Generated types not found: ${typesPath}`);
      continue;
    }

    const content = fs.readFileSync(typesPath, 'utf-8');
    
    // Look for 200Response types that alias SuccessEnvelope
    const matches = [...content.matchAll(/(\w+200Response)\s*=\s*.*SuccessEnvelope/g)];
    const offenders = matches.map(m => m[1]);
    
    if (offenders.length > 0) {
      console.error(`❌ ERROR: Found 200Response types that alias SuccessEnvelope in ${typesPath}:`);
      offenders.forEach(type => {
        console.error(`   ${type}`);
      });
      allPassed = false;
    } else {
      console.log(`✅ TYPES: No 200Response types alias SuccessEnvelope in ${typesPath}`);
    }
  }
  
  return allPassed;
}

function main() {
  console.log('🔍 Checking API contract compliance...');
  
  const specCheck = checkSpecFile();
  const typesCheck = checkGeneratedTypes();
  
  if (specCheck && typesCheck) {
    console.log('✅ All API contract checks passed');
    process.exit(0);
  } else {
    console.error('❌ API contract validation failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkSpecFile, checkGeneratedTypes };
