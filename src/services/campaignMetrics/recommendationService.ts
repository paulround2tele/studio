/**
 * Recommendation Service for Campaign Metrics (Phase 2 + Phase 3)
 * Simple rule-based recommendations based on metrics, thresholds, and deltas
 */

import type { Recommendation, AggregateMetrics, ClassificationBuckets, DeltaMetrics } from '@/types/campaignMetrics';

interface RecommendationInput {
  aggregates: AggregateMetrics;
  classification: ClassificationBuckets;
  warningRate: number;
  targetDomains?: number;
  // Phase 3: Delta-aware inputs
  deltas?: DeltaMetrics[];
  previousAggregates?: AggregateMetrics;
}

/**
 * Generate recommendations based on campaign metrics
 */
export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const { aggregates, classification, warningRate, targetDomains = 100, deltas = [] } = input;
  const recommendations: Recommendation[] = [];

  // Phase 3: Delta-aware recommendations first (higher priority)
  if (deltas.length > 0) {
    recommendations.push(...generateDeltaRecommendations(deltas, aggregates));
  }

  // Rule 1: Low high-quality domains
  if (classification.highQuality.count < 3 && aggregates.totalDomains > targetDomains) {
    recommendations.push({
      id: 'low-high-quality',
      severity: 'action',
      title: 'Low High-Quality Domain Count',
      detail: 'Consider increasing variableLength or charset diversity to generate more high-quality domains.',
      rationale: `Only ${classification.highQuality.count} high-quality domains found out of ${aggregates.totalDomains} total domains.`
    });
  }

  // Rule 2: High warning rate
  if (warningRate > 25) {
    recommendations.push({
      id: 'high-warning-rate',
      severity: 'warn',
      title: 'High Warning Rate Detected',
      detail: 'Consider tuning keyword density or anchor strategy to reduce DNS/HTTP failures.',
      rationale: `Warning rate is ${warningRate}%, which exceeds the recommended threshold of 25%.`
    });
  }

  // Rule 3: No leads and analysis complete
  if (aggregates.avgLeadScore === 0 && aggregates.totalDomains >= targetDomains) {
    recommendations.push({
      id: 'no-leads-generated',
      severity: 'action',
      title: 'No Leads Generated',
      detail: 'Consider expanding keywords or increasing targetDomains by +50% to improve lead generation.',
      rationale: 'Analysis phase appears complete but no meaningful lead scores were generated.'
    });
  }

  // Rule 4: Low DNS success rate
  if (aggregates.dnsSuccessRate < 70 && aggregates.totalDomains > 10) {
    recommendations.push({
      id: 'low-dns-success',
      severity: 'warn',
      title: 'Low DNS Resolution Success',
      detail: 'High DNS failure rate may indicate issues with domain generation patterns.',
      rationale: `DNS success rate is ${aggregates.dnsSuccessRate}%, below the recommended 70% threshold.`
    });
  }

  // Rule 5: Low HTTP success rate
  if (aggregates.httpSuccessRate < 60 && aggregates.totalDomains > 10) {
    recommendations.push({
      id: 'low-http-success',
      severity: 'warn',
      title: 'Low HTTP Response Success',
      detail: 'Consider adjusting timeout settings or domain filtering criteria.',
      rationale: `HTTP success rate is ${aggregates.httpSuccessRate}%, below the recommended 60% threshold.`
    });
  }

  // Rule 6: Good performance recognition
  if (warningRate < 10 && classification.highQuality.percentage > 40 && aggregates.totalDomains > 50) {
    recommendations.push({
      id: 'good-performance',
      severity: 'info',
      title: 'Excellent Campaign Performance',
      detail: 'Your campaign is performing well with high-quality domains and low warning rates.',
      rationale: `${classification.highQuality.percentage}% high-quality domains with only ${warningRate}% warning rate.`
    });
  }

  return recommendations;
}

/**
 * Phase 3: Generate delta-aware recommendations
 */
