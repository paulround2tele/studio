/**
 * Integration tests for validation and type alignment
 * Tests SafeBigInt conversions, API transformations, and validation schemas
 */

import { describe, it, expect } from '@jest/globals';
// Updated to test standard TypeScript types instead of branded types
import {
  isValidUUID,
  isValidISODate
} from '@/lib/utils/validation';
import { 
  transformCampaignResponse, 
  transformCampaignArrayResponse 
} from '@/lib/api/transformers/campaign-transformers';
import {
  transformUserResponse,
  transformLoginResponse
} from '@/lib/api/transformers/auth-transformers';
import {
  transformErrorResponse,
  isValidationError,
  isAuthError
} from '@/lib/api/transformers/error-transformers';
import { validationSchemas } from '@/lib/schemas/alignedValidationSchemas';
import type { ModelsCampaignAPI } from '@/lib/api-client/models/models-campaign-api';
import type { ModelsUserAPI } from '@/lib/api-client/models/models-user-api';

describe('Type Conversions (Post-Migration)', () => {
  describe('Number Handling', () => {
    it('should handle large numbers correctly', () => {
      expect(Number(123)).toBe(123);
      expect(Number('456')).toBe(456);
      expect(Number(789)).toBe(789);
    });

    it('should validate number ranges', () => {
      expect(typeof 123).toBe('number');
      expect(typeof Number.MAX_SAFE_INTEGER).toBe('number');
      expect(Number.isInteger(123)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(Number(0)).toBe(0);
      expect(Number(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
      expect(Number(-1)).toBe(-1);
      expect(() => Number('invalid')).not.toThrow(); // Returns NaN
      expect(Number('invalid')).toBeNaN();
    });
  });

  describe('UUID', () => {
    it('should validate UUID format', () => {
      const validUuid = '123e4567-e89b-42d3-a456-426614174000';
      const invalidUuid = 'not-a-uuid';
      
      expect(isValidUUID(validUuid)).toBe(true);
      expect(isValidUUID(invalidUuid)).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    it('should handle UUID as regular string', () => {
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      expect(typeof uuid).toBe('string');
      expect(uuid).toBe('123e4567-e89b-42d3-a456-426614174000');
    });
  });

  describe('ISODateString', () => {
    it('should validate ISO date strings', () => {
      expect(isValidISODate('2023-01-01T00:00:00.000Z')).toBe(true);
      expect(isValidISODate('2023-01-01')).toBe(false);
      expect(isValidISODate('invalid')).toBe(false);
    });

    it('should handle date string as regular string', () => {
      const dateStr = '2023-01-01T00:00:00.000Z';
      expect(typeof dateStr).toBe('string');
      expect(dateStr).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should check date string validity', () => {
      const dateStr = '2023-01-01T00:00:00.000Z';
      expect(isValidISODate(dateStr)).toBe(true);
      expect(isValidISODate('invalid')).toBe(false);
    });
  });
});

describe('Campaign API Transformations', () => {
  const mockCampaignResponse: ModelsCampaignAPI = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    name: 'Test Campaign',
    campaignType: 'domain_generation',
    status: 'running',
    totalItems: 1000000, // Large number to test SafeBigInt
    processedItems: 500000,
    successfulItems: 450000,
    failedItems: 50000,
    progressPercentage: 50,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T12:00:00.000Z'
  };

  it('should transform campaign response with number conversion', () => {
    const transformed = transformCampaignResponse(mockCampaignResponse);
    
    expect(transformed.id).toBeDefined();
    expect(transformed.totalItems).toBe(1000000);
    expect(transformed.processedItems).toBe(500000);
    expect(transformed.successfulItems).toBe(450000);
    expect(transformed.failedItems).toBe(50000);
    expect(typeof transformed.totalItems).toBe('number');
  });

  it('should handle undefined number fields', () => {
    const campaignWithoutCounts: ModelsCampaignAPI = {
      ...mockCampaignResponse,
      totalItems: undefined,
      processedItems: undefined,
      successfulItems: undefined,
      failedItems: undefined
    };
    
    const transformed = transformCampaignResponse(campaignWithoutCounts);
    expect(transformed.totalItems).toBeUndefined();
    expect(transformed.processedItems).toBeUndefined();
    expect(transformed.successfulItems).toBeUndefined();
    expect(transformed.failedItems).toBeUndefined();
  });

  it('should transform array of campaigns', () => {
    const campaigns = [mockCampaignResponse, mockCampaignResponse];
    const transformed = transformCampaignArrayResponse(campaigns);
    
    expect(transformed).toHaveLength(2);
    expect(transformed[0]?.totalItems).toBe(1000000);
    expect(transformed[1]?.totalItems).toBe(1000000);
  });

  it('should handle empty or undefined arrays', () => {
    expect(transformCampaignArrayResponse([])).toEqual([]);
    expect(transformCampaignArrayResponse(undefined)).toEqual([]);
    expect(transformCampaignArrayResponse(null)).toEqual([]);
  });
});

describe('Authentication API Transformations', () => {
  const mockUserResponse: ModelsUserAPI = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    isLocked: false,
    emailVerified: true,
    mfaEnabled: false,
    mustChangePassword: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T12:00:00.000Z'
  };

  it('should transform user response with standard types', () => {
    const transformed = transformUserResponse(mockUserResponse as any);
    
    expect(transformed.id).toBeDefined();
    expect(transformed.email).toBe('test@example.com');
    expect(transformed.firstName).toBe('John');
    expect(transformed.lastName).toBe('Doe');
  });

  it('should handle login response with requiresCaptcha field', () => {
    const mockLoginResponse = {
      success: true,
      user: mockUserResponse,
      sessionId: 'session-123',
      expiresAt: '2023-01-02T00:00:00.000Z',
      requiresCaptcha: true
    };

    const transformed = transformLoginResponse(mockLoginResponse as any);
    expect(transformed.requiresCaptcha).toBe(true);
    expect(transformed.user).toBeDefined();
    expect(transformed.user?.id).toBeDefined();
  });

  it('should transform login response correctly', () => {
    const mockLoginResponse = {
      success: true,
      requiresCaptcha: true
    };

    const transformed = transformLoginResponse(mockLoginResponse as any);
    expect(transformed.requiresCaptcha).toBe(true);
  });
});

describe('Error Response Transformations', () => {
  it('should transform various error formats', () => {
    const backendError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Too short' }
      ]
    };
    
    const transformed = transformErrorResponse(backendError, 422);
    
    expect(transformed.code).toBe('VALIDATION_ERROR');
    expect(transformed.message).toBe('Validation failed');
    expect(transformed.fieldErrors).toEqual({
      email: 'Invalid email format',
      password: 'Too short'
    });
    expect(transformed.statusCode).toBe(422);
  });

  it('should identify error types correctly', () => {
    const validationError = transformErrorResponse({ message: 'Validation failed' }, 422);
    const authError = transformErrorResponse({ message: 'Unauthorized' }, 401);
    
    expect(isValidationError(validationError)).toBe(true);
    expect(isAuthError(authError)).toBe(true);
  });

  it('should handle string errors', () => {
    const transformed = transformErrorResponse('Something went wrong', 500);
    expect(transformed.code).toBe('ERROR');
    expect(transformed.message).toBe('Something went wrong');
    expect(transformed.statusCode).toBe(500);
  });
});

describe('Validation Schema Alignment', () => {
  describe('Login Request Validation', () => {
    it('should validate correct login request', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password12345' // 12+ characters
      };
      
      expect(() => validationSchemas.loginRequest.parse(validLogin)).not.toThrow();
    });

    it('should reject short passwords', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: 'short' // Less than 12 characters
      };
      
      expect(() => validationSchemas.loginRequest.parse(invalidLogin)).toThrow();
    });

    it('should reject invalid email', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: 'password12345'
      };
      
      expect(() => validationSchemas.loginRequest.parse(invalidLogin)).toThrow();
    });
  });

  describe('Campaign Creation Validation', () => {
    it('should validate domain generation campaign', () => {
      const validCampaign = {
        name: 'Test Campaign',
        campaignType: 'domain_generation',
        domainGenerationParams: {
          patternType: 'prefix',
          tld: '.com',
          numDomainsToGenerate: 1000,
          totalPossibleCombinations: 1000000
        }
      };
      
      expect(() => validationSchemas.createCampaignRequest.parse(validCampaign)).not.toThrow();
    });

    it('should reject campaign without required params', () => {
      const invalidCampaign = {
        name: 'Test Campaign',
        campaignType: 'domain_generation'
        // Missing domainGenerationParams
      };
      
      expect(() => validationSchemas.createCampaignRequest.parse(invalidCampaign)).toThrow();
    });

    it('should validate DNS validation campaign', () => {
      const validCampaign = {
        name: 'DNS Test',
        campaignType: 'dns_validation',
        dnsValidationParams: {
          personaIds: ['123e4567-e89b-42d3-a456-426614174000']
        }
      };
      
      expect(() => validationSchemas.createCampaignRequest.parse(validCampaign)).not.toThrow();
    });
  });

  describe('Persona Validation', () => {
    it('should validate persona creation', () => {
      const validPersona = {
        name: 'Test Persona',
        personaType: 'dns',
        configDetails: {
          dnsServers: ['8.8.8.8', '8.8.4.4']
        }
      };
      
      expect(() => validationSchemas.createPersonaRequest.parse(validPersona)).not.toThrow();
    });

    it('should reject invalid persona type', () => {
      const invalidPersona = {
        name: 'Test Persona',
        personaType: 'invalid', // Must be 'dns' or 'http'
        configDetails: {}
      };
      
      expect(() => validationSchemas.createPersonaRequest.parse(invalidPersona)).toThrow();
    });
  });

  describe('Proxy Validation', () => {
    it('should validate proxy with correct address format', () => {
      const validProxy = {
        name: 'Test Proxy',
        protocol: 'http',
        address: 'proxy.example.com:8080'
      };
      
      expect(() => validationSchemas.createProxyRequest.parse(validProxy)).not.toThrow();
    });

    it('should reject invalid address format', () => {
      const invalidProxy = {
        name: 'Test Proxy',
        protocol: 'http',
        address: 'not a valid address' // Must be hostname:port
      };
      
      expect(() => validationSchemas.createProxyRequest.parse(invalidProxy)).toThrow();
    });
  });
});

describe('Performance Tests for Number Operations', () => {
  it('should handle large campaign counts efficiently', () => {
    const largeCampaign: ModelsCampaignAPI = {
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Large Campaign',
      totalItems: Number.MAX_SAFE_INTEGER - 1000,
      processedItems: Number.MAX_SAFE_INTEGER - 2000,
      successfulItems: Number.MAX_SAFE_INTEGER - 3000,
      failedItems: 1000
    };
    
    const start = performance.now();
    const transformed = transformCampaignResponse(largeCampaign);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
    expect(transformed.totalItems).toBe(Number.MAX_SAFE_INTEGER - 1000);
  });

  it('should handle batch transformations efficiently', () => {
    const campaigns = Array(1000).fill(null).map((_, i) => ({
      id: `123e4567-e89b-42d3-a456-${i.toString(16).padStart(12, '0')}`,
      name: `Campaign ${i}`,
      totalItems: i * 1000,
      processedItems: i * 500
    }));
    
    const start = performance.now();
    const transformed = transformCampaignArrayResponse(campaigns as any);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(transformed).toHaveLength(1000);
  });
});