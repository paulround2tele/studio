/**
 * Enhanced Recommendation Attribution Service (Phase 9)
 * Tracks upstream signals (anomalies, cohort shifts, quality flags) that influence recommendations
 */

import { telemetryService } from './telemetryService';

/**
 * Signal types that can influence recommendations
 */
export type InfluenceSignalType = 
  | 'anomaly_detection'
  | 'cohort_shift'
  | 'data_quality_flag'
  | 'stream_quality_degradation'
  | 'model_drift'
  | 'seasonal_pattern'
  | 'threshold_breach'
  | 'performance_regression';

/**
 * Upstream signal that influenced a recommendation
 */
export interface InfluenceSignal {
  id: string;
  type: InfluenceSignalType;
  source: string; // Which service/component generated the signal
  timestamp: string;
  confidence: number; // 0-1
  magnitude: number; // 0-1, strength of the signal
  metadata: Record<string, unknown>; // Signal-specific data
  description: string;
}

/**
 * Attribution link between signal and recommendation
 */
export interface AttributionLink {
  signalId: string;
  recommendationId: string;
  influenceWeight: number; // 0-1, how much this signal influenced the recommendation
  causalPathLength: number; // degrees of separation in causal chain
  correlationScore: number; // temporal/contextual correlation
  contributionType: 'primary' | 'secondary' | 'contextual';
}

/**
 * Recommendation with full attribution
 */
export interface AttributedRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number; // Overall recommendation confidence
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Attribution information
  influencingSignals: InfluenceSignal[];
  attributionLinks: AttributionLink[];
  
  // Attribution scores
  attributionScores: {
    signalDiversity: number; // 0-1, variety of signal types
    signalAlignment: number; // 0-1, how well signals align
    temporalCoherence: number; // 0-1, temporal clustering of signals
    causalStrength: number; // 0-1, strength of causal relationships
    overallAttribution: number; // 0-1, combined attribution confidence
  };
  
  // Metadata
  generatedAt: string;
  attributionVersion: string;
}

/**
 * Signal source registration
 */
interface SignalSource {
  id: string;
  name: string;
  signalTypes: InfluenceSignalType[];
  reliability: number; // 0-1, historical reliability of signals from this source
  latency: number; // typical signal generation latency in ms
  enabled: boolean;
}

/**
 * Attribution configuration
 */
interface AttributionConfig {
  maxSignalAge: number; // ms, how far back to look for influencing signals
  minInfluenceThreshold: number; // 0-1, minimum influence weight to consider
  causalPathMaxLength: number; // maximum degrees of separation to consider
  temporalWindowMs: number; // ms, temporal window for signal correlation
  signalTypeWeights: Record<InfluenceSignalType, number>; // relative importance of signal types
}

/**
 * Enhanced recommendation attribution service
 */
class RecommendationAttributionService {
  private signals = new Map<string, InfluenceSignal>();
  private attributedRecommendations = new Map<string, AttributedRecommendation>();
  private signalSources = new Map<string, SignalSource>();
  private attributionLinks: AttributionLink[] = [];

  private config: AttributionConfig = {
    maxSignalAge: 60 * 60 * 1000, // 1 hour
    minInfluenceThreshold: 0.1,
    causalPathMaxLength: 3,
    temporalWindowMs: 15 * 60 * 1000, // 15 minutes
    signalTypeWeights: {
      anomaly_detection: 1.0,
      data_quality_flag: 0.9,
      cohort_shift: 0.8,
      stream_quality_degradation: 0.7,
      model_drift: 0.8,
      seasonal_pattern: 0.6,
      threshold_breach: 0.9,
      performance_regression: 0.8,
    },
  };

  constructor() {
    this.initializeDefaultSources();
  }

  /**
   * Register a signal source
   */
  registerSignalSource(source: SignalSource): void {
    this.signalSources.set(source.id, source);
    
    telemetryService.emitTelemetry('recommendation_attribution', {
      action: 'source_registered',
      sourceId: source.id,
      signalTypes: source.signalTypes,
    });
  }

  /**
   * Record an influence signal
   */
  recordSignal(signal: InfluenceSignal): void {
    // Validate signal
    if (!this.validateSignal(signal)) {
      console.warn('[RecommendationAttributionService] Invalid signal:', signal);
      return;
    }

    // Store signal
    this.signals.set(signal.id, {
      ...signal,
      timestamp: signal.timestamp || new Date().toISOString(),
    });

    // Clean up old signals
    this.cleanupOldSignals();

    telemetryService.emitTelemetry('recommendation_attribution', {
      action: 'signal_recorded',
      signalType: signal.type,
      confidence: signal.confidence,
      magnitude: signal.magnitude,
    });
  }