function generateDeltaRecommendations(deltas: DeltaMetrics[], aggregates: AggregateMetrics): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Find significant deltas for recommendation triggers
  const significantDeltas = deltas.filter(d => Math.abs(d.percent) > 10);
  
  // Delta Rule 1: Momentum Loss Detection
  const successRateDelta = deltas.find(d => d.key === 'successRate');
  const leadScoreDelta = deltas.find(d => d.key === 'avgLeadScore');
  
  if (successRateDelta?.direction === 'down' && Math.abs(successRateDelta.percent) > 15) {
    recommendations.push({
      id: 'momentum-loss-success',
      severity: 'warn',
      title: 'Success Rate Declining',
      detail: 'Campaign success rate has dropped significantly. Review recent configuration changes.',
      rationale: `Success rate decreased by ${Math.abs(successRateDelta.percent).toFixed(1)}% since last measurement.`
    });
  }

  if (leadScoreDelta?.direction === 'down' && Math.abs(leadScoreDelta.percent) > 20) {
    recommendations.push({
      id: 'momentum-loss-leads',
      severity: 'action',
      title: 'Lead Quality Declining',
      detail: 'Average lead score is trending downward. Consider adjusting keyword targeting or domain patterns.',
      rationale: `Lead score decreased by ${Math.abs(leadScoreDelta.percent).toFixed(1)}% since last measurement.`
    });
  }

  // Delta Rule 2: Surge Detection
  const highPerformanceDeltas = significantDeltas.filter(d => 
    d.direction === 'up' && ['successRate', 'avgLeadScore', 'dnsSuccessRate'].includes(d.key)
  );

  if (highPerformanceDeltas.length >= 2) {
    recommendations.push({
      id: 'performance-surge',
      severity: 'info',
      title: 'Performance Surge Detected',
      detail: 'Multiple metrics are improving rapidly. Consider scaling up the campaign.',
      rationale: `${highPerformanceDeltas.length} key metrics showing significant improvement.`
    });
  }

  // Delta Rule 3: Stagnation Detection
  const flatDeltas = deltas.filter(d => d.direction === 'flat');
  if (flatDeltas.length > 5 && aggregates.totalDomains > 100) {
    recommendations.push({
      id: 'performance-stagnation',
      severity: 'warn',
      title: 'Performance Stagnation',
      detail: 'Most metrics show no significant change. Consider introducing variation to campaign parameters.',
      rationale: `${flatDeltas.length} metrics showing no significant change over time.`
    });
  }

  // Delta Rule 4: Warning Rate Spike
  const warningRateDelta = deltas.find(d => d.key === 'warningRate');
  if (warningRateDelta?.direction === 'up' && Math.abs(warningRateDelta.percent) > 25) {
    recommendations.push({
      id: 'warning-rate-spike',
      severity: 'action',
      title: 'Warning Rate Spike',
      detail: 'DNS/HTTP warning rate has increased significantly. Investigate infrastructure issues.',
      rationale: `Warning rate increased by ${Math.abs(warningRateDelta.percent).toFixed(1)}% since last measurement.`
    });
  }

  // Delta Rule 5: High Potential Gains
  const richnessDelta = deltas.find(d => d.key === 'avgRichness');
  const potentialDelta = deltas.find(d => d.key === 'highPotentialCount');
  
  if (richnessDelta?.direction === 'up' && potentialDelta?.direction === 'up') {
    recommendations.push({
      id: 'high-potential-gains',
      severity: 'info',
      title: 'Quality Improvement Trend',
      detail: 'Both richness and high-potential counts are increasing. Great progress!',
      rationale: 'Domain quality metrics showing positive momentum across multiple indicators.'
    });
  }

  return recommendations;
}

/**
 * Generate neutral "all clear" recommendation when no issues found
 */
export function generateAllClearRecommendation(): Recommendation {
  return {
    id: 'all-clear',
    severity: 'info',
    title: 'All Systems Operational',
    detail: 'Your campaign metrics look good. No immediate action required.',
    rationale: 'All performance indicators are within acceptable ranges.'
  };
}

/**
 * Main entry point for recommendations
 */
export function getRecommendations(input: RecommendationInput): Recommendation[] {
  const recommendations = generateRecommendations(input);
  
  // If no specific recommendations, return all clear
  if (recommendations.length === 0) {
    return [generateAllClearRecommendation()];
  }
  
  return recommendations;
}