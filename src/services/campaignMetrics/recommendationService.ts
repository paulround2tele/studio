/**
 * Recommendation Service for Campaign Metrics (Phase 2)
 * Simple rule-based recommendations based on metrics and thresholds
 */

import type { Recommendation, AggregateMetrics, ClassificationBuckets } from '@/types/campaignMetrics';

interface RecommendationInput {
  aggregates: AggregateMetrics;
  classification: ClassificationBuckets;
  warningRate: number;
  targetDomains?: number;
}

/**
 * Generate recommendations based on campaign metrics
 */
export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const { aggregates, classification, warningRate, targetDomains = 100 } = input;
  const recommendations: Recommendation[] = [];

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