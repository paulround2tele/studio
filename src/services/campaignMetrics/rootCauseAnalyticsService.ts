/**
 * Root-Cause Analytics Service (Phase 9)
 * Structured causal decomposition for metric anomalies and degradation drivers
 */

import { telemetryService } from './telemetryService';

// Typed evidence item replacing previous implicit any[] usage
export interface RootCauseEvidenceItem {
  metric: string;
  value: number;
  baseline: number;
  deviation: number;
}

function normalizeEvidenceEntry(e: unknown): RootCauseEvidenceItem {
  if (!e || typeof e !== 'object') {
    return { metric: 'unknown', value: 0, baseline: 0, deviation: 0 };
  }
  const obj = e as Record<string, unknown>;
  const metric = typeof obj.metric === 'string'
    ? obj.metric
    : typeof obj.type === 'string'
      ? obj.type
      : 'unknown';
  const value = typeof obj.value === 'number' ? obj.value : Number(obj.value) || 0;
  const baseline = typeof obj.baseline === 'number' ? obj.baseline : Number(obj.baseline) || 0;
  const deviation = typeof obj.deviation === 'number' ? obj.deviation : Number(obj.deviation) || (value - baseline);
  return { metric, value, baseline, deviation };
}
// Simple AggregateSnapshot interface for Phase 9 compatibility
interface AggregateSnapshot {
  id: string;
  timestamp: string;
  aggregates: {
    totalDomains: number;
    successRate: number;
    avgLeadScore: number;
    dnsSuccessRate: number;
    httpSuccessRate: number;
  };
  classifiedCounts: Record<string, number>;
  forecast?: {
    value: number;
    lower: number;
    upper: number;
    isForecast: boolean;
  };
}

/**
 * Causal factor types
 */
export type CausalFactorType = 
  | 'data_quality' 
  | 'external_dependency' 
  | 'configuration_change' 
  | 'traffic_pattern' 
  | 'system_resource' 
  | 'model_drift' 
  | 'seasonal_effect'
  | 'unknown';

/**
 * Contributing factor with confidence and evidence
 */
export interface ContributingFactor {
  id: string;
  type: CausalFactorType;
  description: string;
  confidence: number; // 0-1
  impact: number; // 0-1, relative contribution to anomaly
  timeRange: {
    start: string;
    end: string;
  };
  evidence: Array<{
    metric: string;
    value: number;
    baseline: number;
    deviation: number;
  }>;
  correlationScore: number; // temporal correlation with anomaly
}

/**
 * Intervention recommendation
 */
export interface InterventionRecommendation {
  id: string;
  factorId: string;
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  description: string;
  estimatedImpact: number; // 0-1
  estimatedEffort: number; // 0-1
  confidence: number; // 0-1
  prerequisites?: string[];
}

/**
 * Causal chain representing sequence of events
 */
export interface CausalChain {
  id: string;
  anomalyId: string;
  factors: ContributingFactor[];
  chronologicalOrder: string[]; // factor IDs in temporal order
  primaryFactor?: string; // most likely root cause factor ID
  interventions: InterventionRecommendation[];
  confidence: number; // overall chain confidence
  generatedAt: string;
  lastUpdated: string;
}

/**
 * Anomaly context for root cause analysis
 */
export interface AnomalyContext {
  anomalyId: string;
  metricKey: string;
  campaignId: string;
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  anomalyValue: number;
  baselineValue: number;
  deviation: number;
  affectedTimeRange: {
    start: string;
    end: string;
  };
  snapshots: AggregateSnapshot[];
}

/**
 * Temporal correlation result
 */
interface TemporalCorrelation {
  metricA: string;
  metricB: string;
  correlation: number;
  lag: number; // time lag in milliseconds
  confidence: number;
}

/**
 * Root-cause analytics service class
 */
class RootCauseAnalyticsService {
  private causalChains = new Map<string, CausalChain>();
  private factorTemplates = new Map<CausalFactorType, Record<string, unknown>>();

  constructor() {
    this.initializeFactorTemplates();
  }

