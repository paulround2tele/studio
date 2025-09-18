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

// Phase 6 + Phase 8: Forecast service
export {
  getServerForecast,
  computeClientForecast,
  mergeForecastIntoSeries,
  extractTimeSeriesFromSnapshots,
  isForecastAvailable,
  getDefaultHorizon,
  // Phase 8: Multi-model forecasting
  getMultiModelForecast
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