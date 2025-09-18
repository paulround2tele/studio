/**
 * Campaign Metrics Services (Phase 2 + Phase 3)
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