/**
 * Recommendations V3 Pipeline (Phase 5)
 * Layering anomaly-based recommendations on top of Phase 4 scoring
 */

import { Recommendation } from '@/types/campaignMetrics';
import { Anomaly } from './anomalyService';

// Feature flags
const isAnomalyRecommendationsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES !== 'false';

const isExplainabilityEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ADV_REC_EXPLAIN !== 'false';

/**
 * Explainability metadata for recommendations
 */
export interface RecommendationExplanation {
  source: 'scoring' | 'anomaly' | 'rule';
  confidence: number;
  factors: string[];
  reasoning: string;
}

/**
 * Enhanced recommendation with optional explainability
 */
export interface EnhancedRecommendation extends Recommendation {
  explanation?: RecommendationExplanation;
}

/**
 * Pipeline recommendations V3 - combines scoring + anomaly detection
 */
export function pipelineRecommendationsV3(
  scoringRecommendations: Recommendation[],
  anomalies: Anomaly[]
): EnhancedRecommendation[] {
  const enhancedRecommendations: EnhancedRecommendation[] = [];

  // Start with existing scoring-based recommendations
  scoringRecommendations.forEach(rec => {
    const enhanced: EnhancedRecommendation = {
      ...rec,
    };

    // Add explainability metadata if enabled
    if (isExplainabilityEnabled()) {
      enhanced.explanation = {
        source: 'scoring',
        confidence: 0.8, // Default confidence for scoring recommendations
        factors: ['historical_patterns', 'domain_quality', 'performance_metrics'],
        reasoning: 'Based on campaign performance analysis and domain scoring patterns'
      };
    }

    enhancedRecommendations.push(enhanced);
  });

  // Add anomaly-based recommendations if enabled
  if (isAnomalyRecommendationsEnabled()) {
    const anomalyRecommendations = generateAnomalyRecommendations(anomalies);
    enhancedRecommendations.push(...anomalyRecommendations);
  }

  // Sort by severity (action > warn > info) and confidence
  return enhancedRecommendations.sort((a, b) => {
    const severityOrder = { action: 3, warn: 2, info: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    
    if (severityDiff !== 0) return severityDiff;
    
    // If same severity, sort by confidence (if available)
    const aConfidence = a.explanation?.confidence || 0.5;
    const bConfidence = b.explanation?.confidence || 0.5;
    return bConfidence - aConfidence;
  });
}

/**
 * Generate recommendations based on detected anomalies
 */
function generateAnomalyRecommendations(anomalies: Anomaly[]): EnhancedRecommendation[] {
  return anomalies.map(anomaly => {
    const recommendation = createAnomalyRecommendation(anomaly);
    
    if (isExplainabilityEnabled()) {
      recommendation.explanation = {
        source: 'anomaly',
        confidence: calculateAnomalyConfidence(anomaly),
        factors: ['statistical_deviation', 'historical_baseline', 'z_score_analysis'],
        reasoning: `Detected significant deviation in ${anomaly.metric} (${Math.abs(anomaly.zScore).toFixed(2)} standard deviations from normal)`
      };
    }

    return recommendation;
  });
}

/**
 * Create a recommendation based on an anomaly
 */
function createAnomalyRecommendation(anomaly: Anomaly): EnhancedRecommendation {
  const metricActions = getMetricActionMap();
  const action = metricActions[anomaly.metric] || getDefaultAction(anomaly);

  return {
    id: `anomaly-${anomaly.metric}-${Date.now()}`,
    severity: anomaly.severity === 'critical' ? 'action' : 'warn',
    title: `${formatMetricName(anomaly.metric)} Anomaly Detected`,
    detail: action.detail,
    rationale: `${anomaly.description}. Current value: ${formatMetricValue(anomaly.metric, anomaly.value)}`
  };
}

/**
 * Calculate confidence score for anomaly-based recommendations
 */
function calculateAnomalyConfidence(anomaly: Anomaly): number {
  const zScore = Math.abs(anomaly.zScore);
  
  if (zScore >= 3.0) return 0.95;
  if (zScore >= 2.5) return 0.85;
  if (zScore >= 2.0) return 0.75;
  return 0.65;
}

/**
 * Metric-specific action recommendations
 */
function getMetricActionMap(): Record<string, { detail: string }> {
  return {
    warningRate: {
      detail: 'Review domain validation settings and check for DNS/HTTP configuration issues'
    },
    avgRichness: {
      detail: 'Analyze content extraction patterns and keyword matching rules'
    },
    leadsCount: {
      detail: 'Examine lead scoring criteria and domain quality thresholds'
    },
    highPotentialCount: {
      detail: 'Review high-potential classification rules and scoring weights'
    },
    medianGain: {
      detail: 'Investigate performance gains calculation and baseline metrics'
    },
    keywordCoverage: {
      detail: 'Check keyword extraction rules and content analysis depth'
    }
  };
}

/**
 * Default action for unknown metrics
 */
function getDefaultAction(anomaly: Anomaly): { detail: string } {
  const direction = anomaly.zScore > 0 ? 'increase' : 'decrease';
  return {
    detail: `Investigate the unexpected ${direction} in ${formatMetricName(anomaly.metric)} and review related campaign settings`
  };
}

/**
 * Format metric names for display
 */
function formatMetricName(metric: string): string {
  const formatMap: Record<string, string> = {
    warningRate: 'Warning Rate',
    avgRichness: 'Average Richness',
    leadsCount: 'Leads Count',
    highPotentialCount: 'High Potential Count',
    medianGain: 'Median Gain',
    keywordCoverage: 'Keyword Coverage'
  };
  
  return formatMap[metric] || metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

/**
 * Format metric values for display
 */
function formatMetricValue(metric: string, value: number): string {
  const percentageMetrics = ['warningRate', 'keywordCoverage'];
  
  if (percentageMetrics.includes(metric)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  
  if (metric.includes('Count')) {
    return value.toFixed(0);
  }
  
  return value.toFixed(2);
}

/**
 * Check if explainability features are available
 */
export function isExplainabilityAvailable(): boolean {
  return isExplainabilityEnabled();
}

/**
 * Check if anomaly recommendations are available
 */
export function isAnomalyRecommendationsAvailable(): boolean {
  return isAnomalyRecommendationsEnabled();
}