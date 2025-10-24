/**
 * ML Recommendations Service (Phase 6)
 * Server-supplied ML ranking/recommendations with fallback to local pipeline
 */

import { Recommendation } from '@/types/campaignMetrics';

// Feature flag
const isMLRecommendationsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ML_RECOMMENDATIONS !== 'false';

/**
 * Server ML recommendation object
 */
export interface MLRecommendation {
  id: string;
  title: string;
  severity: 'info' | 'warn' | 'action';
  score: number; // ML confidence score 0-1
  features: string[]; // Contributing features/factors
  modelVersion: string;
  detail: string;
  explainability?: {
    primary_factors: string[];
    confidence: number;
    model_reasoning: string;
  };
}

/**
 * Server ML recommendations response
 */
export interface MLRecommendationsResponse {
  modelVersion: string;
  generatedAt: string;
  recommendations: MLRecommendation[];
  totalRecommendations: number;
  confidence: number; // Overall model confidence
}

/**
 * Adapted recommendation for local system compatibility
 */
export interface AdaptedMLRecommendation extends Recommendation {
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
 * Version mismatch tracking
 */
interface ModelVersionCache {
  lastModelVersion: string | null;
  lastChecked: number;
}

let versionCache: ModelVersionCache = {
  lastModelVersion: null,
  lastChecked: 0
};

/**
 * Fetch ML recommendations from server
 */
export async function fetchMLRecommendations(
  campaignId: string
): Promise<MLRecommendationsResponse> {
  if (!isMLRecommendationsEnabled()) {
    throw new Error('ML recommendations feature is disabled via configuration. Enable NEXT_PUBLIC_ENABLE_ML_RECOMMENDATIONS to use this feature.');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('API URL not configured');
  }

  try {
    const response = await fetch(`${apiUrl}/campaigns/${campaignId}/recommendations/ml`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        throw new Error('ML recommendations not available');
      }
      throw new Error(`ML recommendations fetch failed: ${response.status}`);
    }

    const mlResponse: MLRecommendationsResponse = await response.json();
    
    // Validate response structure
    if (!validateMLResponse(mlResponse)) {
      throw new Error('Invalid ML recommendations response structure');
    }

    // Check for model version changes
    checkModelVersionMismatch(mlResponse.modelVersion);

    return mlResponse;
  } catch (error) {
    console.warn('[MLRecommendationsService] Fetch failed:', error);
    throw error;
  }
}

/**
 * Validate ML recommendations response structure
 */
function validateMLResponse(data: unknown): data is MLRecommendationsResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.modelVersion !== 'string') return false;
  if (typeof d.generatedAt !== 'string') return false;
  if (typeof d.totalRecommendations !== 'number') return false;
  if (typeof d.confidence !== 'number') return false;
  if (!Array.isArray(d.recommendations)) return false;
  return d.recommendations.every(r => validateMLRecommendation(r));
}

/**
 * Validate individual ML recommendation
 */
function validateMLRecommendation(rec: unknown): rec is MLRecommendation {
  if (!rec || typeof rec !== 'object') return false;
  const r = rec as Record<string, unknown>;
  if (typeof r.id !== 'string') return false;
  if (typeof r.title !== 'string') return false;
  if (typeof r.detail !== 'string') return false;
  if (typeof r.severity !== 'string' || !['info','warn','action'].includes(r.severity)) return false;
  if (typeof r.score !== 'number' || r.score < 0 || r.score > 1) return false;
  if (!Array.isArray(r.features) || !r.features.every(f=> typeof f === 'string')) return false;
  if (typeof r.modelVersion !== 'string') return false;
  if (r.explainability) {
    const e = r.explainability as unknown;
    if (!e || typeof e !== 'object') {
      return false;
    }
    const explainability = e as {
      primary_factors?: unknown;
      confidence?: unknown;
      model_reasoning?: unknown;
    };
    if (!Array.isArray(explainability.primary_factors)) return false;
    if (typeof explainability.confidence !== 'number') return false;
    if (typeof explainability.model_reasoning !== 'string') return false;
  }
  return true;
}

