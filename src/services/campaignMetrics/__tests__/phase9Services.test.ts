/**
 * Phase 9 Services Test Suite
 * Basic functionality tests for the new Phase 9 services
 */

import { forecastBlendService } from '../forecastBlendService';
import { rootCauseAnalyticsService } from '../rootCauseAnalyticsService';
import { offlineResilienceService } from '../offlineResilienceService';
import { healthFabricService } from '../healthFabricService';
import { capabilitiesService } from '../capabilitiesService';

describe('Phase 9 Services', () => {
  beforeEach(() => {
    // Clean up between tests
    forecastBlendService.clearPerformanceHistory();
    rootCauseAnalyticsService.clearAnalysisHistory();
    offlineResilienceService.clearOfflineData();
  });

  describe('ForecastBlendService', () => {
    it('should register models correctly', () => {
      forecastBlendService.registerModel('test-model', 'client', 1.0);
      const models = forecastBlendService.getRegisteredModels();
      
      expect(models).toHaveLength(1);
      expect(models[0]?.modelId).toBe('test-model');
      expect(models[0]?.kind).toBe('client');
    });

    it('should update performance stats', () => {
      forecastBlendService.registerModel('test-model', 'client', 1.0);
      forecastBlendService.updatePerformance('test-metric', 'test-model', 100, 95);
      
      const stats = forecastBlendService.getPerformanceStats('test-metric', 'test-model');
      expect(stats).toBeDefined();
      expect(stats?.sampleCount).toBe(1);
      expect(stats?.meanAbsoluteError).toBe(5);
    });

    it('should compute blend with fallback to arbitration', () => {
      forecastBlendService.registerModel('test-model', 'client', 1.0);
      
      const modelForecasts = [{
        modelId: 'test-model',
        points: [
          { timestamp: '2024-01-01T00:00:00Z', value: 100, lower: 95, upper: 105 }
        ]
      }];

      const blend = forecastBlendService.computeBlend('test-metric', 7, modelForecasts);
      
      expect(blend.blendMethod).toBe('arbitration_fallback'); // Should fallback due to insufficient Bayesian data
      expect(blend.blendedPoints).toHaveLength(1);
      expect(blend.blendedPoints[0]?.value).toBe(100);
    });
  });

  describe('HealthFabricService', () => {
    it('should update domain health', () => {
      healthFabricService.updateDomainHealth('forecast', {
        score: 85,
        components: [
          { name: 'server', score: 90, status: 'healthy' },
          { name: 'client', score: 80, status: 'healthy' }
        ]
      });

      const health = healthFabricService.getDomainHealth('forecast');
      expect(health).toBeDefined();
      expect(health?.score).toBe(85);
      expect(health?.status).toBe('healthy');
      expect(health?.components).toHaveLength(2);
    });

    it('should calculate status from score', () => {
      healthFabricService.updateDomainHealth('test-domain', { score: 95 });
      let health = healthFabricService.getDomainHealth('test-domain');
      expect(health?.status).toBe('healthy');

      healthFabricService.updateDomainHealth('test-domain', { score: 70 });
      health = healthFabricService.getDomainHealth('test-domain');
      expect(health?.status).toBe('warning');

      healthFabricService.updateDomainHealth('test-domain', { score: 30 });
      health = healthFabricService.getDomainHealth('test-domain');
      expect(health?.status).toBe('critical');
    });

    it('should manage propagation rules', () => {
      const rule = {
        id: 'test-rule',
        sourceHealthType: 'data_quality',
        targetHealthType: 'forecast',
        propagationType: 'weighted' as const,
        weight: 0.8,
        dampingFactor: 0.9,
        enabled: true,
      };

      healthFabricService.addPropagationRule(rule);
      const fabric = healthFabricService.getHealthFabric();
      
      const addedRule = fabric.propagationRules.find(r => r.id === 'test-rule');
      expect(addedRule).toBeDefined();
      expect(addedRule?.weight).toBe(0.8);
    });
  });

  describe('OfflineResilienceService', () => {
    it('should cache and retrieve data', () => {
      const testData = { message: 'test data', value: 42 };
      
      offlineResilienceService.cacheData('test-key', testData);
      const retrieved = offlineResilienceService.getCachedData('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should handle cache expiration', (done) => {
      const testData = { message: 'test data' };
      
      // Cache with 100ms TTL
      offlineResilienceService.cacheData('test-key', testData, 100);
      
      // Should be available immediately
      expect(offlineResilienceService.getCachedData('test-key')).toEqual(testData);
      
      // Should expire after 100ms
      setTimeout(() => {
        expect(offlineResilienceService.getCachedData('test-key')).toBeNull();
        done();
      }, 150);
    });

    it('should queue actions', () => {
      const actionId = offlineResilienceService.queueAction({
        type: 'metric_update',
        payload: { metric: 'test', value: 100 },
        priority: 'medium',
        maxRetries: 3,
        isIdempotent: true,
      });

      expect(actionId).toMatch(/^action_/);
      
      const status = offlineResilienceService.getOfflineStatus();
      expect(status.pendingActions).toBe(1);
    });

    it('should record governance events', () => {
      const eventId = offlineResilienceService.recordGovernanceEvent({
        eventType: 'approval',
        resourceType: 'campaign',
        resourceId: 'test-campaign',
        userId: 'test-user',
        timestamp: new Date().toISOString(),
        payload: { action: 'approve' },
      });

      expect(eventId).toMatch(/^event_/);
      
      const status = offlineResilienceService.getOfflineStatus();
      expect(status.pendingActions).toBeGreaterThan(0); // Should queue governance event
    });
  });

  describe('RootCauseAnalyticsService', () => {
    it('should analyze root cause', async () => {
      const context = {
        anomalyId: 'test-anomaly',
        metricKey: 'avgLeadScore',
        campaignId: 'test-campaign',
        detectedAt: new Date().toISOString(),
        severity: 'high' as const,
        anomalyValue: 50,
        baselineValue: 80,
        deviation: -30,
        affectedTimeRange: {
          start: new Date(Date.now() - 60000).toISOString(),
          end: new Date().toISOString(),
        },
        snapshots: [
          {
            id: 'test-snapshot',
            timestamp: new Date().toISOString(),
            aggregates: {
              totalDomains: 100,
              successRate: 0.95,
              avgLeadScore: 50,
              dnsSuccessRate: 0.98,
              httpSuccessRate: 0.92,
            },
            classifiedCounts: { high: 10, medium: 30, low: 60 },
          }
        ],
      };

      const causalChain = await rootCauseAnalyticsService.analyzeRootCause(context);
      
      expect(causalChain.anomalyId).toBe('test-anomaly');
      expect(causalChain.factors).toBeDefined();
      expect(causalChain.interventions).toBeDefined();
      expect(causalChain.confidence).toBeGreaterThan(0);
    });

    it('should store and retrieve causal chains', async () => {
      const context = {
        anomalyId: 'test-anomaly-2',
        metricKey: 'avgLeadScore',
        campaignId: 'test-campaign',
        detectedAt: new Date().toISOString(),
        severity: 'medium' as const,
        anomalyValue: 70,
        baselineValue: 85,
        deviation: -15,
        affectedTimeRange: {
          start: new Date(Date.now() - 60000).toISOString(),
          end: new Date().toISOString(),
        },
        snapshots: [],
      };

      await rootCauseAnalyticsService.analyzeRootCause(context);
      
      const retrievedChain = rootCauseAnalyticsService.getCausalChain('test-anomaly-2');
      expect(retrievedChain).toBeDefined();
      expect(retrievedChain?.anomalyId).toBe('test-anomaly-2');
    });
  });

  describe('CapabilitiesService Extensions', () => {
    it('should handle live capability updates', () => {
      let updateReceived = false;
      
      const unsubscribe = capabilitiesService.subscribeTo((update) => {
        updateReceived = true;
        expect(update.updateId).toBeDefined();
        expect(update.capabilities).toBeDefined();
      });

      // This test just verifies the subscription mechanism
      // In a real environment, updates would come from SSE
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should support rollback functionality', () => {
      // Test that rollback doesn't crash when no history exists
      const result = capabilitiesService.rollbackCapabilities(1);
      expect(result).toBe(false); // Should return false when no rollback history
    });
  });

  afterAll(() => {
    // Clean up any persistent state
    forecastBlendService.clearPerformanceHistory();
    rootCauseAnalyticsService.clearAnalysisHistory();
    offlineResilienceService.clearOfflineData();
    healthFabricService.destroy();
    capabilitiesService.disconnect();
  });
});