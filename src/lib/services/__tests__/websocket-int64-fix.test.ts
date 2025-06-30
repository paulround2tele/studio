/**
 * Test for CV-009: WebSocket Int64 Field Handling
 * Verifies that WebSocket messages properly handle int64 fields using SafeBigInt
 */

import { WebSocketService } from '../websocketService.simple';

describe('CV-009: WebSocket Number Field Handling (Post-Migration)', () => {
  let service: WebSocketService;

  beforeEach(() => {
    // Create service instance with access to private methods for testing
    service = new WebSocketService();
  });

  describe('parseAndTransformMessage', () => {
    it('should handle large numbers correctly', () => {
      const rawData = JSON.stringify({
        type: 'campaign_progress',
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        validationsProcessed: 9007199254740993, // Large number
        domainsGenerated: 1234567890,
        data: {
          totalItems: 1000000000000, // 1 trillion
          processedItems: 999999999999,
          successfulItems: 888888888888,
          failedItems: 0
        }
      });

      // Access private method via prototype
      const parseMethod = (service as any).parseAndTransformMessage.bind(service);
      const result = parseMethod(rawData);

      // Check top-level fields
      expect(typeof result.validationsProcessed).toBe('number');
      expect(typeof result.domainsGenerated).toBe('number');
      expect(result.validationsProcessed).toBe(9007199254740993);
      expect(result.domainsGenerated).toBe(1234567890);

      // Check data fields
      const data = result.data as any;
      expect(typeof data.totalItems).toBe('number');
      expect(typeof data.processedItems).toBe('number');
      expect(typeof data.successfulItems).toBe('number');
      expect(typeof data.failedItems).toBe('number');
      
      expect(data.totalItems).toBe(1000000000000);
      expect(data.processedItems).toBe(999999999999);
      expect(data.successfulItems).toBe(888888888888);
      expect(data.failedItems).toBe(0);
    });

    it('should handle undefined number fields gracefully', () => {
      const rawData = JSON.stringify({
        type: 'campaign_progress',
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        data: {
          phase: 'domain_generation',
          status: 'running'
        }
      });

      const parseMethod = (service as any).parseAndTransformMessage.bind(service);
      const result = parseMethod(rawData);

      expect(result.validationsProcessed).toBeUndefined();
      expect(result.domainsGenerated).toBeUndefined();
      expect(result.data.totalItems).toBeUndefined();
      expect(result.data.processedItems).toBeUndefined();
    });

    it('should handle edge cases around MAX_SAFE_INTEGER', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER; // 9007199254740991
      
      const rawData = JSON.stringify({
        type: 'test',
        data: {
          totalItems: maxSafeInt,
          processedItems: maxSafeInt - 1000,
          successfulItems: 0,
          failedItems: 100,
          domainsGenerated: -123
        }
      });

      const parseMethod = (service as any).parseAndTransformMessage.bind(service);
      const result = parseMethod(rawData);
      const data = result.data as any;

      // All fields should be numbers
      expect(typeof data.totalItems).toBe('number');
      expect(typeof data.processedItems).toBe('number');
      expect(typeof data.successfulItems).toBe('number');
      expect(typeof data.failedItems).toBe('number');
      expect(typeof data.domainsGenerated).toBe('number');

      // Values should be preserved
      expect(data.totalItems).toBe(maxSafeInt);
      expect(data.processedItems).toBe(maxSafeInt - 1000);
      expect(data.successfulItems).toBe(0);
      expect(data.failedItems).toBe(100);
      expect(data.domainsGenerated).toBe(-123);
    });
  });

  describe('serializeMessage', () => {
    it('should serialize number fields correctly', () => {
      const message = {
        type: 'test_message',
        data: {
          campaignId: '123e4567-e89b-12d3-a456-426614174000'
        },
        validationsProcessed: 9007199254740993,
        domainsGenerated: 1234567890
      };

      const serializeMethod = (service as any).serializeMessage.bind(service);
      const serialized = serializeMethod(message);
      const parsed = JSON.parse(serialized);

      // Verify number fields are preserved
      expect(typeof parsed.validationsProcessed).toBe('number');
      expect(parsed.validationsProcessed).toBe(9007199254740993);
      expect(typeof parsed.domainsGenerated).toBe('number');
      expect(parsed.domainsGenerated).toBe(1234567890);
    });

    it('should serialize nested number fields in data object', () => {
      const message = {
        type: 'campaign_progress',
        data: {
          totalItems: 9223372036854775807,
          processedItems: 999999999999,
          successfulItems: 888888888888,
          failedItems: 0,
          progress: 50,
          phase: 'validation',
          status: 'running'
        }
      };

      const serializeMethod = (service as any).serializeMessage.bind(service);
      const serialized = serializeMethod(message);
      const parsed = JSON.parse(serialized);
      const data = parsed.data;

      // Verify all number fields remain numbers
      expect(typeof data.totalItems).toBe('number');
      expect(data.totalItems).toBe(9223372036854775807);
      expect(typeof data.processedItems).toBe('number');
      expect(data.processedItems).toBe(999999999999);
      expect(typeof data.successfulItems).toBe('number');
      expect(data.successfulItems).toBe(888888888888);
      expect(typeof data.failedItems).toBe('number');
      expect(data.failedItems).toBe(0);

      // Other fields should remain unchanged
      expect(data.progress).toBe(50);
      expect(data.phase).toBe('validation');
      expect(data.status).toBe('running');
    });

    it('should handle undefined number fields', () => {
      const message = {
        type: 'test_message',
        data: {
          campaignId: '123e4567-e89b-12d3-a456-426614174000',
          someField: 'value'
        }
      };

      const serializeMethod = (service as any).serializeMessage.bind(service);
      const serialized = serializeMethod(message);
      const parsed = JSON.parse(serialized);

      // Should not have undefined fields
      expect(parsed.validationsProcessed).toBeUndefined();
      expect(parsed.domainsGenerated).toBeUndefined();
      expect(parsed.data.campaignId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(parsed.data.someField).toBe('value');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle campaign progress messages with trillion-scale numbers', () => {
      const rawData = JSON.stringify({
        type: 'campaign_progress',
        timestamp: '2025-06-20T12:00:00.000Z',
        data: {
          campaignId: '550e8400-e29b-41d4-a716-446655440000',
          totalItems: 1000000000000, // 1 trillion
          processedItems: 500000000000, // 500 billion
          successfulItems: 499999999999, // 499.9 billion
          failedItems: 1,
          progressPercent: 50.0,
          phase: 'domain_validation',
          status: 'running'
        }
      });

      const parseMethod = (service as any).parseAndTransformMessage.bind(service);
      const result = parseMethod(rawData);
      const data = result.data as any;

      expect(result.type).toBe('campaign_progress');
      
      // All numeric fields should be numbers
      expect(typeof data.totalItems).toBe('number');
      expect(typeof data.processedItems).toBe('number');
      expect(typeof data.successfulItems).toBe('number');
      expect(typeof data.failedItems).toBe('number');

      // Verify values
      expect(data.totalItems).toBe(1000000000000);
      expect(data.processedItems).toBe(500000000000);
      expect(data.successfulItems).toBe(499999999999);
      expect(data.failedItems).toBe(1);

      // Progress percentage should remain a regular number
      expect(typeof data.progressPercent).toBe('number');
      expect(data.progressPercent).toBe(50.0);
    });

    it('should round-trip serialize and parse correctly', () => {
      const originalMessage = {
        type: 'domain_generated',
        validationsProcessed: 9007199254740993,
        domainsGenerated: 1000000000000,
        data: {
          campaignId: '123e4567-e89b-12d3-a456-426614174000',
          totalGenerated: 5000000000000,
          offset: 1234567890123456789
        }
      };

      // Serialize
      const serializeMethod = (service as any).serializeMessage.bind(service);
      const serialized = serializeMethod(originalMessage);

      // Parse back
      const parseMethod = (service as any).parseAndTransformMessage.bind(service);
      const parsed = parseMethod(serialized);

      // Verify round-trip maintains values
      expect(parsed.validationsProcessed).toBe(9007199254740993);
      expect(parsed.domainsGenerated).toBe(1000000000000);
      expect((parsed.data as any).totalGenerated).toBe(5000000000000);
      expect((parsed.data as any).offset).toBe(1234567890123456789);
    });
  });
});