  /**
   * Perform root cause analysis for an anomaly
   */
  async analyzeRootCause(context: AnomalyContext): Promise<CausalChain> {
    const startTime = Date.now();

    // Step 1: Identify potential contributing factors
    const factors = await this.identifyContributingFactors(context);

    // Step 2: Calculate temporal correlations
    const correlations = this.calculateTemporalCorrelations(context, factors);

    // Step 3: Build causal chain with chronological ordering
    const causalChain = this.buildCausalChain(context, factors, correlations);

    // Step 4: Generate intervention recommendations
    const interventions = this.generateInterventions(causalChain);
    causalChain.interventions = interventions;

    // Store the analysis result
    this.causalChains.set(context.anomalyId, causalChain);

    telemetryService.emitTelemetry('root_cause_analysis_completed', {
      anomalyId: context.anomalyId,
      factorCount: factors.length,
      interventionCount: interventions.length,
      confidence: causalChain.confidence,
      timingMs: Date.now() - startTime,
    });

    return causalChain;
  }

  /**
   * Identify potential contributing factors for an anomaly
   */
  private async identifyContributingFactors(context: AnomalyContext): Promise<ContributingFactor[]> {
    const factors: ContributingFactor[] = [];
    const { snapshots, anomalyValue, baselineValue, affectedTimeRange } = context;

    // Analyze data quality factors
    const dataQualityFactors = this.analyzeDataQualityFactors(context);
    factors.push(...dataQualityFactors);

    // Analyze traffic pattern changes
    const trafficFactors = this.analyzeTrafficPatterns(snapshots, affectedTimeRange);
    factors.push(...trafficFactors);

    // Analyze system resource factors
    const resourceFactors = this.analyzeSystemResources(snapshots, affectedTimeRange);
    factors.push(...resourceFactors);

    // Analyze model drift factors
    const modelFactors = this.analyzeModelDrift(context);
    factors.push(...modelFactors);

    // Analyze seasonal effects
    const seasonalFactors = this.analyzeSeasonalEffects(context);
    factors.push(...seasonalFactors);

    // Score and filter factors by relevance
    return this.scoreAndFilterFactors(factors, context);
  }

  /**
   * Analyze data quality related factors
   */
  private analyzeDataQualityFactors(context: AnomalyContext): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const { snapshots, affectedTimeRange } = context;

    // Check for data completeness issues
    const incompleteness = this.detectDataIncompleteness(snapshots, affectedTimeRange);
    if (incompleteness.score > 0.3) {
      factors.push({
        id: `data_completeness_${Date.now()}`,
        type: 'data_quality',
        description: 'Data completeness degradation detected',
        confidence: incompleteness.score,
        impact: this.estimateImpact(incompleteness.score, 'data_quality'),
        timeRange: affectedTimeRange,
        evidence: (incompleteness.evidence || []).map(normalizeEvidenceEntry),
        correlationScore: 0, // Will be calculated later
      });
    }

    // Check for data accuracy issues
    const accuracy = this.detectDataAccuracy(snapshots, affectedTimeRange);
    if (accuracy.score > 0.3) {
      factors.push({
        id: `data_accuracy_${Date.now()}`,
        type: 'data_quality',
        description: 'Data accuracy issues detected',
        confidence: accuracy.score,
        impact: this.estimateImpact(accuracy.score, 'data_quality'),
        timeRange: affectedTimeRange,
        evidence: (accuracy.evidence || []).map(normalizeEvidenceEntry),
        correlationScore: 0,
      });
    }