  /**
   * Generate attributed recommendation
   */
  generateAttributedRecommendation(
    baseRecommendation: {
      id: string;
      type: string;
      title: string;
      description: string;
      confidence: number;
      priority: 'low' | 'medium' | 'high' | 'critical';
    },
    context?: {
      campaignId?: string;
      metricKey?: string;
      timeRange?: { start: string; end: string };
    }
  ): AttributedRecommendation {
    const startTime = Date.now();

    // Find relevant signals
    const relevantSignals = this.findRelevantSignals(context);

    // Calculate attribution links
    const attributionLinks = this.calculateAttributionLinks(
      baseRecommendation.id,
      relevantSignals
    );

    // Filter significant links
    const significantLinks = attributionLinks.filter(
      link => link.influenceWeight >= this.config.minInfluenceThreshold
    );

    // Get influencing signals
    const influencingSignals = significantLinks.map(link => 
      this.signals.get(link.signalId)!
    ).filter(Boolean);

    // Calculate attribution scores
    const attributionScores = this.calculateAttributionScores(
      influencingSignals,
      significantLinks
    );

    // Adjust recommendation confidence based on attribution
    const adjustedConfidence = this.adjustConfidenceBasedOnAttribution(
      baseRecommendation.confidence,
      attributionScores
    );

    const attributedRecommendation: AttributedRecommendation = {
      ...baseRecommendation,
      confidence: adjustedConfidence,
      influencingSignals,
      attributionLinks: significantLinks,
      attributionScores,
      generatedAt: new Date().toISOString(),
      attributionVersion: '1.0',
    };

    // Store for later retrieval
    this.attributedRecommendations.set(baseRecommendation.id, attributedRecommendation);

    telemetryService.emitTelemetry('recommendation_attribution', {
      action: 'recommendation_attributed',
      recommendationId: baseRecommendation.id,
      signalCount: influencingSignals.length,
      attributionScore: attributionScores.overallAttribution,
      timingMs: Date.now() - startTime,
    });

    return attributedRecommendation;
  }

  /**
   * Get attribution for existing recommendation
   */
  getRecommendationAttribution(recommendationId: string): AttributedRecommendation | undefined {
    return this.attributedRecommendations.get(recommendationId);
  }

  /**
   * Get signals by type and time range
   */
  getSignals(
    types?: InfluenceSignalType[],
    timeRange?: { start: string; end: string }
  ): InfluenceSignal[] {
    const allSignals = Array.from(this.signals.values());
    
    let filteredSignals = allSignals;

    if (types && types.length > 0) {
      filteredSignals = filteredSignals.filter(signal => types.includes(signal.type));
    }

    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      
      filteredSignals = filteredSignals.filter(signal => {
        const signalTime = new Date(signal.timestamp).getTime();
        return signalTime >= startTime && signalTime <= endTime;
      });
    }

