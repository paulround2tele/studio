/**
 * Anomaly Service Tests (Phase 5)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { detectAnomalies, getAnomalyThresholds } from '@/services/campaignMetrics/anomalyService';
import { AggregateSnapshot, ExtendedAggregateMetrics } from '@/types/campaignMetrics';

// Mock environment
process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = 'true';

describe('AnomalyService', () => {
  beforeEach(() => {
    // Reset environment
    process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = 'true';
  });

  const createSnapshot = (
    id: string, 
    timestamp: string, 
    metrics: Partial<ExtendedAggregateMetrics>
  ): AggregateSnapshot => ({
    id,
    timestamp,
    aggregates: {
      totalDomains: 100,
      successRate: 0.8,
      avgLeadScore: 75,
      dnsSuccessRate: 0.9,
      httpSuccessRate: 0.85,
      ...metrics
    } as ExtendedAggregateMetrics,
    classifiedCounts: {}
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies when values exceed z-score threshold', () => {
      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { warningRate: 0.1 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { warningRate: 0.1 }),
        createSnapshot('3', '2024-01-01T12:00:00Z', { warningRate: 0.1 }),
        createSnapshot('4', '2024-01-01T13:00:00Z', { warningRate: 0.1 }),
        createSnapshot('5', '2024-01-01T14:00:00Z', { warningRate: 0.1 }),
        createSnapshot('6', '2024-01-01T15:00:00Z', { warningRate: 0.5 }) // Anomaly
      ];

      const anomalies = detectAnomalies(snapshots);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('warningRate');
      expect(Math.abs(anomalies[0].zScore)).toBeGreaterThan(2);
      // Client-side severity now reserves "critical" for very high (>3σ) deviations
      expect(anomalies[0].severity).toBe('warning');
    });

    it('should return empty array when insufficient snapshots', () => {
      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { warningRate: 0.1 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { warningRate: 0.5 })
      ];

      const anomalies = detectAnomalies(snapshots);

      expect(anomalies).toHaveLength(0);
    });

    it('should return empty array when feature disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = 'false';

      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { warningRate: 0.1 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { warningRate: 0.1 }),
        createSnapshot('3', '2024-01-01T12:00:00Z', { warningRate: 0.1 }),
        createSnapshot('4', '2024-01-01T13:00:00Z', { warningRate: 0.1 }),
        createSnapshot('5', '2024-01-01T14:00:00Z', { warningRate: 0.1 }),
        createSnapshot('6', '2024-01-01T15:00:00Z', { warningRate: 0.5 })
      ];

      const anomalies = detectAnomalies(snapshots);

      expect(anomalies).toHaveLength(0);
    });

    it('should handle custom configuration', () => {
      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { avgRichness: 5.0 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { avgRichness: 5.0 }),
        createSnapshot('3', '2024-01-01T12:00:00Z', { avgRichness: 5.0 }),
        createSnapshot('4', '2024-01-01T13:00:00Z', { avgRichness: 5.0 }),
        createSnapshot('5', '2024-01-01T14:00:00Z', { avgRichness: 5.0 }),
        createSnapshot('6', '2024-01-01T15:00:00Z', { avgRichness: 8.0 })
      ];

      const config = {
        minSnapshots: 3, // Lower threshold
        zScoreThreshold: 1.5, // Lower sensitivity
        rollingWindowSize: 6
      };

      const anomalies = detectAnomalies(snapshots, config);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('avgRichness');
    });

    it('should not detect anomalies for stable data', () => {
      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { leadsCount: 50 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { leadsCount: 52 }),
        createSnapshot('3', '2024-01-01T12:00:00Z', { leadsCount: 48 }),
        createSnapshot('4', '2024-01-01T13:00:00Z', { leadsCount: 51 }),
        createSnapshot('5', '2024-01-01T14:00:00Z', { leadsCount: 49 }),
        createSnapshot('6', '2024-01-01T15:00:00Z', { leadsCount: 50 })
      ];

      const anomalies = detectAnomalies(snapshots);

      expect(anomalies).toHaveLength(0);
    });

    it('should detect multiple anomalies across different metrics', () => {
      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { warningRate: 0.1, leadsCount: 50 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { warningRate: 0.1, leadsCount: 50 }),
        createSnapshot('3', '2024-01-01T12:00:00Z', { warningRate: 0.1, leadsCount: 50 }),
        createSnapshot('4', '2024-01-01T13:00:00Z', { warningRate: 0.1, leadsCount: 50 }),
        createSnapshot('5', '2024-01-01T14:00:00Z', { warningRate: 0.1, leadsCount: 50 }),
        createSnapshot('6', '2024-01-01T15:00:00Z', { warningRate: 0.6, leadsCount: 150 }) // Both anomalous
      ];

      const anomalies = detectAnomalies(snapshots);

      expect(anomalies.length).toBeGreaterThanOrEqual(2);
      const metrics = anomalies.map(a => a.metric);
      expect(metrics).toContain('warningRate');
      expect(metrics).toContain('leadsCount');
    });

    it('should classify severity correctly based on z-score', () => {
      const snapshots = [
        createSnapshot('1', '2024-01-01T10:00:00Z', { keywordCoverage: 0.5 }),
        createSnapshot('2', '2024-01-01T11:00:00Z', { keywordCoverage: 0.5 }),
        createSnapshot('3', '2024-01-01T12:00:00Z', { keywordCoverage: 0.5 }),
        createSnapshot('4', '2024-01-01T13:00:00Z', { keywordCoverage: 0.5 }),
        createSnapshot('5', '2024-01-01T14:00:00Z', { keywordCoverage: 0.5 }),
        createSnapshot('6', '2024-01-01T15:00:00Z', { keywordCoverage: 0.9 }) // High deviation
      ];

      const anomalies = detectAnomalies(snapshots);

      expect(anomalies).toHaveLength(1);
      
      const anomaly = anomalies[0];
      if (Math.abs(anomaly.zScore) >= 3.0) {
        expect(anomaly.severity).toBe('critical');
      } else {
        expect(anomaly.severity).toBe('warning');
      }
    });
  });

  describe('getAnomalyThresholds', () => {
    it('should return default thresholds', () => {
      const thresholds = getAnomalyThresholds();

      expect(thresholds).toEqual({
        minSnapshots: 5,
        zScoreThreshold: 2.0,
        rollingWindowSize: 10
      });
    });

    it('should use environment variables when available', () => {
      process.env.NEXT_PUBLIC_ANOMALY_MIN_SNAPSHOTS = '3';
      process.env.NEXT_PUBLIC_ANOMALY_Z_THRESHOLD = '1.5';
      process.env.NEXT_PUBLIC_ANOMALY_WINDOW_SIZE = '8';

      const thresholds = getAnomalyThresholds();

      expect(thresholds).toEqual({
        minSnapshots: 3,
        zScoreThreshold: 1.5,
        rollingWindowSize: 8
      });

      // Cleanup
      delete process.env.NEXT_PUBLIC_ANOMALY_MIN_SNAPSHOTS;
      delete process.env.NEXT_PUBLIC_ANOMALY_Z_THRESHOLD;
      delete process.env.NEXT_PUBLIC_ANOMALY_WINDOW_SIZE;
    });
  });
});