    return factors;
  }

  /**
   * Analyze traffic pattern changes
   */
  private analyzeTrafficPatterns(
    snapshots: AggregateSnapshot[], 
    timeRange: { start: string; end: string }
  ): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    // Analyze volume changes
    const volumeChange = this.detectVolumeChanges(snapshots, timeRange);
    if (volumeChange.significance > 0.3) {
      factors.push({
        id: `traffic_volume_${Date.now()}`,
        type: 'traffic_pattern',
        description: `Traffic volume ${volumeChange.direction} detected`,
        confidence: volumeChange.significance,
        impact: this.estimateImpact(volumeChange.significance, 'traffic_pattern'),
        timeRange,
        evidence: volumeChange.evidence,
        correlationScore: 0,
      });
    }

    // Analyze pattern changes (e.g., success rate patterns)
    const patternChange = this.detectPatternChanges(snapshots, timeRange);
    if (patternChange.significance > 0.3) {
      factors.push({
        id: `traffic_pattern_${Date.now()}`,
        type: 'traffic_pattern',
        description: 'Traffic pattern anomaly detected',
        confidence: patternChange.significance,
        impact: this.estimateImpact(patternChange.significance, 'traffic_pattern'),
        timeRange,
        evidence: patternChange.evidence,
        correlationScore: 0,
      });
    }

    return factors;
  }

  /**
   * Analyze system resource factors
   */
  private analyzeSystemResources(
    snapshots: AggregateSnapshot[],
    timeRange: { start: string; end: string }
  ): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    // Check for resource constraint indicators
    const resourceStress = this.detectResourceStress(snapshots, timeRange);
    if (resourceStress.score > 0.3) {
      factors.push({
        id: `resource_stress_${Date.now()}`,
        type: 'system_resource',
        description: 'System resource stress detected',
        confidence: resourceStress.score,
        impact: this.estimateImpact(resourceStress.score, 'system_resource'),
        timeRange,
        evidence: resourceStress.evidence,
        correlationScore: 0,
      });
    }

    return factors;
  }

  /**
   * Analyze model drift factors
   */
  private analyzeModelDrift(context: AnomalyContext): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    // Simple heuristic for model drift based on consistent bias
    const drift = this.detectModelDrift(context);
    if (drift.score > 0.3) {
      factors.push({
        id: `model_drift_${Date.now()}`,
        type: 'model_drift',
        description: 'Model drift detected - predictions consistently biased',
        confidence: drift.score,
        impact: this.estimateImpact(drift.score, 'model_drift'),
        timeRange: context.affectedTimeRange,
        evidence: drift.evidence,
        correlationScore: 0,
      });
    }

    return factors;
  }

  /**
   * Analyze seasonal effects
   */
  private analyzeSeasonalEffects(context: AnomalyContext): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    const seasonal = this.detectSeasonalEffects(context);
    if (seasonal.score > 0.3) {
      factors.push({
        id: `seasonal_${Date.now()}`,
        type: 'seasonal_effect',
        description: 'Seasonal pattern deviation detected',
        confidence: seasonal.score,
        impact: this.estimateImpact(seasonal.score, 'seasonal_effect'),
        timeRange: context.affectedTimeRange,
        evidence: seasonal.evidence,
        correlationScore: 0,
      });
    }

    return factors;
  }

  /**
   * Calculate temporal correlations between factors and anomaly
   */
  private calculateTemporalCorrelations(
    context: AnomalyContext,
    factors: ContributingFactor[]
  ): TemporalCorrelation[] {
    const correlations: TemporalCorrelation[] = [];

    for (const factor of factors) {
      // Calculate correlation between factor evidence and anomaly timeline
      const correlation = this.calculateFactorCorrelation(context, factor);
      
      // Update factor's correlation score
      factor.correlationScore = Math.abs(correlation.correlation);

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Build causal chain with chronological ordering
   */
  private buildCausalChain(
    context: AnomalyContext,
    factors: ContributingFactor[],
    correlations: TemporalCorrelation[]
  ): CausalChain {
    // Sort factors by their time of first impact and correlation strength
    const sortedFactors = factors.sort((a, b) => {
      const timeA = new Date(a.timeRange.start).getTime();
      const timeB = new Date(b.timeRange.start).getTime();
      
      // Primary sort by time, secondary by correlation score
      if (Math.abs(timeA - timeB) < 60000) { // Within 1 minute
        return b.correlationScore - a.correlationScore;
      }
      
      return timeA - timeB;
    });

    // Identify primary factor (highest impact * confidence * correlation)
    let primaryFactor: string | undefined;
    let maxScore = 0;

    for (const factor of sortedFactors) {
      const score = factor.impact * factor.confidence * factor.correlationScore;
      if (score > maxScore) {
        maxScore = score;
        primaryFactor = factor.id;
      }
    }

    // Calculate overall chain confidence
    const chainConfidence = this.calculateChainConfidence(sortedFactors, correlations);

    const causalChain: CausalChain = {
      id: `chain_${context.anomalyId}_${Date.now()}`,
      anomalyId: context.anomalyId,
      factors: sortedFactors,
      chronologicalOrder: sortedFactors.map(f => f.id),
      primaryFactor,
      interventions: [], // Will be populated by generateInterventions
      confidence: chainConfidence,
      generatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    return causalChain;
  }

  /**
   * Generate intervention recommendations based on causal chain
   */
  private generateInterventions(causalChain: CausalChain): InterventionRecommendation[] {
    const interventions: InterventionRecommendation[] = [];

    for (const factor of causalChain.factors) {
      const template = this.factorTemplates.get(factor.type);
      if (!template) continue;

      // Generate interventions based on factor type and severity
      const factorInterventions = this.generateFactorInterventions(factor, template);
      interventions.push(...factorInterventions);
    }

    // Sort by priority and estimated impact
    return interventions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.estimatedImpact - a.estimatedImpact;
    });
  }

  /**
   * Helper methods for factor detection
   */
  private detectDataIncompleteness(
    snapshots: AggregateSnapshot[],
    timeRange: { start: string; end: string }
  ): { score: number; evidence: Record<string, unknown>[] } {
    // Simplified implementation - check for missing data points
    const expectedPoints = this.calculateExpectedDataPoints(timeRange);
    const actualPoints = snapshots.filter(s => 
      s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
    ).length;

    const completeness = actualPoints / expectedPoints;
    const score = 1 - completeness;

    return {
      score,
      evidence: [{
        metric: 'data_completeness',
        value: completeness,
        baseline: 1.0,
        deviation: score,
      }],
    };
  }

  private detectDataAccuracy(
    snapshots: AggregateSnapshot[],
    timeRange: { start: string; end: string }
  ): { score: number; evidence: Record<string, unknown>[] } {
    // Simplified implementation - check for outliers and inconsistencies
    const relevantSnapshots = snapshots.filter(s => 
      s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
    );

    let outlierCount = 0;
    const values = relevantSnapshots.map(s => s.aggregates.avgLeadScore);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    for (const value of values) {
      if (Math.abs(value - mean) > 3 * stdDev) {
        outlierCount++;
      }
    }

    const outlierRate = outlierCount / values.length;

    return {
      score: outlierRate,
      evidence: [{
        metric: 'outlier_rate',
        value: outlierRate,
        baseline: 0.05, // 5% expected outlier rate
        deviation: Math.max(0, outlierRate - 0.05),
      }],
    };
  }

  private detectVolumeChanges(
    snapshots: AggregateSnapshot[],
    timeRange: { start: string; end: string }
  ): { significance: number; direction: string; evidence: RootCauseEvidenceItem[] } {
    // Simplified volume change detection
    const relevantSnapshots = snapshots.filter(s => 
      s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
    );

    const currentAvg = relevantSnapshots.reduce((sum, s) => sum + s.aggregates.totalDomains, 0) / relevantSnapshots.length;
    
    // Compare with historical baseline (simplified)
    const historicalBaseline = 1000; // Would be calculated from historical data
    const change = (currentAvg - historicalBaseline) / historicalBaseline;
    
    return {
      significance: Math.abs(change),
      direction: change > 0 ? 'increase' : 'decrease',
      evidence: [{
        metric: 'volume_change',
        value: currentAvg,
        baseline: historicalBaseline,
        deviation: change,
      }],
    };
  }

  private detectPatternChanges(
    snapshots: AggregateSnapshot[],
    timeRange: { start: string; end: string }
  ): { significance: number; evidence: RootCauseEvidenceItem[] } {
    // Simplified pattern change detection
    const relevantSnapshots = snapshots.filter(s => 
      s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
    );

    const successRates = relevantSnapshots.map(s => s.aggregates.successRate);
    const avgSuccessRate = successRates.reduce((sum, r) => sum + r, 0) / successRates.length;
    
    // Compare with expected baseline
    const expectedSuccessRate = 0.95;
    const deviation = Math.abs(avgSuccessRate - expectedSuccessRate);

    return {
      significance: deviation,
      evidence: [{
        metric: 'success_rate_deviation',
        value: avgSuccessRate,
        baseline: expectedSuccessRate,
        deviation,
      }],
    };
  }

  private detectResourceStress(
    snapshots: AggregateSnapshot[],
    timeRange: { start: string; end: string }
  ): { score: number; evidence: RootCauseEvidenceItem[] } {
    // Simplified resource stress detection based on DNS/HTTP success rates
    const relevantSnapshots = snapshots.filter(s => 
      s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
    );

    const dnsSuccessRate = relevantSnapshots.reduce((sum, s) => sum + s.aggregates.dnsSuccessRate, 0) / relevantSnapshots.length;
    const httpSuccessRate = relevantSnapshots.reduce((sum, s) => sum + s.aggregates.httpSuccessRate, 0) / relevantSnapshots.length;

    const minExpected = 0.95;
    const dnsStress = Math.max(0, minExpected - dnsSuccessRate);
    const httpStress = Math.max(0, minExpected - httpSuccessRate);
    
    const overallStress = Math.max(dnsStress, httpStress);

    return {
      score: overallStress,
      evidence: [
        {
          metric: 'dns_success_rate',
          value: dnsSuccessRate,
          baseline: minExpected,
          deviation: dnsStress,
        },
        {
          metric: 'http_success_rate',
          value: httpSuccessRate,
          baseline: minExpected,
          deviation: httpStress,
        },
      ],
    };
  }

  private detectModelDrift(context: AnomalyContext): { score: number; evidence: RootCauseEvidenceItem[] } {
    // Simplified model drift detection - would need actual prediction history
    const deviationMagnitude = Math.abs(context.deviation) / context.baselineValue;
    
    // If deviation is consistently in one direction and significant, it might be drift
    const driftScore = deviationMagnitude > 0.2 ? deviationMagnitude : 0;

    return {
      score: driftScore,
      evidence: [{
        metric: 'prediction_bias',
        value: context.anomalyValue,
        baseline: context.baselineValue,
        deviation: context.deviation,
      }],
    };
  }

  private detectSeasonalEffects(context: AnomalyContext): { score: number; evidence: RootCauseEvidenceItem[] } {
    // Simplified seasonal detection based on time patterns
    const anomalyTime = new Date(context.detectedAt);
    const hour = anomalyTime.getHours();
    const day = anomalyTime.getDay();

    // Check if anomaly occurs during typical low-activity periods
    const isOffHours = hour < 6 || hour > 22;
    const isWeekend = day === 0 || day === 6;

    const seasonalScore = (isOffHours || isWeekend) ? 0.4 : 0.1;

    return {
      score: seasonalScore,
      evidence: [{
        metric: 'temporal_pattern',
        value: hour,
        baseline: 14, // 2 PM as typical peak
        deviation: Math.abs(hour - 14) / 12,
      }],
    };
  }

  private calculateFactorCorrelation(
    context: AnomalyContext,
    factor: ContributingFactor
  ): TemporalCorrelation {
    // Simplified correlation calculation
    // In a real implementation, this would use actual time series correlation
    
    const overlapScore = this.calculateTimeOverlap(context.affectedTimeRange, factor.timeRange);
    const impactAlignment = factor.impact * factor.confidence;
    
    const correlation = overlapScore * impactAlignment;

    return {
      metricA: context.metricKey,
      metricB: factor.type,
      correlation,
      lag: 0, // Simplified - no lag calculation
      confidence: factor.confidence,
    };
  }

  private calculateTimeOverlap(
    rangeA: { start: string; end: string },
    rangeB: { start: string; end: string }
  ): number {
    const startA = new Date(rangeA.start).getTime();
    const endA = new Date(rangeA.end).getTime();
    const startB = new Date(rangeB.start).getTime();
    const endB = new Date(rangeB.end).getTime();

    const overlapStart = Math.max(startA, startB);
    const overlapEnd = Math.min(endA, endB);

    if (overlapStart >= overlapEnd) return 0;

    const overlapDuration = overlapEnd - overlapStart;
    const maxDuration = Math.max(endA - startA, endB - startB);

    return overlapDuration / maxDuration;
  }

  private calculateChainConfidence(
    factors: ContributingFactor[],
    correlations: TemporalCorrelation[]
  ): number {
    if (factors.length === 0) return 0;

    const avgConfidence = factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length;
    const avgCorrelation = correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlations.length;

    // Combine factor confidence and temporal correlation
    return (avgConfidence * 0.6) + (avgCorrelation * 0.4);
  }

  private estimateImpact(score: number, factorType: CausalFactorType): number {
    // Simple impact estimation based on factor type and severity
    const typeWeights: Record<CausalFactorType, number> = {
      data_quality: 0.8,
      external_dependency: 0.9,
      configuration_change: 0.95,
      traffic_pattern: 0.7,
      system_resource: 0.85,
      model_drift: 0.6,
      seasonal_effect: 0.4,
      unknown: 0.3,
    };

    return Math.min(1.0, score * (typeWeights[factorType] || 0.5));
  }

  private scoreAndFilterFactors(
    factors: ContributingFactor[],
    context: AnomalyContext
  ): ContributingFactor[] {
    // Filter out low-confidence factors and sort by relevance
    return factors
      .filter(f => f.confidence > 0.2)
      .sort((a, b) => (b.confidence * b.impact) - (a.confidence * a.impact))
      .slice(0, 10); // Keep top 10 factors
  }

  private generateFactorInterventions(
    factor: ContributingFactor,
    template: unknown
  ): InterventionRecommendation[] {
    const interventions: InterventionRecommendation[] = [];

    // Generate interventions based on factor type
    switch (factor.type) {
      case 'data_quality':
        interventions.push({
          id: `intervention_${factor.id}_data_validation`,
          factorId: factor.id,
          type: 'immediate',
          priority: 'high',
          action: 'Implement data validation checks',
          description: 'Add real-time data quality monitoring and validation',
          estimatedImpact: 0.8,
          estimatedEffort: 0.6,
          confidence: 0.7,
        });
        break;

      case 'system_resource':
        interventions.push({
          id: `intervention_${factor.id}_scale_resources`,
          factorId: factor.id,
          type: 'immediate',
          priority: 'critical',
          action: 'Scale system resources',
          description: 'Increase system capacity or optimize resource usage',
          estimatedImpact: 0.9,
          estimatedEffort: 0.4,
          confidence: 0.8,
        });
        break;

      case 'model_drift':
        interventions.push({
          id: `intervention_${factor.id}_retrain_model`,
          factorId: factor.id,
          type: 'short_term',
          priority: 'medium',
          action: 'Retrain predictive models',
          description: 'Update models with recent data to reduce drift',
          estimatedImpact: 0.7,
          estimatedEffort: 0.8,
          confidence: 0.6,
        });
        break;

      default:
        interventions.push({
          id: `intervention_${factor.id}_monitor`,
          factorId: factor.id,
          type: 'immediate',
          priority: 'medium',
          action: 'Increase monitoring',
          description: 'Add enhanced monitoring for this factor type',
          estimatedImpact: 0.5,
          estimatedEffort: 0.3,
          confidence: 0.5,
        });
    }

    return interventions;
  }

  private calculateExpectedDataPoints(timeRange: { start: string; end: string }): number {
    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();
    const durationMs = end - start;
    
    // Assume one data point every 5 minutes
    return Math.ceil(durationMs / (5 * 60 * 1000));
  }

  private initializeFactorTemplates(): void {
    // Initialize templates for different factor types
    this.factorTemplates.set('data_quality', {
      interventions: ['validation', 'monitoring', 'cleanup'],
      impact_weights: { validation: 0.8, monitoring: 0.6, cleanup: 0.7 },
    });

    this.factorTemplates.set('system_resource', {
      interventions: ['scaling', 'optimization', 'migration'],
      impact_weights: { scaling: 0.9, optimization: 0.7, migration: 0.8 },
    });

    this.factorTemplates.set('model_drift', {
      interventions: ['retraining', 'feature_update', 'architecture_change'],
      impact_weights: { retraining: 0.7, feature_update: 0.6, architecture_change: 0.8 },
    });
  }

  /**
   * Get causal chain for an anomaly
   */
  getCausalChain(anomalyId: string): CausalChain | undefined {
    return this.causalChains.get(anomalyId);
  }

  /**
   * Get all causal chains
   */
  getAllCausalChains(): CausalChain[] {
    return Array.from(this.causalChains.values());
  }

  /**
   * Clear analysis history (useful for testing)
   */
  clearAnalysisHistory(): void {
    this.causalChains.clear();
  }
}

// Export singleton instance
export const rootCauseAnalyticsService = new RootCauseAnalyticsService();