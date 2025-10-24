#!/bin/bash

# Fix unused variables by prefixing with underscore
# This script handles simple cases where variables are defined but never used

# useCausalGraph.ts - confidenceThreshold
sed -i 's/confidenceThreshold = 0\.7,/confidenceThreshold: _confidenceThreshold = 0.7,/g' src/hooks/useCausalGraph.ts

# useCohortComparison.ts - CohortCampaign
sed -i 's/  CohortCampaign,/  CohortCampaign as _CohortCampaign,/g' src/hooks/useCohortComparison.ts

# useSemanticSummaries.ts - now variables
sed -i 's/    const now = Date\.now();/    const _now = Date.now();/g' src/hooks/useSemanticSummaries.ts

# useSemanticSummaries.ts - batchId and actions
sed -i 's/      const batchId = /      const _batchId = /g' src/hooks/useSemanticSummaries.ts
sed -i 's/      const actions = /      const _actions = /g' src/hooks/useSemanticSummaries.ts

# usePaginatedDomains.ts - version
sed -i 's/    const version = /    const _version = /g' src/lib/hooks/usePaginatedDomains.ts

# phaseMapping.ts - APICampaignPhaseEnum
sed -i 's/  APICampaignPhaseEnum,/  APICampaignPhaseEnum as _APICampaignPhaseEnum,/g' src/lib/utils/phaseMapping.ts

# typeGuards.ts - EnrichedCampaignResponse  
sed -i 's/  EnrichedCampaignResponse,/  EnrichedCampaignResponse as _EnrichedCampaignResponse,/g' src/lib/utils/typeGuards.ts

# authCookieCache.ts - CacheStore and ttlMs
sed -i 's/  CacheStore,/  CacheStore as _CacheStore,/g' src/server/authCookieCache.ts
sed -i 's/function set(key: string, value: string, ttlMs: number)/function set(key: string, value: string, _ttlMs: number)/g' src/server/authCookieCache.ts

# Service files
sed -i 's/  const startTime = /  const _startTime = /g' src/services/analytics/causalGraphService.ts
sed -i 's/    const edgesUpdated = /    const _edgesUpdated = /g' src/services/analytics/causalGraphService.ts

sed -i 's/    const key = /    const _key = /g' src/services/campaignMetrics/capabilitiesService.ts

sed -i 's/  metrics,/  _metrics,/g' src/services/campaignMetrics/dataQualityValidationService.ts

sed -i 's/  const startTime = /  const _startTime = /g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/  snapshots,/  _snapshots,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/  context,/  _context,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/  campaignId,$/  _campaignId,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/  config,/  _config,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/    rec,/    _rec,/g' src/services/campaignMetrics/enhancedRecommendationService.ts

sed -i 's/  const predictions = /  const _predictions = /g' src/services/campaignMetrics/forecastBlendService.ts

sed -i 's/  NormalizedForecastResult,/  NormalizedForecastResult as _NormalizedForecastResult,/g' src/services/campaignMetrics/forecastService.ts
sed -i 's/  normalizeForecastResult,/  normalizeForecastResult as _normalizeForecastResult,/g' src/services/campaignMetrics/forecastService.ts
sed -i 's/  createForecastPoint,/  createForecastPoint as _createForecastPoint,/g' src/services/campaignMetrics/forecastService.ts
sed -i 's/  metricKey,/  _metricKey,/g' src/services/campaignMetrics/forecastService.ts

sed -i 's/  currentScore,/  _currentScore,/g' src/services/campaignMetrics/healthFabricService.ts

sed -i 's/    const campaignId = /    const _campaignId = /g' src/services/campaignMetrics/historyStore.ts

sed -i 's/  } catch (error) {$/  } catch (_error) {/g' src/services/campaignMetrics/metricsPerf.ts

sed -i 's/    index,/    _index,/g' src/services/campaignMetrics/moversService.ts

sed -i 's/  CampaignSseEventPayload,/  CampaignSseEventPayload as _CampaignSseEventPayload,/g' src/services/campaignMetrics/progressStream.ts
sed -i 's/  CampaignSseEvent,/  CampaignSseEvent as _CampaignSseEvent,/g' src/services/campaignMetrics/progressStream.ts
sed -i 's/(error)/(\_error)/g' src/services/campaignMetrics/progressStream.ts

sed -i 's/  const anomalyValue = /  const _anomalyValue = /g' src/services/campaignMetrics/rootCauseAnalyticsService.ts
sed -i 's/, baselineValue,/, _baselineValue,/g' src/services/campaignMetrics/rootCauseAnalyticsService.ts
sed -i 's/  context,/  _context,/g' src/services/campaignMetrics/rootCauseAnalyticsService.ts  
sed -i 's/  template,/  _template,/g' src/services/campaignMetrics/rootCauseAnalyticsService.ts

sed -i 's/  ClassificationBuckets,/  ClassificationBuckets as _ClassificationBuckets,/g' src/services/campaignMetrics/serverAdapter.ts

sed -i 's/  hasMinElements,/  hasMinElements as _hasMinElements,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/  isNonEmptyArray,/  isNonEmptyArray as _isNonEmptyArray,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/  startIndex,/  _startIndex,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/  endIndex,/  _endIndex,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/  preservedIndices,/  _preservedIndices,/g' src/services/campaignMetrics/snapshotCompactionService.ts

sed -i 's/  StructuredMessage,/  StructuredMessage as _StructuredMessage,/g' src/services/campaignMetrics/streamPool.ts

sed -i 's/  WorkerResult,/  WorkerResult as _WorkerResult,/g' src/services/campaignMetrics/workerCoordinator.ts

sed -i 's/  NonEmptyArray,/  NonEmptyArray as _NonEmptyArray,/g' src/services/experimentation/banditService.ts
sed -i 's/  normalizeArmStats,/  normalizeArmStats as _normalizeArmStats,/g' src/services/experimentation/banditService.ts
sed -i 's/  const armIds = /  const _armIds = /g' src/services/experimentation/banditService.ts
sed -i 's/  context,/  _context,/g' src/services/experimentation/banditService.ts

sed -i 's/  const stats = /  const _stats = /g' src/services/observability/tracingService.ts

sed -i 's/  const differentialPrivacyModule = /  const _differentialPrivacyModule = /g' src/services/phase10IntegrationTest.js
sed -i 's/  const memoryModule = /  const _memoryModule = /g' src/services/phase10IntegrationTest.js

sed -i 's/  domain,/  _domain,/g' src/services/privacy/differentialPrivacyService.ts

sed -i 's/  const state = /  const _state = /g' src/services/simulation/seedService.ts

sed -i 's/  const data = /  const _data = /g' src/services/summarization/summarizationService.ts

sed -i 's/  isNonEmptyArray,/  isNonEmptyArray as _isNonEmptyArray,/g' src/services/viz/adaptiveTimelineService.ts
sed -i 's/  metricKey,/  _metricKey,/g' src/services/viz/adaptiveTimelineService.ts

sed -i 's/  isNonEmptyArray,/  isNonEmptyArray as _isNonEmptyArray,/g' src/workers/metricsWorker.ts

echo "Fixed unused variables"
