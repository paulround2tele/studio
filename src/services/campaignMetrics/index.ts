/**
 * Campaign Metrics Services (Phase 2 + Phase 3 + Phase 5)
 * Centralized export of all metrics services
 */

// Classification Service
export {
  classifyDomains,
  classificationToUiBuckets,
  calculateWarningRate
} from './classificationService';

// Aggregate Service
export {
  calculateAggregateMetrics,
  calculateMedian,
  calculateLeadScoreStats,
  calculateStatusDistribution
} from './aggregateService';

// Recommendation Service
export {
  generateRecommendations,
  generateAllClearRecommendation,
  getRecommendations
} from './recommendationService';

// Phase 3: Server adapter service
export {
  transformServerResponse,
  validateServerResponse,
  createDefaultSnapshot,
  logServerWarning
} from './serverAdapter';

// Phase 3: Deltas service
export {
  calculateDeltas,
  filterSignificantDeltas,
  getDeltaColor,
  formatDeltaValue,
  createBaselineSnapshot
} from './deltasService';

// Phase 3: Movers service
export {
  extractMovers,
  groupMoversByDirection,
  formatMoverValue,
  getMoverColor,
  createSyntheticMovers
} from './moversService';

// Phase 3: Progress stream service
export {
  ProgressStream,
  createProgressStream,
  createMockProgressStream
} from './progressStream';

// Phase 5: Timeline service
export {
  fetchServerTimeline,
  mergeTimelines,
  integrateServerSnapshotBatch,
  isServerTimelineAvailable,
  getLastServerSync,
  setLastServerSync
} from './timelineService';

// Phase 5: Anomaly detection service
export {
  detectAnomalies,
  getAnomalyThresholds,
  isAnomalyDetectionAvailable
} from './anomalyService';

// Phase 5: Recommendations V3 pipeline
export {
  pipelineRecommendationsV3,
  isExplainabilityAvailable,
  isAnomalyRecommendationsAvailable
} from './recommendationsV3Pipeline';

// Phase 5: Portfolio metrics service
export {
  computePortfolioAggregate,
  detectPortfolioOutliers,
  isPortfolioMetricsAvailable
} from './portfolioMetricsService';

// Phase 6 + Phase 8 + Phase 9: Forecast service
export {
  getServerForecast,
  computeClientForecast,
  mergeForecastIntoSeries,
  extractTimeSeriesFromSnapshots,
  isForecastAvailable,
  getDefaultHorizon,
  // Phase 8: Multi-model forecasting
  getMultiModelForecast,
  // Phase 9: Enhanced Bayesian blending
  getEnhancedMultiModelForecast
} from './forecastService';

// Phase 6 + Phase 8: Cohort service
export {
  normalizeSnapshotsByStart,
  buildCohortMatrix,
  extractCohortGrowthCurves,
  calculateCohortBenchmarks,
  isCohortComparisonAvailable,
  getDefaultCohortConfig
} from './cohortService';

// Phase 8: Audit Log service
export {
  auditLogService,
  logGovernanceAction,
  exportAuditTrail,
  isAuditLoggingAvailable,
  getAuditStatistics
} from './auditLogService';

// Phase 8: Dynamic Cohort Segmentation service
export {
  dynamicCohortSegmentationService,
  buildCohorts,
  isDynamicCohortSegmentationAvailable
} from './dynamicCohortService';

// Phase 8: Enhanced Recommendation service
export {
  enhancedRecommendationService,
  generateLayeredRecommendations,
  isLayeredRecommendationsAvailable
} from './enhancedRecommendationService';

// Phase 8: Degradation Evaluator service
export {
  degradationEvaluatorService,
  evaluateDegradationTier,
  getCurrentDegradationState,
  isDegradationManagementAvailable,
  getDegradationTierName,
  DegradationTier
} from './degradationEvaluatorService';

// Phase 8: Data Quality Validation service
export {
  dataQualityValidationService,
  validateCampaignDataQuality,
  isEnhancedDataQualityValidationAvailable
} from './dataQualityValidationService';

// Phase 8: Snapshot Compaction service
export {
  snapshotCompactionService,
  compactSnapshots,
  isSnapshotCompactionAvailable,
  getRecommendedCompactionStrategy
} from './snapshotCompactionService';

// Phase 8: Security Hardening service
export {
  securityHardeningService,
  sanitizeNumericPayload,
  validateForecastHorizon,
  sanitizeForecastPoints,
  isSecurityHardeningAvailable,
  sanitizeString
} from './securityHardeningService';

// Phase 6: Normalization service
export {
  fetchBenchmarks,
  applyNormalization,
  applyNormalizationBatch,
  getDisplayAggregates,
  isNormalized,
  getNormalizationMetadata,
  clearNormalizationCache,
  createMockBenchmarks,
  isNormalizationAvailable
} from './normalizationService';

