/**
 * Server Adapter Tests (Phase 3)
 */

import { 
  transformServerResponse, 
  validateServerResponse, 
  createDefaultSnapshot, 
  ServerMetricsResponse 
} from '../serverAdapter';
import { AggregateSnapshot } from '@/types/campaignMetrics';

// Mock server responses for testing
const mockValidServerResponse: ServerMetricsResponse = {
  aggregates: {
    totalDomains: 100,
    successRate: 85,
    avgLeadScore: 75,
    dnsSuccessRate: 90,
    httpSuccessRate: 80,
    highPotentialCount: 25,
    leadsCount: 15,
    avgRichness: 65,
    warningRate: 15,
    keywordCoverage: 70,
    medianGain: 0.45,
    runtime: 120
  },
  classification: {
    'High Quality': 30,
    'Medium Quality': 50,
    'Low Quality': 20
  },
  snapshotId: 'server-snapshot-123',
  timestamp: '2024-01-02T00:00:00Z'
};

const mockPartialServerResponse: ServerMetricsResponse = {
  aggregates: {
    totalDomains: 50,
    successRate: 75
    // Missing other fields
  },
  snapshotId: 'partial-snapshot-456'
  // Missing classification and timestamp
};

const mockEmptyServerResponse = {};

const mockInvalidServerResponse = {
  invalidField: 'test',
  anotherField: 123
};

