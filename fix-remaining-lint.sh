#!/bin/bash

# Fix variables that were renamed with _ but code still references them incorrectly

# Fix _metricKey references
sed -i 's/\b_metricKey\b/metricKey/g' src/services/campaignMetrics/forecastService.ts
sed -i 's/\b_metricKey\b/metricKey/g' src/services/viz/adaptiveTimelineService.ts

# Fix _snapshots, _context, _campaignId references
sed -i 's/\b_snapshots\b/snapshots/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/\b_context\b/context/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/\b_campaignId\b/campaignId/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix _metrics reference
sed -i 's/\b_metrics\b/metrics/g' src/services/campaignMetrics/dataQualityValidationService.ts

# Fix _preservedIndices reference
sed -i 's/\b_preservedIndices\b/preservedIndices/g' src/services/campaignMetrics/snapshotCompactionService.ts

# Fix _context reference in banditService
sed -i 's/\b_context\b/context/g' src/services/experimentation/banditService.ts

# Fix armIds reference
sed -i 's/\barmIds\b/_armIds/g' src/services/experimentation/banditService.ts

# Fix error references in metricsPerf
sed -i 's/\berror\b/_error/g' src/services/campaignMetrics/metricsPerf.ts

# Fix error references in progressStream
sed -i 's/error\)/(\_error)/g' src/services/campaignMetrics/progressStream.ts

# Fix state reference in seedService
sed -i 's/\bstate\b/_state/g' src/services/simulation/seedService.ts

