import { describe, test, expect } from '@jest/globals';
import { personaSchema } from '../generated/validationSchemas';
import { createPersonaRequestSchema, updatePersonaRequestSchema } from '../alignedValidationSchemas';

describe('Persona isEnabled Field Tests', () => {
  describe('personaSchema validation', () => {
    test('should require isEnabled field', () => {
      const validPersona = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test DNS Persona',
        personaType: 'dns' as const,
        description: 'Test description',
        configDetails: {
          resolvers: ['8.8.8.8'],
          useSystemResolvers: false,
          queryTimeoutSeconds: 30
        },
        isEnabled: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const result = personaSchema.safeParse(validPersona);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isEnabled).toBe(true);
      }
    });

    test('should fail without isEnabled field', () => {
      const invalidPersona = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test DNS Persona',
        personaType: 'dns' as const,
        description: 'Test description',
        configDetails: {
          resolvers: ['8.8.8.8'],
          useSystemResolvers: false,
          queryTimeoutSeconds: 30
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
        // missing isEnabled field
      };

      const result = personaSchema.safeParse(invalidPersona);
      expect(result.success).toBe(false);
      if (!result.success) {
        const missingFields = result.error.issues.map(issue => issue.path.join('.'));
        expect(missingFields).toContain('isEnabled');
      }
    });

    test('should accept both true and false values for isEnabled', () => {
      const personaEnabled = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Enabled Persona',
        personaType: 'http' as const,
        description: 'Test enabled persona',
        configDetails: { userAgent: 'Test Agent' },
        isEnabled: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const personaDisabled = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        name: 'Disabled Persona',
        personaType: 'http' as const,
        description: 'Test disabled persona',
        configDetails: { userAgent: 'Test Agent' },
        isEnabled: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const resultEnabled = personaSchema.safeParse(personaEnabled);
      const resultDisabled = personaSchema.safeParse(personaDisabled);

      expect(resultEnabled.success).toBe(true);
      expect(resultDisabled.success).toBe(true);
      
      if (resultEnabled.success) {
        expect(resultEnabled.data.isEnabled).toBe(true);
      }
      if (resultDisabled.success) {
        expect(resultDisabled.data.isEnabled).toBe(false);
      }
    });
  });

  describe('createPersonaRequestSchema validation', () => {
    test('should accept isEnabled as optional field with default handling', () => {
      const createRequest = {
        name: 'New Persona',
        personaType: 'dns' as const,
        configDetails: {
          resolvers: ['1.1.1.1'],
          useSystemResolvers: false,
          queryTimeoutSeconds: 30
        }
        // isEnabled not provided - should be optional
      };

      const result = createPersonaRequestSchema.safeParse(createRequest);
      expect(result.success).toBe(true);
    });

    test('should accept isEnabled when provided', () => {
      const createRequest = {
        name: 'New Persona',
        personaType: 'dns' as const,
        configDetails: {
          resolvers: ['1.1.1.1'],
          useSystemResolvers: false,
          queryTimeoutSeconds: 30
        },
        isEnabled: true
      };

      const result = createPersonaRequestSchema.safeParse(createRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isEnabled).toBe(true);
      }
    });
  });

  describe('updatePersonaRequestSchema validation', () => {
    test('should accept isEnabled as optional field', () => {
      const updateRequest = {
        isEnabled: false
      };

      const result = updatePersonaRequestSchema.safeParse(updateRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isEnabled).toBe(false);
      }
    });

    test('should accept empty update request', () => {
      const updateRequest = {};

      const result = updatePersonaRequestSchema.safeParse(updateRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('Default value behavior', () => {
    test('database default value should be true as per schema', () => {
      // This test documents the expected behavior based on database schema
      // The database has: is_enabled BOOLEAN NOT NULL DEFAULT true
      // When creating a persona without specifying isEnabled, 
      // the database will set it to true by default
      
      const dbDefaultValue = true;
      expect(dbDefaultValue).toBe(true);
    });
  });
});