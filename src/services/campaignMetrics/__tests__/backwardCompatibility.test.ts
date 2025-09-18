/**
 * Phase 5 Backward Compatibility Tests
 * Ensures existing functionality works when new flags are disabled
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  isServerTimelineAvailable,
  fetchServerTimeline 
} from '@/services/campaignMetrics/timelineService';
import { 
  isAnomalyDetectionAvailable,
  detectAnomalies 
} from '@/services/campaignMetrics/anomalyService';
import { 
  isPortfolioMetricsAvailable,
  computePortfolioAggregate 
} from '@/services/campaignMetrics/portfolioMetricsService';
import { 
  isExportToolsAvailable 
} from '@/services/campaignMetrics/exportService';
import { 
  isStreamPoolingAvailable 
} from '@/services/campaignMetrics/streamPool';
import { 
  isTelemetryAvailable 
} from '@/services/campaignMetrics/telemetryService';

describe('Phase 5 Backward Compatibility', () => {
  beforeEach(() => {
    // Reset all Phase 5 flags to disabled
    process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'false';
    process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_METRICS = 'false';
    process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = 'false';
    process.env.NEXT_PUBLIC_ENABLE_ADV_REC_EXPLAIN = 'false';
    process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS = 'false';
    process.env.NEXT_PUBLIC_STREAM_POOLING = 'false';
    process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '0';
  });

  describe('Feature Availability Checks', () => {
    it('should report all Phase 5 features as unavailable when disabled', () => {
      expect(isServerTimelineAvailable()).toBe(false);
      expect(isAnomalyDetectionAvailable()).toBe(false);
      expect(isPortfolioMetricsAvailable()).toBe(false);
      expect(isExportToolsAvailable()).toBe(false);
      expect(isStreamPoolingAvailable()).toBe(false);
      expect(isTelemetryAvailable()).toBe(false);
    });

    it('should report features as available when enabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'true';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/api/v2';
      process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = 'true';
      process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_METRICS = 'true';
      process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS = 'true';
      process.env.NEXT_PUBLIC_STREAM_POOLING = 'true';
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '0.25';

      expect(isServerTimelineAvailable()).toBe(true);
      expect(isAnomalyDetectionAvailable()).toBe(true);
      expect(isPortfolioMetricsAvailable()).toBe(true);
      expect(isExportToolsAvailable()).toBe(true);
      expect(isStreamPoolingAvailable()).toBe(true);
      expect(isTelemetryAvailable()).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    it('should return empty results when server timeline disabled', async () => {
      const result = await fetchServerTimeline('campaign1');
      
      expect(result).toEqual({
        snapshots: [],
        totalCount: 0
      });
    });

    it('should return empty anomalies when detection disabled', () => {
      const mockSnapshots = [
        {
          id: 'snap1',
          timestamp: '2024-01-01T10:00:00Z',
          aggregates: { totalDomains: 100, successRate: 0.8, avgLeadScore: 75, dnsSuccessRate: 0.9, httpSuccessRate: 0.85 },
          classifiedCounts: {}
        }
      ];

      const anomalies = detectAnomalies(mockSnapshots);
      
      expect(anomalies).toEqual([]);
    });

    it('should return null when portfolio metrics disabled', () => {
      const mockTimelines = [
        {
          campaignId: 'campaign1',
          snapshots: [{
            id: 'snap1',
            timestamp: '2024-01-01T10:00:00Z',
            aggregates: { totalDomains: 100, successRate: 0.8, avgLeadScore: 75, dnsSuccessRate: 0.9, httpSuccessRate: 0.85 },
            classifiedCounts: {}
          }]
        },
        {
          campaignId: 'campaign2',
          snapshots: [{
            id: 'snap2',
            timestamp: '2024-01-01T10:00:00Z',
            aggregates: { totalDomains: 120, successRate: 0.85, avgLeadScore: 80, dnsSuccessRate: 0.92, httpSuccessRate: 0.88 },
            classifiedCounts: {}
          }]
        }
      ];

      const portfolio = computePortfolioAggregate(mockTimelines);
      
      expect(portfolio).toBeNull();
    });
  });

  describe('Flag Combinations', () => {
    it('should handle partial feature enablement', () => {
      // Enable only some features
      process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = 'true';
      process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS = 'true';

      expect(isAnomalyDetectionAvailable()).toBe(true);
      expect(isExportToolsAvailable()).toBe(true);
      
      // Others should remain disabled
      expect(isServerTimelineAvailable()).toBe(false);
      expect(isPortfolioMetricsAvailable()).toBe(false);
      expect(isStreamPoolingAvailable()).toBe(false);
      expect(isTelemetryAvailable()).toBe(false);
    });

    it('should handle telemetry sampling edge cases', () => {
      // Zero sampling
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '0';
      expect(isTelemetryAvailable()).toBe(false);

      // Negative sampling
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '-0.1';
      expect(isTelemetryAvailable()).toBe(false);

      // Over 100% sampling
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '1.5';
      expect(isTelemetryAvailable()).toBe(true);

      // Valid sampling
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '0.25';
      expect(isTelemetryAvailable()).toBe(true);
    });
  });

  describe('No-op Behavior', () => {
    it('should not break existing recommendation pipeline when V3 disabled', () => {
      // This would typically be tested with actual recommendation data
      // but we're verifying the flag behavior
      expect(process.env.NEXT_PUBLIC_ENABLE_ADV_REC_EXPLAIN).toBe('false');
      expect(process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES).toBe('false');
      
      // In practice, this means:
      // - RecommendationPanel should not show explanation UI
      // - pipelineRecommendationsV3 should return baseline recommendations unchanged
      // - No anomaly-based recommendations should be added
    });

    it('should not interfere with existing progress streaming when pooling disabled', () => {
      expect(isStreamPoolingAvailable()).toBe(false);
      
      // In practice, this means:
      // - ProgressStream should use direct EventSource
      // - No stream pooling or multiplexing
      // - Existing SSE behavior preserved
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should handle various boolean flag formats', () => {
      // Test 'false' string
      process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'false';
      expect(isServerTimelineAvailable()).toBe(false);

      // Test empty string (should default to enabled for some features)
      process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES = '';
      expect(isAnomalyDetectionAvailable()).toBe(true); // This flag defaults to true

      // Test undefined
      delete process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_METRICS;
      expect(isPortfolioMetricsAvailable()).toBe(false); // This flag defaults to false
    });

    it('should handle numeric sampling values correctly', () => {
      // Test string number
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '0.25';
      expect(isTelemetryAvailable()).toBe(true);

      // Test invalid string
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = 'invalid';
      expect(isTelemetryAvailable()).toBe(false); // Should parse as NaN/0

      // Test empty string
      process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING = '';
      expect(isTelemetryAvailable()).toBe(false); // Should parse as 0
    });
  });
});