    return filteredSignals.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get attribution analytics
   */
  getAttributionAnalytics(): {
    totalSignals: number;
    totalRecommendations: number;
    signalTypeDistribution: Record<InfluenceSignalType, number>;
    averageAttributionScore: number;
    topInfluenceTypes: Array<{ type: InfluenceSignalType; weight: number }>;
  } {
    const signals = Array.from(this.signals.values());
    const recommendations = Array.from(this.attributedRecommendations.values());

    // Signal type distribution
    const signalTypeDistribution = {} as Record<InfluenceSignalType, number>;
    for (const signal of signals) {
      signalTypeDistribution[signal.type] = (signalTypeDistribution[signal.type] || 0) + 1;
    }

    // Average attribution score
    const avgAttributionScore = recommendations.length > 0
      ? recommendations.reduce((sum, rec) => sum + rec.attributionScores.overallAttribution, 0) / recommendations.length
      : 0;

    // Top influence types by weight
    const influenceWeights = new Map<InfluenceSignalType, number>();
    for (const rec of recommendations) {
      for (const link of rec.attributionLinks) {
        const signal = this.signals.get(link.signalId);
        if (signal) {
          const currentWeight = influenceWeights.get(signal.type) || 0;
          influenceWeights.set(signal.type, currentWeight + link.influenceWeight);
        }
      }
    }

    const topInfluenceTypes = Array.from(influenceWeights.entries())
      .map(([type, weight]) => ({ type, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    return {
      totalSignals: signals.length,
      totalRecommendations: recommendations.length,
      signalTypeDistribution,
      averageAttributionScore: avgAttributionScore,
      topInfluenceTypes,
    };
  }

  /**
   * Initialize default signal sources
   */
  private initializeDefaultSources(): void {
    const defaultSources: SignalSource[] = [
      {
        id: 'anomaly_detector',
        name: 'Anomaly Detection Service',
        signalTypes: ['anomaly_detection', 'threshold_breach'],
        reliability: 0.85,
        latency: 5000,
        enabled: true,
      },
      {
        id: 'data_quality_monitor',
        name: 'Data Quality Monitor',
        signalTypes: ['data_quality_flag'],
        reliability: 0.90,
        latency: 2000,
        enabled: true,
      },
      {
        id: 'cohort_analyzer',
        name: 'Cohort Analysis Service',
        signalTypes: ['cohort_shift'],
        reliability: 0.80,
        latency: 10000,
        enabled: true,
      },
      {
        id: 'stream_monitor',
        name: 'Stream Quality Monitor',
        signalTypes: ['stream_quality_degradation'],
        reliability: 0.88,
        latency: 3000,
        enabled: true,
      },
      {
        id: 'model_monitor',
        name: 'Model Performance Monitor',
        signalTypes: ['model_drift', 'performance_regression'],
        reliability: 0.82,
        latency: 15000,
        enabled: true,
      },
    ];

    for (const source of defaultSources) {
      this.signalSources.set(source.id, source);
    }
  }

  /**
   * Validate signal structure
   */
  private validateSignal(signal: InfluenceSignal): boolean {
    return !!(
      signal.id &&
      signal.type &&
      signal.source &&
      typeof signal.confidence === 'number' &&
      signal.confidence >= 0 && signal.confidence <= 1 &&
      typeof signal.magnitude === 'number' &&
      signal.magnitude >= 0 && signal.magnitude <= 1 &&
      signal.description
    );
  }

  /**
   * Find signals relevant to a recommendation context
   */
  private findRelevantSignals(context?: {
    campaignId?: string;
    metricKey?: string;
    timeRange?: { start: string; end: string };
  }): InfluenceSignal[] {
    const now = Date.now();
    const maxAge = this.config.maxSignalAge;
    
    const allSignals = Array.from(this.signals.values());
    
    // Filter by age
    const recentSignals = allSignals.filter(signal => {
      const signalAge = now - new Date(signal.timestamp).getTime();
      return signalAge <= maxAge;
    });

    // Filter by context if provided
    let relevantSignals = recentSignals;
    
    if (context?.timeRange) {
      const startTime = new Date(context.timeRange.start).getTime();
      const endTime = new Date(context.timeRange.end).getTime();
      
      relevantSignals = relevantSignals.filter(signal => {
        const signalTime = new Date(signal.timestamp).getTime();
        return signalTime >= startTime && signalTime <= endTime;
      });
    }

    if (context?.campaignId) {
      relevantSignals = relevantSignals.filter(signal => 
        signal.metadata.campaignId === context.campaignId
      );
    }

    if (context?.metricKey) {
      relevantSignals = relevantSignals.filter(signal => {
        if (signal.metadata.metricKey === context.metricKey) {
          return true;
        }

        const affectedMetrics = signal.metadata.affectedMetrics;
        if (Array.isArray(affectedMetrics)) {
          return affectedMetrics.includes(context.metricKey as string);
        }

        return false;
      });
    }

    return relevantSignals;
  }

  /**
   * Calculate attribution links between signals and recommendation
   */
  private calculateAttributionLinks(
    recommendationId: string,
    signals: InfluenceSignal[]
  ): AttributionLink[] {
    const links: AttributionLink[] = [];
    
    for (const signal of signals) {
      // Calculate influence weight based on multiple factors
      const influenceWeight = this.calculateInfluenceWeight(signal);
      
      // Calculate correlation score (simplified)
      const correlationScore = this.calculateCorrelationScore(signal);
      
      // Determine contribution type
      const contributionType = this.determineContributionType(influenceWeight, correlationScore);
      
      links.push({
        signalId: signal.id,
        recommendationId,
        influenceWeight,
        causalPathLength: 1, // Simplified - would be calculated from actual causal chains
        correlationScore,
        contributionType,
      });
    }

    return links.sort((a, b) => b.influenceWeight - a.influenceWeight);
  }

  /**
   * Calculate influence weight for a signal
   */
  private calculateInfluenceWeight(signal: InfluenceSignal): number {
    const typeWeight = this.config.signalTypeWeights[signal.type] || 0.5;
    const ageWeight = this.calculateAgeWeight(signal.timestamp);
    const reliabilityWeight = this.getSourceReliability(signal.source);
    
    return (
      signal.confidence * 0.4 +
      signal.magnitude * 0.3 +
      typeWeight * 0.15 +
      ageWeight * 0.1 +
      reliabilityWeight * 0.05
    );
  }

  /**
   * Calculate age-based weight (more recent signals have higher weight)
   */
  private calculateAgeWeight(timestamp: string): number {
    const now = Date.now();
    const signalTime = new Date(timestamp).getTime();
    const age = now - signalTime;
    const maxAge = this.config.maxSignalAge;
    
    return Math.max(0, 1 - (age / maxAge));
  }

  /**
   * Get source reliability
   */
  private getSourceReliability(sourceId: string): number {
    const source = this.signalSources.get(sourceId);
    return source?.reliability || 0.5;
  }

  /**
   * Calculate correlation score (simplified implementation)
   */
  private calculateCorrelationScore(signal: InfluenceSignal): number {
    // In a real implementation, this would analyze temporal patterns,
    // contextual similarity, and causal relationships
    return signal.confidence * signal.magnitude;
  }

  /**
   * Determine contribution type based on weights
   */
  private determineContributionType(
    influenceWeight: number,
    correlationScore: number
  ): 'primary' | 'secondary' | 'contextual' {
    if (influenceWeight > 0.7 && correlationScore > 0.6) return 'primary';
    if (influenceWeight > 0.4 && correlationScore > 0.3) return 'secondary';
    return 'contextual';
  }

  /**
   * Calculate attribution scores
   */
  private calculateAttributionScores(
    signals: InfluenceSignal[],
    links: AttributionLink[]
  ): AttributedRecommendation['attributionScores'] {
    if (signals.length === 0) {
      return {
        signalDiversity: 0,
        signalAlignment: 0,
        temporalCoherence: 0,
        causalStrength: 0,
        overallAttribution: 0,
      };
    }

    // Signal diversity: variety of signal types
    const uniqueTypes = new Set(signals.map(s => s.type));
    const signalDiversity = Math.min(1, uniqueTypes.size / 5); // Normalize to max 5 types

    // Signal alignment: how well signals point in the same direction
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const confidenceVariance = signals.reduce((sum, s) => 
      sum + Math.pow(s.confidence - avgConfidence, 2), 0
    ) / signals.length;
    const signalAlignment = Math.max(0, 1 - confidenceVariance);

    // Temporal coherence: how clustered signals are in time
    const timestamps = signals.map(s => new Date(s.timestamp).getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const temporalCoherence = Math.max(0, 1 - (timeSpan / this.config.temporalWindowMs));

    // Causal strength: average influence weight
    const causalStrength = links.reduce((sum, l) => sum + l.influenceWeight, 0) / links.length;

    // Overall attribution: weighted combination
    const overallAttribution = (
      signalDiversity * 0.2 +
      signalAlignment * 0.25 +
      temporalCoherence * 0.2 +
      causalStrength * 0.35
    );

    return {
      signalDiversity,
      signalAlignment,
      temporalCoherence,
      causalStrength,
      overallAttribution,
    };
  }

  /**
   * Adjust recommendation confidence based on attribution
   */
  private adjustConfidenceBasedOnAttribution(
    baseConfidence: number,
    attributionScores: AttributedRecommendation['attributionScores']
  ): number {
    // If we have strong attribution, boost confidence
    // If attribution is weak, reduce confidence
    const attributionBoost = (attributionScores.overallAttribution - 0.5) * 0.2;
    return Math.max(0, Math.min(1, baseConfidence + attributionBoost));
  }

  /**
   * Clean up old signals
   */
  private cleanupOldSignals(): void {
    const now = Date.now();
    const maxAge = this.config.maxSignalAge;
    
    const signalEntries = Array.from(this.signals.entries());
    for (const [signalId, signal] of signalEntries) {
      const age = now - new Date(signal.timestamp).getTime();
      if (age > maxAge) {
        this.signals.delete(signalId);
      }
    }
  }

  /**
   * Clear all attribution data (for testing)
   */
  clearAll(): void {
    this.signals.clear();
    this.attributedRecommendations.clear();
    this.attributionLinks = [];
  }
}

// Export singleton instance
export const recommendationAttributionService = new RecommendationAttributionService();