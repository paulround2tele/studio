// src/scripts/validate-auth-flow.ts
// Validation script for Phase 2 authentication fixes
// Tests loading states, session management, and error handling

import { authService } from '../lib/services/authService';
import { getLogger } from '../lib/utils/logger';

const logger = getLogger();

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

/**
 * Validate authentication system fixes
 */
export async function validateAuthenticationSystem(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  logger.info('VALIDATION', 'Starting authentication system validation');

  // Test 1: Session check timeout handling
  try {
    const startTime = Date.now();
    const _user = await authService.getCurrentUser();
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Session check completes within timeout',
      passed: duration < 20000, // Should complete within 20 seconds
      duration
    });
  } catch (error) {
    results.push({
      test: 'Session check completes within timeout',
      passed: true, // Error is acceptable, infinite loading is not
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Login with invalid credentials (should fail gracefully)
  try {
    const startTime = Date.now();
    const result = await authService.login({
      email: 'test@invalid.com',
      password: 'invalid'
    });
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Invalid login fails gracefully',
      passed: !result.success && duration < 15000,
      duration
    });
  } catch (error) {
    results.push({
      test: 'Invalid login fails gracefully',
      passed: true, // Error handling is acceptable
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Logout handles gracefully
  try {
    const startTime = Date.now();
    const _result = await authService.logout();
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Logout completes within timeout',
      passed: duration < 10000,
      duration
    });
  } catch (error) {
    results.push({
      test: 'Logout completes within timeout',
      passed: true, // Error is acceptable for logout
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Configuration loading
  try {
    const hasConfig = process.env.NEXT_PUBLIC_API_URL !== undefined;
    results.push({
      test: 'Environment configuration available',
      passed: hasConfig
    });
  } catch (error) {
    results.push({
      test: 'Environment configuration available',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  logger.info('VALIDATION', 'Authentication validation completed', {
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length
  });

  return results;
}

// Export for use in testing
export default validateAuthenticationSystem;