/**
 * Check for model version mismatch and emit telemetry
 */
function checkModelVersionMismatch(currentVersion: string): void {
  const now = Date.now();
  
  if (versionCache.lastModelVersion && versionCache.lastModelVersion !== currentVersion) {
    // Emit telemetry event for version mismatch
    emitMLVersionMismatchTelemetry(versionCache.lastModelVersion, currentVersion);
  }
  
  versionCache.lastModelVersion = currentVersion;
  versionCache.lastChecked = now;
}

/**
 * Emit ML version mismatch telemetry event
 */
function emitMLVersionMismatchTelemetry(cachedVersion: string, serverVersion: string): void {
  // Import telemetry service if available
  try {
    const telemetryEvent = {
      event: 'ml_version_mismatch',
      timestamp: new Date().toISOString(),
      data: {
        serverVersion,
        cachedVersion,
        campaignId: 'current' // This would be passed from context
      }
    };

    // This would use the actual telemetry service
    console.info('[MLRecommendationsService] Version mismatch detected:', telemetryEvent);
    
    // TODO: Integrate with actual telemetry service
    // telemetryService.emit(telemetryEvent);
  } catch (error) {
    console.warn('[MLRecommendationsService] Telemetry emission failed:', error);
  }
}

/**
 * Adapt ML recommendations to local recommendation format
 */
export function adaptMLRecommendations(
  mlResponse: MLRecommendationsResponse
): AdaptedMLRecommendation[] {
  return mlResponse.recommendations.map(mlRec => {
    // Generate rationale from ML features and explainability
    const rationale = generateRationaleFromML(mlRec);

    const adapted: AdaptedMLRecommendation = {
      id: mlRec.id,
      title: mlRec.title,
      detail: mlRec.detail,
      severity: mlRec.severity,
      rationale,
      mlScore: mlRec.score,
      modelVersion: mlRec.modelVersion,
      features: mlRec.features,
      isMLGenerated: true,
      explainability: mlRec.explainability
    };

    return adapted;
  });
}

/**
 * Generate rationale text from ML features and explainability
 */
function generateRationaleFromML(mlRec: MLRecommendation): string {
  if (mlRec.explainability) {
    const confidence = Math.round(mlRec.explainability.confidence * 100);
    const primaryFactors = mlRec.explainability.primary_factors.slice(0, 3).join(', ');
    return `ML analysis (${confidence}% confidence) identified key factors: ${primaryFactors}. ${mlRec.explainability.model_reasoning}`;
  }
  
  // Fallback to feature-based rationale
  if (mlRec.features.length > 0) {
    const topFeatures = mlRec.features.slice(0, 3).join(', ');
    const confidence = Math.round(mlRec.score * 100);
    return `ML recommendation based on analysis of: ${topFeatures} (confidence: ${confidence}%)`;
  }
  
  // Basic fallback
  return `ML-generated recommendation with ${Math.round(mlRec.score * 100)}% confidence`;
}

/**
 * Sort ML recommendations by score and severity
 */
export function sortMLRecommendations(
  recommendations: AdaptedMLRecommendation[]
): AdaptedMLRecommendation[] {
  const severityWeight = {
    action: 3,
    warn: 2,
    info: 1
  };

  return [...recommendations].sort((a, b) => {
    // Primary sort: severity weight
    const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Secondary sort: ML score
    return b.mlScore - a.mlScore;
  });
}

/**
 * Filter ML recommendations by minimum confidence threshold
 */
export function filterMLRecommendationsByConfidence(
  recommendations: AdaptedMLRecommendation[],
  minConfidence: number = 0.3
): AdaptedMLRecommendation[] {
  return recommendations.filter(rec => rec.mlScore >= minConfidence);
}

/**
 * Merge ML recommendations with local pipeline recommendations
 * ML recommendations take precedence, local fill gaps
 */