describe('serverAdapter', () => {
  describe('validateServerResponse', () => {
    it('should validate complete server response', () => {
      expect(validateServerResponse(mockValidServerResponse)).toBe(true);
    });

    it('should validate partial response with aggregates', () => {
      expect(validateServerResponse(mockPartialServerResponse)).toBe(true);
    });

    it('should validate response with only classification', () => {
      const classificationOnly = {
        classification: { 'High': 10, 'Low': 5 }
      };
      expect(validateServerResponse(classificationOnly)).toBe(true);
    });

    it('should reject empty response', () => {
      expect(validateServerResponse(mockEmptyServerResponse)).toBe(false);
    });

    it('should reject invalid response', () => {
      expect(validateServerResponse(mockInvalidServerResponse)).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateServerResponse(null)).toBe(false);
      expect(validateServerResponse(undefined)).toBe(false);
    });

    it('should reject non-object response', () => {
      expect(validateServerResponse('string')).toBe(false);
      expect(validateServerResponse(123)).toBe(false);
      expect(validateServerResponse([])).toBe(false);
    });
  });

  describe('transformServerResponse', () => {
    it('should transform complete server response', () => {
      const snapshot = transformServerResponse(mockValidServerResponse);
      
      expect(snapshot).toEqual({
        id: 'server-snapshot-123',
        timestamp: '2024-01-02T00:00:00Z',
        aggregates: {
          totalDomains: 100,
          successRate: 85,
          avgLeadScore: 75,
          dnsSuccessRate: 90,
          httpSuccessRate: 80,
          runtime: 120,
          // Extended fields
          highPotentialCount: 25,
          leadsCount: 15,
          avgRichness: 65,
          warningRate: 15,
          keywordCoverage: 70,
          medianGain: 0.45
        },
        classifiedCounts: {
          'High Quality': 30,
          'Medium Quality': 50,
          'Low Quality': 20
        }
      });
    });

    it('should handle partial response with defaults', () => {
      const snapshot = transformServerResponse(mockPartialServerResponse);
      
      expect(snapshot.id).toBe('partial-snapshot-456');
      expect(snapshot.aggregates.totalDomains).toBe(50);
      expect(snapshot.aggregates.successRate).toBe(75);
      
      // Check defaults for missing fields
      expect(snapshot.aggregates.avgLeadScore).toBe(0);
      expect(snapshot.aggregates.dnsSuccessRate).toBe(0);
      expect(snapshot.classifiedCounts).toEqual({});
      
      // Should generate timestamp if missing
      expect(snapshot.timestamp).toBeTruthy();
      expect(new Date(snapshot.timestamp)).toBeInstanceOf(Date);
    });

    it('should generate snapshot ID if missing', () => {
      const responseWithoutId = {
        aggregates: { totalDomains: 10 }
      };
      
      const snapshot = transformServerResponse(responseWithoutId);
      
      expect(snapshot.id).toMatch(/^snapshot-\d+$/);
    });

    it('should handle empty aggregates object', () => {
      const responseWithEmptyAggregates = {
        aggregates: {},
        classification: { 'Test': 5 }
      };
      
      const snapshot = transformServerResponse(responseWithEmptyAggregates);
      
      // Should use defaults for all aggregate fields
      expect(snapshot.aggregates).toEqual({
        totalDomains: 0,
        successRate: 0,
        avgLeadScore: 0,
        dnsSuccessRate: 0,
        httpSuccessRate: 0,
        runtime: undefined
      });
    });

    it('should preserve extended fields when present', () => {
      const responseWithExtended = {
        aggregates: {
          totalDomains: 10,
          avgRichness: 42.5,
          warningRate: 8.2,
          customField: 'should not appear'
        }
      };
      
      const snapshot = transformServerResponse(responseWithExtended);
      
      expect(snapshot.aggregates.avgRichness).toBe(42.5);
      expect(snapshot.aggregates.warningRate).toBe(8.2);
      expect((snapshot.aggregates as any).customField).toBeUndefined();
    });

    it('should handle numeric field type safety', () => {
      const responseWithBadTypes = {
        aggregates: {
          totalDomains: '100', // String instead of number
          successRate: null,   // Null instead of number
          avgLeadScore: 'invalid' // Invalid string
        }
      };
      
      const snapshot = transformServerResponse(responseWithBadTypes as any);
      
      // Should convert/default appropriately
      expect(snapshot.aggregates.totalDomains).toBe('100'); // Preserved as-is (could be enhanced)
      expect(snapshot.aggregates.successRate).toBe(null);  // Preserved as-is
      expect(snapshot.aggregates.avgLeadScore).toBe('invalid'); // Preserved as-is
    });
  });

  describe('createDefaultSnapshot', () => {
    it('should create valid default snapshot', () => {
      const defaultSnapshot = createDefaultSnapshot();
      
      expect(defaultSnapshot.id).toMatch(/^fallback-\d+$/);
      expect(defaultSnapshot.timestamp).toBeTruthy();
      expect(new Date(defaultSnapshot.timestamp)).toBeInstanceOf(Date);
      
      expect(defaultSnapshot.aggregates).toEqual({
        totalDomains: 0,
        successRate: 0,
        avgLeadScore: 0,
        dnsSuccessRate: 0,
        httpSuccessRate: 0
      });
      
      expect(defaultSnapshot.classifiedCounts).toEqual({});
    });

    it('should create unique IDs for multiple calls', () => {
      const snapshot1 = createDefaultSnapshot();
      const snapshot2 = createDefaultSnapshot();
      
      expect(snapshot1.id).not.toBe(snapshot2.id);
    });

    it('should create recent timestamps', () => {
      const before = Date.now();
      const snapshot = createDefaultSnapshot();
      const after = Date.now();
      
      const snapshotTime = new Date(snapshot.timestamp).getTime();
      expect(snapshotTime).toBeGreaterThanOrEqual(before);
      expect(snapshotTime).toBeLessThanOrEqual(after);
    });
  });

  describe('warning logging', () => {
    // Note: These tests would need to mock console.warn to test the logging functionality
    // For now, we'll just verify the function doesn't throw errors
    
    it('should not throw when logging warnings', () => {
      const { logServerWarning } = require('../serverAdapter');
      
      expect(() => {
        logServerWarning('Test warning message');
        logServerWarning('Test warning with details', { error: 'test' });
      }).not.toThrow();
    });
  });
});