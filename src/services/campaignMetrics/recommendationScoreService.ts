/**
 * Recommendation Score Service V2 (Phase 4)
 * Advanced recommendation scoring with severity weighting, duplicate suppression, and rationale layering
 */

import type { Recommendation, AggregateMetrics, DeltaMetrics } from '@/types/campaignMetrics';

// Feature flag
const ENABLE_SCORING_V2 = process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2 !== 'false';

export interface ScoredRecommendation extends Omit<Recommendation, 'rationale'> {
  rawScore: number;
  severityWeight: number;
  recencyFactor: number;
  compositePriority: number;
  rationale: string[];
  canonicalCause?: string;
  duplicateCount?: number;
}

export interface RecommendationGroup {
  canonicalCause: string;
  recommendations: ScoredRecommendation[];
  mergedRecommendation: ScoredRecommendation;
  totalPriority: number;
}

interface ScoringInput {
  aggregates: AggregateMetrics;
  classification: unknown;
  deltas?: DeltaMetrics[];
  warningRate?: number;
  targetDomains?: number;
  previousAggregates?: AggregateMetrics;
}

// Severity weights
const SEVERITY_WEIGHTS = {
  action: 1.0,    // highest priority
  warn: 0.7,      // medium priority  
  info: 0.4       // lowest priority
} as const;

// Priority threshold for inclusion
const PRIORITY_THRESHOLD = 0.08;

/**
 * Enhanced recommendation scoring and grouping
 */
export function scoreAndGroupRecommendations(
  recommendations: Recommendation[],
  input: ScoringInput
): RecommendationGroup[] {
  if (!ENABLE_SCORING_V2 || recommendations.length === 0) {
    // Fallback to simple grouping
    return recommendations.map(rec => ({
      canonicalCause: rec.id,
      recommendations: [{
        ...rec,
        rawScore: 0.5,
        severityWeight: SEVERITY_WEIGHTS[rec.severity] || 0.5,
        recencyFactor: 1.0,
        compositePriority: 0.5,
        rationale: [rec.rationale]
      } as ScoredRecommendation],
      mergedRecommendation: {
        ...rec,
        rawScore: 0.5,
        severityWeight: SEVERITY_WEIGHTS[rec.severity] || 0.5,
        recencyFactor: 1.0,
        compositePriority: 0.5,
        rationale: [rec.rationale]
      } as ScoredRecommendation,
      totalPriority: 0.5
    }));
  }

  // Step 1: Score each recommendation
  const scoredRecommendations = recommendations.map(rec => 
    scoreRecommendation(rec, input)
  );

  // Step 2: Group by canonical cause
  const groups = groupByCanonicalCause(scoredRecommendations);

  // Step 3: Merge grouped recommendations
  const mergedGroups = groups.map(group => mergeRecommendationGroup(group));

  // Step 4: Filter by priority threshold and sort
  return mergedGroups
    .filter(group => group.totalPriority > PRIORITY_THRESHOLD)
    .sort((a, b) => b.totalPriority - a.totalPriority);
}

/**
 * Score an individual recommendation
 */
function scoreRecommendation(
  recommendation: Recommendation,
  input: ScoringInput
): ScoredRecommendation {
  const rawScore = calculateRawScore(recommendation, input);
  const severityWeight = SEVERITY_WEIGHTS[recommendation.severity] || 0.5;
  const recencyFactor = calculateRecencyFactor(recommendation);
  
  const compositePriority = severityWeight * rawScore * recencyFactor;

  return {
    ...recommendation,
    rawScore,
    severityWeight,
    recencyFactor,
    compositePriority,
    rationale: [recommendation.rationale || recommendation.detail],
    canonicalCause: extractCanonicalCause(recommendation)
  };
}

/**
 * Calculate raw score based on impact and confidence
 */
