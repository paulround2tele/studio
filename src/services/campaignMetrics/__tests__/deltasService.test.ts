/**
 * Delta Service Tests (Phase 3)
 */

import { 
  calculateDeltas, 
  filterSignificantDeltas, 
  getDeltaColor, 
  formatDeltaValue,
  createBaselineSnapshot 
} from '../deltasService';
import { AggregateSnapshot, DeltaMetrics, ExtendedAggregateMetrics } from '@/types/campaignMetrics';

// Mock snapshots for testing
const mockCurrentSnapshot: AggregateSnapshot = {
  id: 'current-123',
  timestamp: '2024-01-02T00:00:00Z',
  aggregates: {
    totalDomains: 100,
    successRate: 85,
    avgLeadScore: 75,
    dnsSuccessRate: 90,
    httpSuccessRate: 80,
    warningRate: 15,
    avgRichness: 65,
    highPotentialCount: 25
  } as ExtendedAggregateMetrics,
  classifiedCounts: {
    'High Quality': 30,
    'Medium Quality': 50,
    'Low Quality': 20
  }
};

const mockPreviousSnapshot: AggregateSnapshot = {
  id: 'previous-122',
  timestamp: '2024-01-01T00:00:00Z',
  aggregates: {
    totalDomains: 90,
    successRate: 80,
    avgLeadScore: 70,
    dnsSuccessRate: 85,
    httpSuccessRate: 85,
    warningRate: 20,
    avgRichness: 60,
    highPotentialCount: 20
  } as ExtendedAggregateMetrics,
  classifiedCounts: {
    'High Quality': 25,
    'Medium Quality': 45,
    'Low Quality': 20
  }
};

describe('deltasService', () => {
  describe('calculateDeltas', () => {
    it('should calculate deltas correctly', () => {
      const deltas = calculateDeltas(mockCurrentSnapshot, mockPreviousSnapshot);
      
      expect(deltas).toHaveLength(8); // All tracked metrics
      
      // Check totalDomains delta
      const totalDomainsDelta = deltas.find(d => d.key === 'totalDomains');
      expect(totalDomainsDelta).toEqual({
        key: 'totalDomains',
        absolute: 10,
        percent: expect.closeTo(11.11, 1),
        direction: 'up'
      });
      
      // Check successRate delta  
      const successRateDelta = deltas.find(d => d.key === 'successRate');
      expect(successRateDelta).toEqual({
        key: 'successRate',
        absolute: 5,
        percent: 6.25,
        direction: 'up'
      });
    });

    it('should handle inverted metrics correctly', () => {
      const deltas = calculateDeltas(mockCurrentSnapshot, mockPreviousSnapshot);
      
      // Warning rate should use inverted logic (lower is better)
      const warningRateDelta = deltas.find(d => d.key === 'warningRate');
      expect(warningRateDelta?.direction).toBe('up'); // Inverted: -5 absolute but positive direction
      expect(warningRateDelta?.absolute).toBe(-5);
    });

    it('should handle zero denominators safely', () => {
      const zeroSnapshot = {
        ...mockPreviousSnapshot,
        aggregates: { ...mockPreviousSnapshot.aggregates, successRate: 0 }
      };
      
      const deltas = calculateDeltas(mockCurrentSnapshot, zeroSnapshot);
      const successRateDelta = deltas.find(d => d.key === 'successRate');
      
      expect(successRateDelta?.percent).toBe(100); // Clamped max
    });

    it('should identify flat changes correctly', () => {
      const sameSnapshot = { ...mockCurrentSnapshot };
      const deltas = calculateDeltas(mockCurrentSnapshot, sameSnapshot);
      
      deltas.forEach(delta => {
        expect(delta.direction).toBe('flat');
        expect(delta.absolute).toBe(0);
        expect(delta.percent).toBe(0);
      });
    });
  });

  describe('filterSignificantDeltas', () => {
    it('should filter deltas by absolute threshold', () => {
      const deltas: DeltaMetrics[] = [
        { key: 'metric1', absolute: 0.05, percent: 1, direction: 'up' },
        { key: 'metric2', absolute: 0.15, percent: 1, direction: 'up' },
        { key: 'metric3', absolute: 0.5, percent: 1, direction: 'down' }
      ];
      
      const filtered = filterSignificantDeltas(deltas, 0.1, 0);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.key)).toEqual(['metric2', 'metric3']);
    });

    it('should filter deltas by percentage threshold', () => {
      const deltas: DeltaMetrics[] = [
        { key: 'metric1', absolute: 0.01, percent: 0.5, direction: 'up' },
        { key: 'metric2', absolute: 0.01, percent: 2, direction: 'up' },
        { key: 'metric3', absolute: 0.01, percent: 5, direction: 'down' }
      ];
      
      const filtered = filterSignificantDeltas(deltas, 0, 1.5);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.key)).toEqual(['metric2', 'metric3']);
    });
  });

  describe('getDeltaColor', () => {
    it('should return correct colors for directions', () => {
      expect(getDeltaColor({ key: 'test', absolute: 1, percent: 1, direction: 'up' }))
        .toBe('#10b981'); // green
      
      expect(getDeltaColor({ key: 'test', absolute: -1, percent: -1, direction: 'down' }))
        .toBe('#ef4444'); // red
      
      expect(getDeltaColor({ key: 'test', absolute: 0, percent: 0, direction: 'flat' }))
        .toBe('#6b7280'); // gray
    });
  });

  describe('formatDeltaValue', () => {
    it('should format rate metrics as absolute values', () => {
      const delta: DeltaMetrics = {
        key: 'successRate',
        absolute: 5,
        percent: 6.25,
        direction: 'up'
      };
      
      expect(formatDeltaValue(delta)).toBe('+5.0%');
    });

    it('should format count metrics as integers', () => {
      const delta: DeltaMetrics = {
        key: 'totalDomains',
        absolute: 10.7,
        percent: 11.11,
        direction: 'up'
      };
      
      expect(formatDeltaValue(delta)).toBe('+11');
    });

    it('should format score metrics with decimals', () => {
      const delta: DeltaMetrics = {
        key: 'avgLeadScore',
        absolute: 5.25,
        percent: 7.5,
        direction: 'up'
      };
      
      expect(formatDeltaValue(delta)).toBe('+5.25');
    });

    it('should handle negative values', () => {
      const delta: DeltaMetrics = {
        key: 'successRate',
        absolute: -3,
        percent: -3.75,
        direction: 'down'
      };
      
      expect(formatDeltaValue(delta)).toBe('-3.0%');
    });
  });

  describe('createBaselineSnapshot', () => {
    it('should create a valid baseline snapshot', () => {
      const baseline = createBaselineSnapshot(mockCurrentSnapshot);
      
      expect(baseline.id).toContain('baseline-');
      expect(new Date(baseline.timestamp).getTime()).toBeLessThan(new Date(mockCurrentSnapshot.timestamp).getTime());
      expect(baseline.classifiedCounts).toEqual(mockCurrentSnapshot.classifiedCounts);
      
      // Values should be reduced but positive
      expect(baseline.aggregates.totalDomains).toBeLessThan(mockCurrentSnapshot.aggregates.totalDomains);
      expect(baseline.aggregates.totalDomains).toBeGreaterThan(0);
    });

    it('should handle zero values safely', () => {
      const zeroSnapshot = {
        ...mockCurrentSnapshot,
        aggregates: { ...mockCurrentSnapshot.aggregates, successRate: 0 }
      };
      
      const baseline = createBaselineSnapshot(zeroSnapshot);
      expect(baseline.aggregates.successRate).toBe(0); // Should remain 0
    });
  });
});