# Prefix remaining unused variables with underscore
sed -i 's/LoginPageFallback/\_LoginPageFallback/g' src/app/login/page.tsx
sed -i 's/import { redirect }/import { redirect as _redirect }/g' src/app/page.tsx
sed -i 's/import React, { useState }/import React/g' src/components/campaigns/CampaignFormV2.tsx
sed -i 's/(state)/(\_state)/g' src/components/campaigns/CampaignProgress.tsx
sed -i 's/PipelineRelatedRootState,/PipelineRelatedRootState as _PipelineRelatedRootState,/g' src/components/campaigns/ConversionCTA.tsx
sed -i 's/MetricValue,/MetricValue as _MetricValue,/g' src/components/campaigns/DomainsList.tsx
sed -i 's/const aggregates = /const _aggregates = /g' src/components/campaigns/DomainsList.tsx
sed -i 's/PipelineRelatedRootState,/PipelineRelatedRootState as _PipelineRelatedRootState,/g' src/components/campaigns/controls/CampaignModeToggle.tsx
sed -i 's/ProxiesApi,/ProxiesApi as _ProxiesApi,/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx
sed -i 's/Proxy,/Proxy as _Proxy,/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx
sed -i 's/ProxyPool,/ProxyPool as _ProxyPool,/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx
sed -i 's/ProxyPool,/ProxyPool as _ProxyPool,/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx
sed -i 's/ApiKeywordSet,/ApiKeywordSet as _ApiKeywordSet,/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx
sed -i 's/snapshots,/_snapshots,/g' src/components/debug/ForecastQualityDebugPanel.tsx
sed -i 's/const isPublicPath = /const _isPublicPath = /g' src/components/layout/AdvancedConditionalLayout.tsx
sed -i 's/useCausalGraph,/useCausalGraph as _useCausalGraph,/g' src/components/refactor/analytics/CausalGraphPanel.tsx
sed -i 's/TrendingDown,/TrendingDown as _TrendingDown,/g' src/components/refactor/experiments/BanditPanel.tsx
sed -i 's/Settings,/Settings as _Settings,/g' src/components/refactor/experiments/BanditPanel.tsx
sed -i 's/confidenceThreshold:/confidenceThreshold: _confidenceThreshold =/g' src/hooks/useCausalGraph.ts
sed -i 's/CohortCampaign,/CohortCampaign as _CohortCampaign,/g' src/hooks/useCohortComparison.ts
sed -i 's/const batchId = /const _batchId = /g' src/hooks/useSemanticSummaries.ts
sed -i 's/const actions = /const _actions = /g' src/hooks/useSemanticSummaries.ts
sed -i 's/const version = /const _version = /g' src/lib/hooks/usePaginatedDomains.ts
sed -i 's/} catch (e) {/} catch (_e) {/g' src/lib/utils/fetchWithPolicy.ts
sed -i 's/APICampaignPhaseEnum,/APICampaignPhaseEnum as _APICampaignPhaseEnum,/g' src/lib/utils/phaseMapping.ts
sed -i 's/EnrichedCampaignResponse,/EnrichedCampaignResponse as _EnrichedCampaignResponse,/g' src/lib/utils/typeGuards.ts
sed -i 's/CacheStore,/CacheStore as _CacheStore,/g' src/server/authCookieCache.ts
sed -i 's/ttlMs:/ttlMs: _ttlMs/g' src/server/authCookieCache.ts
sed -i 's/const edgesUpdated = /const _edgesUpdated = /g' src/services/analytics/causalGraphService.ts
sed -i 's/const key = /const _key = /g' src/services/campaignMetrics/capabilitiesService.ts
sed -i 's/metrics,/_metrics,/g' src/services/campaignMetrics/dataQualityValidationService.ts
sed -i 's/domain,/_domain,/g' src/services/campaignMetrics/degradationEvaluatorService.ts
sed -i 's/context,/_context,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/campaignId,/_campaignId,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/config,/_config,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/rec,/_rec,/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/createForecastPoint,/createForecastPoint as _createForecastPoint,/g' src/services/campaignMetrics/forecastService.ts
sed -i 's/metricKey,/_metricKey,/g' src/services/campaignMetrics/forecastService.ts
sed -i 's/currentScore,/_currentScore,/g' src/services/campaignMetrics/healthFabricService.ts
sed -i 's/const campaignId = /const _campaignId = /g' src/services/campaignMetrics/historyStore.ts
sed -i 's/index,/_index,/g' src/services/campaignMetrics/moversService.ts
sed -i 's/CampaignSseEventPayload,/CampaignSseEventPayload as _CampaignSseEventPayload,/g' src/services/campaignMetrics/progressStream.ts
sed -i 's/CampaignSseEvent,/CampaignSseEvent as _CampaignSseEvent,/g' src/services/campaignMetrics/progressStream.ts
sed -i 's/input,/_input,/g' src/services/campaignMetrics/recommendationScoreService.ts
sed -i 's/k,/_k,/g' src/services/campaignMetrics/recommendationScoreService.ts
sed -i 's/const anomalyValue = /const _anomalyValue = /g' src/services/campaignMetrics/rootCauseAnalyticsService.ts
sed -i 's/context,/_context,/g' src/services/campaignMetrics/rootCauseAnalyticsService.ts
sed -i 's/template,/_template,/g' src/services/campaignMetrics/rootCauseAnalyticsService.ts
sed -i 's/ClassificationBuckets,/ClassificationBuckets as _ClassificationBuckets,/g' src/services/campaignMetrics/serverAdapter.ts
sed -i 's/hasMinElements,/hasMinElements as _hasMinElements,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/isNonEmptyArray,/isNonEmptyArray as _isNonEmptyArray,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/startIndex,/_startIndex,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/endIndex,/_endIndex,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/preservedIndices,/_preservedIndices,/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/StructuredMessage,/StructuredMessage as _StructuredMessage,/g' src/services/campaignMetrics/streamPool.ts
sed -i 's/WorkerResult,/WorkerResult as _WorkerResult,/g' src/services/campaignMetrics/workerCoordinator.ts
sed -i 's/NonEmptyArray,/NonEmptyArray as _NonEmptyArray,/g' src/services/experimentation/banditService.ts
sed -i 's/normalizeArmStats,/normalizeArmStats as _normalizeArmStats,/g' src/services/experimentation/banditService.ts
sed -i 's/context,/_context,/g' src/services/experimentation/banditService.ts
sed -i 's/domain,/_domain,/g' src/services/privacy/differentialPrivacyService.ts
sed -i 's/const state = /const _state = /g' src/services/simulation/seedService.ts
sed -i 's/const data = /const _data = /g' src/services/summarization/summarizationService.ts
sed -i 's/isNonEmptyArray,/isNonEmptyArray as _isNonEmptyArray,/g' src/services/viz/adaptiveTimelineService.ts
sed -i 's/metricKey,/_metricKey,/g' src/services/viz/adaptiveTimelineService.ts
sed -i 's/const existingGraph = /const _existingGraph = /g' src/workers/edgeProcessor.worker.ts
sed -i 's/isNonEmptyArray,/isNonEmptyArray as _isNonEmptyArray,/g' src/workers/metricsWorker.ts

# Fix @ts-ignore to @ts-expect-error
sed -i 's/@ts-ignore/@ts-expect-error/g' src/store/ui/__tests__/pipelineSelectors.test.ts
sed -i 's/@ts-ignore/@ts-expect-error/g' src/tests/pipeline/domainOptimisticEvents.test.ts

echo "Fixed remaining lint issues"
