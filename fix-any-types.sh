#!/bin/bash

# Fix 'any' types by replacing with 'unknown' or proper types

# useClientTraceDebug.ts
sed -i 's/: any\[\]/: unknown[]/g' src/hooks/useClientTraceDebug.ts
sed -i 's/: any)/: unknown)/g' src/hooks/useClientTraceDebug.ts

# useEnhancedMetricsContext.tsx
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/hooks/useEnhancedMetricsContext.tsx

# useMetricsContext.tsx
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/hooks/useMetricsContext.tsx

# useSemanticSummaries.ts
sed -i 's/: any\[\]/: unknown[]/g' src/hooks/useSemanticSummaries.ts

# useWorkerMetricsFallback.ts
sed -i 's/: any\[\]/: unknown[]/g' src/hooks/useWorkerMetricsFallback.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/hooks/useWorkerMetricsFallback.ts

# useCampaignServerMetrics.ts
sed -i 's/: any)/: unknown)/g' src/hooks/useCampaignServerMetrics.ts

# Service files
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/campaignMetrics/dynamicCohortService.ts
sed -i 's/: any)/: unknown)/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts
sed -i 's/: any)/: unknown)/g' src/services/campaignMetrics/normalizationService.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/campaignMetrics/recommendationAttributionService.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/campaignMetrics/recommendationScoreService.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/campaignMetrics/snapshotCompactionService.ts
sed -i 's/: any)/: unknown)/g' src/services/campaignMetrics/auditLogService.ts
sed -i 's/: any)/: unknown)/g' src/services/campaignMetrics/performanceGuardrailsService.ts
sed -i 's/: any)/: unknown)/g' src/services/campaignMetrics/streamPool.ts
sed -i 's/: any)/: unknown)/g' src/services/campaignMetrics/telemetryService.ts
sed -i 's/WorkerMessage<any>/WorkerMessage<unknown>/g' src/services/campaignMetrics/workerCoordinator.ts

# Tracing service
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/observability/tracingService.ts
sed -i 's/: any)/: unknown)/g' src/services/observability/tracingService.ts

# Memory pressure service
sed -i 's/WeakMap<any, any, any>/WeakMap<object, unknown, unknown>/g' src/services/perf/memoryPressureService.ts

# WASM service
sed -i 's/: any\[\]/: unknown[]/g' src/services/perf/wasmAccelerationService.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/perf/wasmAccelerationService.ts

# Simulation service  
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/simulation/scenarioEngine.ts

# Timeline service
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/services/viz/adaptiveTimelineService.ts

# Utils
sed -i 's/: any)/: unknown)/g' src/lib/utils/uuidValidation.ts

# Workers
sed -i 's/: any\[\]/: unknown[]/g' src/workers/edgeProcessor.worker.ts
sed -i 's/: any)/: unknown)/g' src/workers/edgeProcessor.worker.ts
sed -i 's/Record<string, any>/Record<string, unknown>/g' src/workers/metricsWorker.ts

# React window types
sed -i 's/: any;/: unknown;/g' src/types/react-window.d.ts

# Phase status utils
sed -i 's/ as any/ as unknown/g' src/utils/phaseStatus.ts

# CSP
sed -i 's/ as any/ as unknown/g' src/lib/security/csp.ts

echo "Fixed any types"
