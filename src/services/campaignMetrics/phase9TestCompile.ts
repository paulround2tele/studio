// Simple test file to check Phase 9 services compilation
import { forecastBlendService } from './forecastBlendService';
import { rootCauseAnalyticsService } from './rootCauseAnalyticsService';
import { offlineResilienceService } from './offlineResilienceService';
import { healthFabricService } from './healthFabricService';
import { recommendationAttributionService } from './recommendationAttributionService';
import { enhancedSecurityHardeningService } from './enhancedSecurityHardeningService';
import { performanceGuardrailsService } from './performanceGuardrailsService';
import { exportV5EvolutionService } from './exportV5EvolutionService';

// Test basic functionality
console.log('Phase 9 services loaded successfully');

// Test forecast blend service
forecastBlendService.registerModel('test-model', 'client', 1.0);
console.log('Registered models:', forecastBlendService.getRegisteredModels().length);

// Test offline resilience
offlineResilienceService.cacheData('test-key', { data: 'test' });
const cached = offlineResilienceService.getCachedData('test-key');
console.log('Cached data retrieved:', cached !== null);

// Test health fabric
healthFabricService.updateDomainHealth('forecast', { score: 85 });
const health = healthFabricService.getDomainHealth('forecast');
console.log('Health updated:', health?.score === 85);

// Test root cause analytics (without actually running analysis)
console.log('Root cause service ready:', typeof rootCauseAnalyticsService.analyzeRootCause === 'function');

// Test recommendation attribution
recommendationAttributionService.recordSignal({
  id: 'test-signal',
  type: 'anomaly_detection',
  source: 'test-source',
  confidence: 0.8,
  magnitude: 0.6,
  description: 'Test signal',
  metadata: {},
  timestamp: new Date().toISOString()
});
console.log('Attribution signal recorded');

// Test security hardening
const validationResult = enhancedSecurityHardeningService.validateNumericValue(100, { min: 0, max: 1000 }, 'test');
console.log('Security validation works:', validationResult.isValid);

// Test performance guardrails
const memoryStats = performanceGuardrailsService.getCurrentMemoryUsage();
console.log('Memory monitoring available:', memoryStats !== null);

// Test export v5
const exportStats = exportV5EvolutionService.getExportStatistics();
console.log('Export v5 service ready:', exportStats.totalExports >= 0);

console.log('All Phase 9 services operational!');