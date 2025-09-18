// Simple test file to check Phase 9 services compilation
import { forecastBlendService } from './forecastBlendService';
import { rootCauseAnalyticsService } from './rootCauseAnalyticsService';
import { offlineResilienceService } from './offlineResilienceService';
import { healthFabricService } from './healthFabricService';

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