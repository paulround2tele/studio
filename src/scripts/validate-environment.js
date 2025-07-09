#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Validates that all required environment variables are properly configured
 * and prevents builds with hardcoded localhost or missing configuration.
 * 
 * This script enforces strict environment-based configuration to prevent
 * production bugs caused by accidental hardcoded values.
 */

function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required environment variables
  const requiredVars = {
    NEXT_PUBLIC_API_URL: {
      description: 'Backend API base URL',
      example: 'http://your-backend-host:8080/api/v2'
    },
    NEXT_PUBLIC_WS_URL: {
      description: 'Backend WebSocket URL',
      example: 'ws://your-backend-host:8080/api/v2/ws'
    }
  };

  // Validate required variables
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (!value || !value.trim()) {
      errors.push({
        variable: varName,
        issue: 'Missing or empty',
        example: config.example
      });
      continue;
    }

    // Check for localhost/127.0.0.1 in production
    if (process.env.NODE_ENV === 'production') {
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        errors.push({
          variable: varName,
          issue: 'Contains localhost/127.0.0.1 in production',
          example: config.example.replace('your-backend-host', 'production-backend-host')
        });
      }
    }

    // Validate URL format
    try {
      new URL(value);
    } catch {
      errors.push({
        variable: varName,
        issue: 'Invalid URL format',
        example: config.example
      });
    }
  }

  // Optional but recommended variables
  const optionalVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_PRODUCTION_DOMAIN'
  ];

  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value || !value.trim()) {
      warnings.push(`${varName} is not set (optional but recommended for WebSocket origin validation)`);
    }
  }

  // Report results
  console.log('🔍 Environment Configuration Validation\n');

  if (errors.length > 0) {
    console.error('❌ VALIDATION FAILED - Configuration errors found:\n');
    
    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error.variable}:`);
      console.error(`   Issue: ${error.issue}`);
      console.error(`   Example: ${error.variable}=${error.example}\n`);
    });

    console.error('🚫 Build aborted to prevent misconfiguration.');
    console.error('Please set the required environment variables and try again.\n');
    
    console.error('📝 Quick setup for development:');
    console.error('   export NEXT_PUBLIC_API_URL=http://your-backend-host:8080/api/v2');
    console.error('   export NEXT_PUBLIC_WS_URL=ws://your-backend-host:8080/api/v2/ws\n');
    
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  WARNINGS:\n');
    warnings.forEach((warning, index) => {
      console.warn(`${index + 1}. ${warning}`);
    });
    console.warn('');
  }

  console.log('✅ Environment configuration validation passed!');
  console.log(`   API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
  console.log(`   WebSocket URL: ${process.env.NEXT_PUBLIC_WS_URL}`);
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    console.log(`   App URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
  }
  
  console.log('\n🚀 Ready to build with proper configuration!\n');
}

// Run validation
try {
  validateEnvironment();
} catch (error) {
  console.error('💥 Environment validation script failed:', error);
  process.exit(1);
}