function calculateRawScore(recommendation: Recommendation, input: ScoringInput): number {
  let score = 0.5; // Base score

  // Score based on recommendation type and context
  switch (recommendation.id) {
    case 'low-high-quality':
      if (input.classification && typeof input.classification === 'object') {
        const classification = input.classification as {
          highQuality?: { count?: number };
        };
        const highQualityCount = classification.highQuality?.count;
        if (typeof highQualityCount === 'number') {
        const totalDomains = input.aggregates.totalDomains || 0;
        const ratio = totalDomains > 0 ? highQualityCount / totalDomains : 0;
        score = Math.max(0.2, 1.0 - ratio * 2); // Higher score for lower ratios
        }
      }
      break;

    case 'high-warning-rate':
      if (input.warningRate !== undefined) {
        score = Math.min(1.0, input.warningRate / 20); // Scale from 0-20% warning rate
      }
      break;

    case 'domain-count-low':
      if (input.targetDomains) {
        const ratio = input.aggregates.totalDomains / input.targetDomains;
        score = Math.max(0.2, 1.0 - ratio);
      }
      break;

    case 'significant-decline':
    case 'significant-improvement':
      // Delta-based recommendations get higher scores
      score = 0.8;
      break;

    default:
      // Use severity as primary indicator
      score = SEVERITY_WEIGHTS[recommendation.severity] || 0.5;
  }

  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Calculate recency factor based on deltas and time
 */
function calculateRecencyFactor(recommendation: Recommendation): number {
  // Delta-based recommendations are more recent/urgent
  if (recommendation.id.includes('decline') || recommendation.id.includes('improvement')) {
    return 1.0;
  }

  // Time-based decay could be added here
  return 0.9;
}

/**
 * Extract canonical cause for grouping
 */
function extractCanonicalCause(recommendation: Recommendation): string {
  // Map similar recommendations to canonical causes
  const causeMap: Record<string, string> = {
    'low-high-quality': 'quality-issues',
    'domain-count-low': 'generation-volume',
    'high-warning-rate': 'validation-problems',
    'significant-decline': 'performance-regression',
    'significant-improvement': 'performance-gain',
    'charset-optimization': 'generation-optimization',
    'length-optimization': 'generation-optimization'
  };

  return causeMap[recommendation.id] || recommendation.id;
}

/**
 * Group recommendations by canonical cause
 */
function groupByCanonicalCause(
  recommendations: ScoredRecommendation[]
): Array<{ cause: string; recommendations: ScoredRecommendation[] }> {
  const groups = new Map<string, ScoredRecommendation[]>();

  for (const rec of recommendations) {
    const cause = rec.canonicalCause!;
    if (!groups.has(cause)) {
      groups.set(cause, []);
    }
    groups.get(cause)!.push(rec);
  }

  return Array.from(groups.entries()).map(([cause, recs]) => ({
    cause,
    recommendations: recs
  }));
}

/**
 * Merge a group of recommendations into a single representative recommendation
 */
function mergeRecommendationGroup(
  group: { cause: string; recommendations: ScoredRecommendation[] }
): RecommendationGroup {
  const { cause, recommendations } = group;
  
  if (recommendations.length === 1) {
    const single = recommendations[0];
    if (!single) {
      throw new Error('Invalid recommendation data');
    }
    return {
      canonicalCause: cause,
      recommendations,
      mergedRecommendation: single,
      totalPriority: single.compositePriority
    };
  }

  // Sort by priority to get primary recommendation
  const sortedRecs = recommendations.sort((a, b) => b.compositePriority - a.compositePriority);
  const primary = sortedRecs[0];
  if (!primary) {
    throw new Error('No valid recommendations to merge');
  }
  
  // Calculate total priority (weighted average)
  const totalPriority = recommendations.reduce((sum, rec) => sum + rec.compositePriority, 0) / recommendations.length;
  
  // Merge rationales
  const allRationales = recommendations.flatMap(rec => rec.rationale);
  const uniqueRationales = Array.from(new Set(allRationales));
  
  // Create merged recommendation
  const mergedRecommendation: ScoredRecommendation = {
    ...primary,
    title: getMergedTitle(cause, recommendations),
    detail: getMergedDetail(cause, recommendations),
    rationale: uniqueRationales,
    duplicateCount: recommendations.length,
    compositePriority: totalPriority
  };

  return {
    canonicalCause: cause,
    recommendations,
    mergedRecommendation,
    totalPriority
  };
}

/**
 * Generate merged title for grouped recommendations
 */
function getMergedTitle(cause: string, recommendations: ScoredRecommendation[]): string {
  if (recommendations.length === 1) {
    const single = recommendations[0];
    return single ? single.title : 'Unknown';
  }

  const titleMap: Record<string, string> = {
    'quality-issues': 'Domain Quality Concerns',
    'generation-volume': 'Generation Volume Issues',
    'validation-problems': 'Validation and Errors',
    'performance-regression': 'Performance Decline Detected',
    'performance-gain': 'Performance Improvement',
    'generation-optimization': 'Generation Optimization Opportunities'
  };

  return titleMap[cause] || `Multiple ${cause} Issues`;
}

/**
 * Generate merged detail for grouped recommendations
 */
function getMergedDetail(cause: string, recommendations: ScoredRecommendation[]): string {
  if (recommendations.length === 1) {
    const single = recommendations[0];
    return single ? single.detail : 'Unknown detail';
  }

  const count = recommendations.length;
  const primary = recommendations[0];
  const primaryDetail = primary ? primary.detail : 'Multiple issues detected';
  
  return `${primaryDetail} (${count - 1} related issue${count > 2 ? 's' : ''} detected)`;
}

/**
 * Get recommendations with enhanced scoring
 */
export function getRecommendationsV2(input: ScoringInput): ScoredRecommendation[] {
  // Import base recommendations from existing service
  // This would import from the existing recommendationService
  const baseRecommendations: Recommendation[] = []; // TODO: Import from existing service
  
  if (baseRecommendations.length === 0) {
    return [];
  }

  const groups = scoreAndGroupRecommendations(baseRecommendations, input);
  
  return groups.map(group => group.mergedRecommendation);
}

/**
 * Utility function to explain scoring for debugging
 */
export function explainScoring(recommendation: ScoredRecommendation): {
  breakdown: string[];
  finalScore: number;
} {
  const breakdown = [
    `Raw Score: ${recommendation.rawScore.toFixed(3)} (impact and confidence)`,
    `Severity Weight: ${recommendation.severityWeight.toFixed(3)} (${
      Object.entries(SEVERITY_WEIGHTS).find(([_k, v]) => v === recommendation.severityWeight)?.[0] || 'unknown'
    })`,
    `Recency Factor: ${recommendation.recencyFactor.toFixed(3)} (timing relevance)`,
    `Composite Priority: ${recommendation.compositePriority.toFixed(3)} (final score)`
  ];

  if (recommendation.duplicateCount && recommendation.duplicateCount > 1) {
    breakdown.push(`Grouped: ${recommendation.duplicateCount} similar recommendations`);
  }

  return {
    breakdown,
    finalScore: recommendation.compositePriority
  };
}