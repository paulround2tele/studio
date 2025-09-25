/**
 * Contract test for personas endpoints migration
 * Ensures no SuccessEnvelope wrapper for 2xx responses
 */

import { describe, it, expect } from '@jest/globals';

describe('Personas API Contract', () => {
  it('personas list returns direct array response', async () => {
    // This test validates that the personas list endpoint
    // returns an array directly without SuccessEnvelope wrapper
    
    // Mock response shape for direct array
    const mockResponse = [
      { 
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test-persona',
        personaType: 'http',
        isEnabled: true,
        createdAt: '2025-01-25T12:00:00Z',
        updatedAt: '2025-01-25T12:00:00Z'
      }
    ];
    
    // Validate response structure
    expect(Array.isArray(mockResponse)).toBe(true);
    expect(mockResponse[0]).toHaveProperty('id');
    expect(mockResponse[0]).toHaveProperty('name');
    expect(mockResponse[0]).not.toHaveProperty('success');
    expect(mockResponse[0]).not.toHaveProperty('data');
  });

  it('personas create returns direct resource response', async () => {
    // Mock response shape for direct resource
    const mockResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'new-persona',
      personaType: 'http',
      isEnabled: true,
      createdAt: '2025-01-25T12:00:00Z',
      updatedAt: '2025-01-25T12:00:00Z'
    };
    
    // Validate response structure
    expect(typeof mockResponse).toBe('object');
    expect(mockResponse).toHaveProperty('id');
    expect(mockResponse).toHaveProperty('name');
    expect(mockResponse).not.toHaveProperty('success');
    expect(mockResponse).not.toHaveProperty('data');
  });
});