export function mergeMLWithLocalRecommendations(
  mlRecommendations: AdaptedMLRecommendation[],
  localRecommendations: Recommendation[],
  maxTotal: number = 10
): Recommendation[] {
  const merged: Recommendation[] = [];
  
  // Add ML recommendations first (up to 70% of total)
  const maxMLRecommendations = Math.ceil(maxTotal * 0.7);
  const sortedML = sortMLRecommendations(mlRecommendations);
  merged.push(...sortedML.slice(0, maxMLRecommendations));
  
  // Fill remaining slots with local recommendations that don't duplicate ML ones
  const mlTitles = new Set(merged.map(rec => rec.title.toLowerCase()));
  const remainingSlots = maxTotal - merged.length;
  
  if (remainingSlots > 0) {
    const nonDuplicateLocal = localRecommendations.filter(local => 
      !mlTitles.has(local.title.toLowerCase())
    );
    
    merged.push(...nonDuplicateLocal.slice(0, remainingSlots));
  }
  
  return merged;
}

/**
 * Get cached model version info
 */
export function getCachedModelVersion(): {
  version: string | null;
  lastChecked: number;
} {
  return {
    version: versionCache.lastModelVersion,
    lastChecked: versionCache.lastChecked
  };
}

/**
 * Clear model version cache
 */
export function clearModelVersionCache(): void {
  versionCache = {
    lastModelVersion: null,
    lastChecked: 0
  };
}

/**
 * Create mock ML recommendations for testing
 */
export function createMockMLRecommendations(campaignId: string): MLRecommendationsResponse {
  return {
    modelVersion: 'mock-ml-v2.1.0',
    generatedAt: new Date().toISOString(),
    totalRecommendations: 3,
    confidence: 0.87,
    recommendations: [
      {
        id: `ml-rec-1-${campaignId}`,
        title: 'Optimize High-Value Domain Targeting',
        detail: 'ML analysis suggests focusing on domains with lead scores >75 could improve conversion by 23%',
        severity: 'action',
        score: 0.92,
        features: ['lead_score_distribution', 'conversion_patterns', 'domain_quality_signals'],
        modelVersion: 'mock-ml-v2.1.0',
        explainability: {
          primary_factors: ['Lead score concentration', 'Quality signal correlation', 'Historical conversion data'],
          confidence: 0.92,
          model_reasoning: 'Decision tree analysis shows strong correlation between lead scores >75 and conversion outcomes'
        }
      },
      {
        id: `ml-rec-2-${campaignId}`,
        title: 'DNS Performance Impact Detected',
        detail: 'DNS resolution delays are affecting 18% of domains and correlating with lower lead scores',
        severity: 'warn',
        score: 0.78,
        features: ['dns_latency_patterns', 'score_correlation', 'infrastructure_signals'],
        modelVersion: 'mock-ml-v2.1.0',
        explainability: {
          primary_factors: ['DNS latency variance', 'Score degradation correlation', 'Geographic distribution'],
          confidence: 0.78,
          model_reasoning: 'Random forest model identified DNS performance as significant predictor of lead quality'
        }
      },
      {
        id: `ml-rec-3-${campaignId}`,
        title: 'Keyword Coverage Opportunity',
        detail: 'Expanding keyword coverage in underperforming segments could yield 15% improvement',
        severity: 'info',
        score: 0.65,
        features: ['keyword_gaps', 'segment_performance', 'competitive_analysis'],
        modelVersion: 'mock-ml-v2.1.0',
        explainability: {
          primary_factors: ['Keyword density gaps', 'Competitor analysis', 'Performance variance'],
          confidence: 0.65,
          model_reasoning: 'Clustering analysis revealed untapped keyword opportunities in medium-performing segments'
        }
      }
    ]
  };
}

/**
 * Check if ML recommendations features are available
 */
export function isMLRecommendationsAvailable(): boolean {
  return isMLRecommendationsEnabled();
}