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