/**
 * Recommendations V3 Pipeline (Phase 5 + Phase 6)
 * Layering anomaly-based recommendations on top of Phase 4 scoring
 * Phase 6: Add ML server recommendation override support
 */

import { Recommendation } from '@/types/campaignMetrics';
import { Anomaly } from './anomalyService';

// Feature flags
const isAnomalyRecommendationsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES !== 'false';

const isExplainabilityEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ADV_REC_EXPLAIN !== 'false';

const isMLRecommendationsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ML_RECOMMENDATIONS !== 'false';

/**
 * Explainability metadata for recommendations
 */
export interface RecommendationExplanation {
  source: 'scoring' | 'anomaly' | 'rule' | 'ml';
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
 * ML recommendation from server (Phase 6)
 */
export interface ServerMLRecommendation {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warn' | 'action';
  mlScore: number;
  modelVersion: string;
  features: string[];
  isMLGenerated: boolean;
  explainability?: {
    primary_factors: string[];
    confidence: number;
    model_reasoning: string;
  };
}

/**
 * Pipeline recommendations V3 - combines scoring + anomaly detection + ML override
 * Phase 6: ML recommendations take precedence when available
 */
export function pipelineRecommendationsV3(
  scoringRecommendations: Recommendation[],
  anomalies: Anomaly[],
  serverMLRecommendations?: ServerMLRecommendation[],
  serverAnomalies?: Anomaly[]
): EnhancedRecommendation[] {
  // Phase 6: Use server ML recommendations when available and enabled
  if (isMLRecommendationsEnabled() && serverMLRecommendations && serverMLRecommendations.length > 0) {
    return handleMLRecommendationsPipeline(serverMLRecommendations, scoringRecommendations, anomalies);
  }

  // Phase 6: Use server anomalies if available, otherwise use local anomalies
  const activeAnomalies = serverAnomalies && serverAnomalies.length > 0 ? serverAnomalies : anomalies;

  // Phase 5: Original pipeline - scoring + local anomaly detection
  const scoringWithExplanation = addExplanationToRecommendations(
    scoringRecommendations, 
    'scoring'
  );

  if (!isAnomalyRecommendationsEnabled() || activeAnomalies.length === 0) {
    return scoringWithExplanation;
  }

  const anomalyRecommendations = generateAnomalyRecommendations(activeAnomalies);
  
  // Merge and deduplicate
  return mergeRecommendations(scoringWithExplanation, anomalyRecommendations);
}

/**
 * Phase 6: Handle ML recommendations pipeline with fallback merging
 */
function handleMLRecommendationsPipeline(
  mlRecommendations: ServerMLRecommendation[],
  scoringRecommendations: Recommendation[],
  anomalies: Anomaly[]
): EnhancedRecommendation[] {
  // Convert ML recommendations to enhanced format
  const enhancedMLRecommendations: EnhancedRecommendation[] = mlRecommendations.map(mlRec => ({
    id: mlRec.id,
    title: mlRec.title,
    detail: mlRec.detail,
    severity: mlRec.severity,
    rationale: generateMLRationale(mlRec),
    explanation: {
      source: 'ml',
      confidence: mlRec.mlScore,
      factors: mlRec.features,
      reasoning: mlRec.explainability?.model_reasoning || 'ML-generated recommendation'
    }
  }));

  // ML recommendations take precedence (up to 70% of total recommendations)
  const maxMLRecommendations = Math.ceil(10 * 0.7);
  const sortedMLRecommendations = sortMLRecommendationsByScore(enhancedMLRecommendations)
    .slice(0, maxMLRecommendations);

  // Fill remaining slots with local recommendations (scoring + anomaly)
  const remainingSlots = 10 - sortedMLRecommendations.length;
  
  if (remainingSlots > 0) {
    const localRecommendations = pipelineRecommendationsV3(
      scoringRecommendations, 
      anomalies,
      undefined, // No ML recommendations in recursive call
      undefined  // No server anomalies in recursive call
    );

    // Filter out duplicates based on title similarity
    const mlTitles = new Set(sortedMLRecommendations.map(rec => rec.title.toLowerCase()));
    const nonDuplicateLocal = localRecommendations.filter(local => 
      !mlTitles.has(local.title.toLowerCase())
    );

    return [...sortedMLRecommendations, ...nonDuplicateLocal.slice(0, remainingSlots)];
  }

  return sortedMLRecommendations;
}

/**
 * Generate rationale for ML recommendations
 */
function generateMLRationale(mlRec: ServerMLRecommendation): string {
  if (mlRec.explainability) {
    const confidence = Math.round(mlRec.explainability.confidence * 100);
    const primaryFactors = mlRec.explainability.primary_factors.slice(0, 3).join(', ');
    return `ML analysis (${confidence}% confidence) identified key factors: ${primaryFactors}. ${mlRec.explainability.model_reasoning}`;
  }
  
  if (mlRec.features.length > 0) {
    const topFeatures = mlRec.features.slice(0, 3).join(', ');
    const confidence = Math.round(mlRec.mlScore * 100);
    return `ML recommendation based on analysis of: ${topFeatures} (confidence: ${confidence}%)`;
  }
  
  return `ML-generated recommendation with ${Math.round(mlRec.mlScore * 100)}% confidence`;
}

/**
 * Sort ML recommendations by score and severity
 */
function sortMLRecommendationsByScore(recommendations: EnhancedRecommendation[]): EnhancedRecommendation[] {
  const severityWeight = {
    action: 3,
    warn: 2,
    info: 1
  };

  return [...recommendations].sort((a, b) => {
    // Primary sort: severity weight
    const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Secondary sort: confidence/score
    const aConfidence = a.explanation?.confidence || 0;
    const bConfidence = b.explanation?.confidence || 0;
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

/**
 * Add explainability metadata to existing recommendations
 */
function addExplanationToRecommendations(
  recommendations: Recommendation[],
  source: 'scoring' | 'anomaly' | 'rule' | 'ml'
): EnhancedRecommendation[] {
  if (!isExplainabilityEnabled()) {
    return recommendations;
  }

  return recommendations.map(rec => ({
    ...rec,
    explanation: {
      source,
      confidence: 0.8, // Default confidence for non-ML recommendations
      factors: ['historical_patterns', 'statistical_analysis'],
      reasoning: `${source === 'scoring' ? 'Statistical analysis' : 'Rule-based analysis'} of campaign metrics`
    }
  }));
}

/**
 * Merge recommendations and remove duplicates
 */
function mergeRecommendations(
  primary: EnhancedRecommendation[],
  secondary: EnhancedRecommendation[]
): EnhancedRecommendation[] {
  const merged = [...primary];
  const existingTitles = new Set(primary.map(rec => rec.title.toLowerCase()));

  for (const rec of secondary) {
    if (!existingTitles.has(rec.title.toLowerCase())) {
      merged.push(rec);
      existingTitles.add(rec.title.toLowerCase());
    }
  }

  return merged.slice(0, 10); // Limit to 10 total recommendations
}

/**
 * Calculate confidence score for anomaly-based recommendations
 */
function calculateAnomalyConfidence(anomaly: Anomaly): number {
  // Convert z-score to confidence (higher z-score = higher confidence)
  const absZScore = Math.abs(anomaly.zScore);
  
  // Cap at 95% confidence for very high z-scores
  if (absZScore >= 4.0) return 0.95;
  if (absZScore >= 3.0) return 0.85;
  if (absZScore >= 2.5) return 0.75;
  if (absZScore >= 2.0) return 0.65;
  
  return 0.5; // Default moderate confidence
}

/**
 * Metric-specific action recommendations
 */
function getMetricActionMap(): Record<string, { detail: string }> {
  return {
    warningRate: {
      detail: 'High warning rate detected. Review domain quality filters and validation rules to reduce false positives.'
    },
    avgRichness: {
      detail: 'Domain richness anomaly detected. Check keyword extraction and content analysis processes.'
    },
    leadsCount: {
      detail: 'Unusual lead count variation. Verify lead generation sources and scoring algorithms.'
    },
    highPotentialCount: {
      detail: 'High potential domain count anomaly. Review classification thresholds and quality criteria.'
    },
    successRate: {
      detail: 'Success rate deviation detected. Check DNS/HTTP validation processes and network connectivity.'
    },
    avgLeadScore: {
      detail: 'Lead scoring anomaly detected. Verify scoring model inputs and weights.'
    },
    dnsSuccessRate: {
      detail: 'DNS resolution issues detected. Check DNS server performance and domain validity.'
    },
    httpSuccessRate: {
      detail: 'HTTP request failures detected. Investigate network connectivity and server responses.'
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
  const names: Record<string, string> = {
    warningRate: 'Warning Rate',
    avgRichness: 'Average Richness',
    leadsCount: 'Leads Count',
    highPotentialCount: 'High Potential Count',
    successRate: 'Success Rate',
    avgLeadScore: 'Average Lead Score',
    dnsSuccessRate: 'DNS Success Rate',
    httpSuccessRate: 'HTTP Success Rate',
    medianGain: 'Median Gain',
    keywordCoverage: 'Keyword Coverage'
  };
  
  return names[metric] || metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

/**
 * Format metric values for display
 */
function formatMetricValue(metric: string, value: number): string {
  const percentageMetrics = ['warningRate', 'avgRichness', 'successRate', 'dnsSuccessRate', 'httpSuccessRate', 'keywordCoverage'];
  
  if (percentageMetrics.includes(metric)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  
  if (metric.includes('Count') || metric === 'leadsCount') {
    return value.toFixed(0);
  }
  
  return value.toFixed(2);
}