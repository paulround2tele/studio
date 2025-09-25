/**
 * UUID Validation Tests
 *
 * Tests the centralized UUID validation utility to ensure:
 * 1. Valid UUIDs pass validation
 * 2. Invalid UUIDs are caught and provide clear error messages
 * 3. Bulk operations handle mixed valid/invalid UUIDs properly
 * 4. Integration with toast notifications works as expected
 */

// Mock toast for testing
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

import {
  isValidUUID,
  validateUUID,
  validateUUIDs,
  validateBulkEnrichedDataRequest,
  validateBulkLogsLeadsRequest,
  validatePersonaIds,
  validateCampaignId
} from './uuidValidation';

const { toast } = require('@/hooks/use-toast');
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('UUID Validation Utility', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  describe('isValidUUID', () => {
    test('should validate correct UUID v4 format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '123e4567-e89b-12d3-a456-426614174000'
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    test('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        '550e8400-e29b-41d4-g716-446655440000', // invalid character
        '', // empty
        'null',
        'undefined'
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('validateUUID', () => {
    test('should return success for valid UUID', () => {
      const result = validateUUID('550e8400-e29b-41d4-a716-446655440000', { 
        showToast: false 
      });
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should return error for invalid UUID and show toast', () => {
      const result = validateUUID('invalid-uuid', { 
        fieldName: 'Test ID',
        showToast: true 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Test ID must be a valid UUID format');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid UUID Format",
        description: expect.stringContaining('Test ID must be a valid UUID format'),
        variant: "destructive"
      });
    });

    test('should handle null/undefined values', () => {
      const result = validateUUID(null, { 
        allowEmpty: false,
        showToast: false 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('UUID is required');
    });
  });

  describe('validateUUIDs', () => {
    test('should validate array of valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];
      
      const result = validateUUIDs(validUUIDs, { showToast: false });
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should detect invalid UUIDs in array', () => {
      const mixedUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000', // valid
        'invalid-uuid', // invalid
        'f47ac10b-58cc-4372-a567-0e02b2c3d479' // valid
      ];
      
      const result = validateUUIDs(mixedUUIDs, { 
        showToast: false,
        fieldName: 'Campaign IDs'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Campaign IDs contains 1 invalid UUID');
      expect(result.invalidUuids).toContain('invalid-uuid');
    });

    test('should enforce maximum length constraints', () => {
      const tooManyUUIDs = Array(1001).fill('550e8400-e29b-41d4-a716-446655440000');
      
      const result = validateUUIDs(tooManyUUIDs, { 
        maxLength: 1000,
        showToast: false 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot contain more than 1000 items');
    });
  });

  describe('validateBulkEnrichedDataRequest', () => {
    test('should enforce 1000 campaign limit', () => {
      const tooManyCampaigns = Array(1001).fill('550e8400-e29b-41d4-a716-446655440000');
      
      const result = validateBulkEnrichedDataRequest(tooManyCampaigns);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot contain more than 1000 items');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Too Many Items",
        description: expect.stringContaining('cannot contain more than 1000 items'),
        variant: "destructive"
      });
    });

    test('should validate valid bulk request', () => {
      const validCampaigns = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];
      
      const result = validateBulkEnrichedDataRequest(validCampaigns);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateBulkLogsLeadsRequest', () => {
    test('should enforce 50 campaign limit for logs/leads', () => {
      const tooManyCampaigns = Array(51).fill('550e8400-e29b-41d4-a716-446655440000');
      
      const result = validateBulkLogsLeadsRequest(tooManyCampaigns, 'logs');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot contain more than 50 items');
    });

    test('should validate valid logs request', () => {
      const validCampaigns = [
        '550e8400-e29b-41d4-a716-446655440000'
      ];
      
      const result = validateBulkLogsLeadsRequest(validCampaigns, 'logs');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePersonaIds', () => {
    test('should require at least one persona', () => {
      const result = validatePersonaIds([], 'DNS validation');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must contain at least 1 item');
    });

    test('should validate valid persona IDs', () => {
      const validPersonas = ['550e8400-e29b-41d4-a716-446655440000'];
      
      const result = validatePersonaIds(validPersonas, 'DNS validation');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCampaignId', () => {
    test('should validate single campaign ID', () => {
      const result = validateCampaignId('550e8400-e29b-41d4-a716-446655440000');
      
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid campaign ID', () => {
      const result = validateCampaignId('invalid-id');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Campaign ID must be a valid UUID format');
    });
  });


  describe('Integration with Toast Notifications', () => {
    test('should show toast for validation errors when enabled', () => {
      validateUUID('invalid-uuid', { 
        fieldName: 'Test Field',
        showToast: true 
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid UUID Format",
        description: expect.stringContaining('Test Field must be a valid UUID format'),
        variant: "destructive"
      });
    });

    test('should not show toast when disabled', () => {
      validateUUID('invalid-uuid', { 
        showToast: false 
      });
      
      expect(mockToast).not.toHaveBeenCalled();
    });

    test('should show appropriate titles for different error types', () => {
      // Test required field error
      validateUUID(null, { 
        fieldName: 'Required Field',
        showToast: true 
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Validation Error",
        description: expect.stringContaining('Required Field is required'),
        variant: "destructive"
      });
    });
  });
});

/**
 * Integration Test: Demonstrate Real-World Usage
 * 
 * This test shows how the UUID validation prevents 400 errors
 * and provides clear user feedback instead.
 */
describe('Real-World Integration Examples', () => {
  test('Bulk Campaign Data Request - Invalid UUID Prevention', () => {
    // Simulate user providing invalid campaign IDs
    const userProvidedIds = [
      '550e8400-e29b-41d4-a716-446655440000', // valid
      'not-a-uuid', // invalid - would cause 400 error without validation
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'  // valid
    ];

    // Our validation catches this BEFORE the API call
    const result = validateBulkEnrichedDataRequest(userProvidedIds);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('invalid UUID');
    
    // Toast notification provides clear user feedback
    expect(mockToast).toHaveBeenCalledWith({
      title: "Invalid UUID Format",
      description: expect.stringContaining('Campaign IDs contains 1 invalid UUID'),
      variant: "destructive"
    });
  });

  test('Phase Configuration - Persona ID Validation', () => {
    // Simulate user selecting invalid persona
    const invalidPersonaId = 'corrupted-persona-id';

    // Our validation prevents the API call
    const result = validatePersonaIds([invalidPersonaId], 'DNS validation');
    
    expect(result.isValid).toBe(false);
    
    // User gets immediate feedback instead of cryptic 400 error
    expect(mockToast).toHaveBeenCalledWith({
      title: "Invalid UUID Format",
      description: expect.stringContaining('Persona IDs contains 1 invalid UUID'),
      variant: "destructive"
    });
  });

  test('Enterprise Scale - Bulk Request Limits', () => {
    // Simulate enterprise user trying to request too many campaigns
    const enterpriseScale = Array(2000).fill('550e8400-e29b-41d4-a716-446655440000');

    // Our validation prevents backend overload
    const result = validateBulkEnrichedDataRequest(enterpriseScale);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot contain more than 1000 items');
    
    // Clear guidance on limits
    expect(mockToast).toHaveBeenCalledWith({
      title: "Too Many Items",
      description: expect.stringContaining('Current: 2000'),
      variant: "destructive"
    });
  });
});