// Phase 6: ML recommendations service
export {
  fetchMLRecommendations,
  adaptMLRecommendations,
  sortMLRecommendations,
  filterMLRecommendationsByConfidence,
  mergeMLWithLocalRecommendations,
  getCachedModelVersion,
  clearModelVersionCache,
  createMockMLRecommendations,
  isMLRecommendationsAvailable
} from './mlRecommendationsService';

// Phase 5: Export service
export {
  exportSnapshotsJSON,
  exportSnapshotsCSV,
  buildShareBundle,
  decodeShareBundle,
  generateShareableURL,
  parseShareBundleFromURL,
  validateExportSize,
  isExportToolsAvailable
} from './exportService';

// Phase 5: Worker coordinator
export {
  workerCoordinator,
  computeAllMetrics,
  isWorkerCoordinatorAvailable
} from './workerCoordinator';

// Phase 5: Stream pool service
export {
  streamPool,
  subscribeStreamPool,
  isStreamPoolingAvailable,
  getStreamPoolStats
} from './streamPool';

// Phase 5: Telemetry service
export {
  telemetryService,
  initTelemetry,
  emitTelemetry,
  isTelemetryAvailable,
  getTelemetryStatus
} from './telemetryService';

// Phase 9: Bayesian Model Blending service
export {
  forecastBlendService,
  type ModelRegistration,
  type ModelPerformanceStats,
  type BlendedForecast
} from './forecastBlendService';

// Phase 9: Root-Cause Analytics service
export {
  rootCauseAnalyticsService,
  type ContributingFactor,
  type InterventionRecommendation,
  type CausalChain,
  type AnomalyContext,
  type CausalFactorType
} from './rootCauseAnalyticsService';

// Phase 9: Offline Resilience service
export {
  offlineResilienceService,
  type DeferredAction,
  type GovernanceEvent,
  type OfflineSyncStatus,
  type DeferredActionType
} from './offlineResilienceService';

// Phase 9: Health Fabric service
export {
  healthFabricService,
  type DomainHealth,
  type PropagationRule,
  type CascadingEffect,
  type HealthFabric,
  type HealthEvent,
  type HealthScore,
  type HealthStatus
} from './healthFabricService';

// Phase 7 + Phase 9: Enhanced Capabilities service
export {
  capabilitiesService,
  type ServerCapabilities,
  type DomainResolution,
  type DomainType,
  type CapabilityDiff,
  type LiveCapabilityUpdate
} from './capabilitiesService';

// Phase 10: Causal Graph service
export {
  causalGraphService,
  type CausalGraph,
  type CausalNode,
  type CausalEdge,
  type ObservationFeatures,
  isCausalGraphAvailable
} from '../analytics/causalGraphService';

// Phase 10: Bandit Experiments service
export {
  banditService,
  type BanditArm,
  type BanditContext,
  type BanditDecision,
  type BanditOutcome,
  type BanditConfig,
  isBanditAvailable
} from '../experimentation/banditService';

// Phase 10: Privacy Redaction service
export {
  privacyRedactionService,
  type PrivacyPolicy,
  type PrivacyRule,
  type RedactionResult,
  type AuditEntry,
  isPrivacyRedactionAvailable
} from '../privacy/privacyRedactionService';

// Phase 10: Differential Privacy service
export {
  differentialPrivacyService,
  type DPConfig,
  type DPResult,
  type DPDomain,
  isDifferentialPrivacyAvailable
} from '../privacy/differentialPrivacyService';

// Phase 10: WASM Acceleration service
export {
  wasmAccelerationService,
  type WasmKernel,
  type LttbPoint,
  type BlendWeights,
  type QuantileBand,
  isWasmAccelerationAvailable
} from '../perf/wasmAccelerationService';

// Phase 10: Tracing service
export {
  tracingService,
  type TraceSpan,
  type TraceExport,
  isTracingAvailable,
  trace
} from '../observability/tracingService';

// Phase 10: Summarization service
export {
  summarizationService,
  type AnomalyCluster,
  type CausalGraphDelta,
  type SummaryResult,
  isSummarizationAvailable
} from '../summarization/summarizationService';

// Phase 10: i18n service
export {
  i18nService,
  type SupportedLocale,
  type MessageCatalog,
  type LocaleConfig,
  isI18nAvailable,
  t
} from '../i18n/i18nService';

// Phase 10: Memory Pressure service
export {
  memoryPressureService,
  type MemoryStats,
  type MemoryPressureConfig,
  isMemoryMonitoringAvailable
} from '../perf/memoryPressureService';

// Phase 10: Export v6 enhancements
export {
  exportSnapshotsJSONV6,
  type ExportOptionsV6
} from './exportService';