/**
 * Campaign Metrics Services (Phase 2)
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