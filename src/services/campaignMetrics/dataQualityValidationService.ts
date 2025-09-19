/**
 * Data Quality Validation Service (Phase 8)
 * Enhanced validation with out-of-order deltas, negative derivatives, and stagnation detection
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';
import { telemetryService } from './telemetryService';

// Feature flag for enhanced data quality validation
const isEnhancedValidationEnabled = () => 
  process.env.NEXT_PUBLIC_ENHANCED_DATA_VALIDATION !== 'false';

/**
 * Data quality flags
 */
export type DataQualityFlag = 
  | 'out_of_order' 
  | 'negative_derivative' 
  | 'stagnation' 
  | 'low_variance'
  | 'spike_anomaly'
  | 'missing_data'
  | 'inconsistent_units';

/**
 * Data quality issue
 */
export interface DataQualityIssue {
  flag: DataQualityFlag;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedMetrics: string[];
  affectedTimeRange: {
    start: string;
    end: string;
  };
  detectedAt: string;
  value?: number;
  expectedValue?: number;
  suggestion?: string;
}

/**
 * Data quality validation result
 */
export interface DataQualityValidationResult {
  campaignId: string;
  validatedAt: string;
  overallScore: number; // 0-100
  issues: DataQualityIssue[];
  metrics: {
    totalSnapshots: number;
    validSnapshots: number;
    flaggedSnapshots: number;
    timeSpanDays: number;
    avgInterval: number; // Average time between snapshots in hours
  };
  recommendations: Array<{
    type: 'immediate' | 'monitoring' | 'investigation';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  // Out-of-order detection
  maxTimeSkewSeconds: number;
  
  // Derivative detection
  negativeDerivativeThreshold: number; // Minimum decrease to flag
  allowNegativeMetrics: string[]; // Metrics that can naturally decrease
  
  // Stagnation detection  
  stagnationThreshold: number; // Hours of no change to flag stagnation
  stagnationTolerancePercent: number; // Percentage change tolerance
  
  // Variance detection
  lowVarianceWindow: number; // Number of snapshots to analyze
  lowVarianceThreshold: number; // Coefficient of variation threshold
  
  // Spike detection
  spikeZScoreThreshold: number; // Z-score threshold for spike detection
  spikeWindowSize: number; // Number of points to use for baseline
  
  // Telemetry sampling
  telemetrySamplingRate: number; // 0-1, how often to emit telemetry
  telemetryThrottleWindowMs: number; // Min time between telemetry for same campaign
}

/**
 * Data quality validation service
 */
class DataQualityValidationService {
  private config: ValidationConfig;
  private telemetryThrottle = new Map<string, number>();

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Validate data quality for a campaign's snapshots
   */
  validateCampaignData(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityValidationResult {
    if (!isEnhancedValidationEnabled()) {
      return this.createBasicValidationResult(campaignId, snapshots);
    }

    const startTime = Date.now();
    const issues: DataQualityIssue[] = [];

    // Sort snapshots by timestamp to ensure chronological order
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 1. Check for out-of-order snapshots in original array
    const outOfOrderIssues = this.detectOutOfOrderSnapshots(campaignId, snapshots);
    issues.push(...outOfOrderIssues);

    // 2. Check for negative derivatives
    const negativeDerivativeIssues = this.detectNegativeDerivatives(campaignId, sortedSnapshots);
    issues.push(...negativeDerivativeIssues);

    // 3. Check for stagnation
    const stagnationIssues = this.detectStagnation(campaignId, sortedSnapshots);
    issues.push(...stagnationIssues);

    // 4. Check for low variance (flatline detection)
    const lowVarianceIssues = this.detectLowVariance(campaignId, sortedSnapshots);
    issues.push(...lowVarianceIssues);

    // 5. Check for spikes/anomalies
    const spikeIssues = this.detectSpikes(campaignId, sortedSnapshots);
    issues.push(...spikeIssues);

    // 6. Check for missing data patterns
    const missingDataIssues = this.detectMissingData(campaignId, sortedSnapshots);
    issues.push(...missingDataIssues);

    // Calculate overall quality score
    const overallScore = this.calculateQualityScore(issues, sortedSnapshots.length);

    // Generate metrics
    const metrics = this.calculateValidationMetrics(sortedSnapshots, issues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, metrics);

    // Emit telemetry (throttled)
    this.emitValidationTelemetry(campaignId, issues, metrics);

    const result: DataQualityValidationResult = {
      campaignId,
      validatedAt: new Date().toISOString(),
      overallScore,
      issues,
      metrics,
      recommendations
    };

    console.log(`[DataQualityValidation] Validated ${campaignId}: ${overallScore}/100 (${issues.length} issues, ${Date.now() - startTime}ms)`);

    return result;
  }

  /**
   * Detect out-of-order snapshots
   */
  private detectOutOfOrderSnapshots(
    campaignId: string, 
    snapshots: AggregateSnapshot[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const current = snapshots[i];
      const previous = snapshots[i - 1];
      
      if (!current || !previous) continue;
      
      const currentTime = new Date(current.timestamp).getTime();
      const previousTime = new Date(previous.timestamp).getTime();
      
      if (currentTime < previousTime) {
        const skewSeconds = (previousTime - currentTime) / 1000;
        
        if (skewSeconds > this.config.maxTimeSkewSeconds) {
          issues.push({
            flag: 'out_of_order',
            severity: skewSeconds > 300 ? 'high' : 'medium', // 5+ minutes is high severity
            description: `Snapshot at index ${i} is ${skewSeconds.toFixed(1)}s older than previous snapshot`,
            affectedMetrics: ['timestamp'],
            affectedTimeRange: {
              start: snapshots[i]?.timestamp,
              end: snapshots[i - 1]?.timestamp
            },
            detectedAt: new Date().toISOString(),
            value: currentTime,
            expectedValue: previousTime,
            suggestion: 'Check data ingestion pipeline for timestamp consistency'
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Detect negative derivatives in metrics that should only increase
   */
  private detectNegativeDerivatives(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    
    if (snapshots.length < 2) return issues;

    // Metrics that should generally only increase or stay stable
    const increasingMetrics = ['totalDomains'];
    
    for (let i = 1; i < snapshots.length; i++) {
      const current = snapshots[i].aggregates;
      const previous = snapshots[i - 1].aggregates;
      
      increasingMetrics.forEach(metric => {
        const currentValue = current[metric as keyof typeof current] as number;
        const previousValue = previous[metric as keyof typeof previous] as number;
        
        if (typeof currentValue === 'number' && typeof previousValue === 'number') {
          const decrease = previousValue - currentValue;
          
          if (decrease > this.config.negativeDerivativeThreshold) {
            issues.push({
              flag: 'negative_derivative',
              severity: decrease > previousValue * 0.1 ? 'high' : 'medium', // >10% decrease is high
              description: `${metric} decreased by ${decrease.toFixed(2)} (${((decrease / previousValue) * 100).toFixed(1)}%)`,
              affectedMetrics: [metric],
              affectedTimeRange: {
                start: snapshots[i - 1].timestamp,
                end: snapshots[i].timestamp
              },
              detectedAt: new Date().toISOString(),
              value: currentValue,
              expectedValue: previousValue,
              suggestion: 'Investigate potential data loss or measurement issues'
            });
          }
        }
      });
    }
    
    return issues;
  }

  /**
   * Detect stagnation (no meaningful change over time)
   */
  private detectStagnation(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    
    if (snapshots.length < 3) return issues;

    // Metrics to check for stagnation
    const dynamicMetrics = ['avgLeadScore', 'successRate', 'totalDomains'];
    
    dynamicMetrics.forEach(metric => {
      let stagnationStart: number | null = null;
      let stagnationValue: number | null = null;
      
      for (let i = 1; i < snapshots.length; i++) {
        const currentAgg = snapshots[i].aggregates;
        const previousAgg = snapshots[i - 1].aggregates;
        const current = currentAgg[metric as keyof typeof currentAgg] as number;
        const previous = previousAgg[metric as keyof typeof previousAgg] as number;
        
        if (typeof current === 'number' && typeof previous === 'number') {
          const changePercent = previous > 0 ? Math.abs((current - previous) / previous) * 100 : 0;
          
          if (changePercent <= this.config.stagnationTolerancePercent) {
            // Value is stagnant
            if (stagnationStart === null) {
              stagnationStart = i - 1;
              stagnationValue = previous;
            }
          } else {
            // Value changed significantly, check if we had a stagnation period
            if (stagnationStart !== null) {
              const stagnationDuration = this.calculateHoursBetween(
                snapshots[stagnationStart].timestamp,
                snapshots[i - 1].timestamp
              );
              
              if (stagnationDuration >= this.config.stagnationThreshold) {
                issues.push({
                  flag: 'stagnation',
                  severity: stagnationDuration > 24 ? 'high' : 'medium',
                  description: `${metric} remained unchanged at ${stagnationValue?.toFixed(2)} for ${stagnationDuration.toFixed(1)} hours`,
                  affectedMetrics: [metric],
                  affectedTimeRange: {
                    start: snapshots[stagnationStart].timestamp,
                    end: snapshots[i - 1].timestamp
                  },
                  detectedAt: new Date().toISOString(),
                  value: stagnationValue!,
                  suggestion: 'Verify data pipeline is updating correctly and metric is being calculated'
                });
              }
              
              stagnationStart = null;
              stagnationValue = null;
            }
          }
        }
      }
      
      // Check for stagnation that continues to the end
      if (stagnationStart !== null) {
        const stagnationDuration = this.calculateHoursBetween(
          snapshots[stagnationStart].timestamp,
          snapshots[snapshots.length - 1].timestamp
        );
        
        if (stagnationDuration >= this.config.stagnationThreshold) {
          issues.push({
            flag: 'stagnation',
            severity: 'high',
            description: `${metric} has been stagnant at ${stagnationValue?.toFixed(2)} for ${stagnationDuration.toFixed(1)} hours (ongoing)`,
            affectedMetrics: [metric],
            affectedTimeRange: {
              start: snapshots[stagnationStart].timestamp,
              end: snapshots[snapshots.length - 1].timestamp
            },
            detectedAt: new Date().toISOString(),
            value: stagnationValue!,
            suggestion: 'Data may not be updating - check pipeline and data sources'
          });
        }
      }
    });
    
    return issues;
  }

  /**
   * Detect low variance (flatline risk)
   */
  private detectLowVariance(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    
    if (snapshots.length < this.config.lowVarianceWindow) return issues;

    const variableMetrics = ['avgLeadScore', 'successRate'];
    
    variableMetrics.forEach(metric => {
      // Use sliding window to detect low variance periods
      for (let start = 0; start <= snapshots.length - this.config.lowVarianceWindow; start++) {
        const window = snapshots.slice(start, start + this.config.lowVarianceWindow);
        const values = window.map(s => s.aggregates[metric as keyof typeof s.aggregates] as number)
          .filter(v => typeof v === 'number' && !isNaN(v));
        
        if (values.length >= 3) {
          const coefficientOfVariation = this.calculateCoefficientOfVariation(values);
          
          if (coefficientOfVariation < this.config.lowVarianceThreshold) {
            issues.push({
              flag: 'low_variance',
              severity: 'low',
              description: `${metric} shows very low variance (CV=${coefficientOfVariation.toFixed(3)}) over ${this.config.lowVarianceWindow} snapshots`,
              affectedMetrics: [metric],
              affectedTimeRange: {
                start: window[0].timestamp,
                end: window[window.length - 1].timestamp
              },
              detectedAt: new Date().toISOString(),
              suggestion: 'Low variance may indicate measurement issues or genuine stability'
            });
            break; // Only report once per metric
          }
        }
      }
    });
    
    return issues;
  }

  /**
   * Detect unusual spikes in metrics
   */
  private detectSpikes(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    
    if (snapshots.length < this.config.spikeWindowSize + 1) return issues;

    const spikeMetrics = ['avgLeadScore', 'successRate', 'totalDomains'];
    
    spikeMetrics.forEach(metric => {
      for (let i = this.config.spikeWindowSize; i < snapshots.length; i++) {
        const currentAgg = snapshots[i].aggregates;
        const currentValue = currentAgg[metric as keyof typeof currentAgg] as number;
        
        if (typeof currentValue === 'number') {
          // Calculate baseline from previous N points
          const baselineValues = snapshots
            .slice(i - this.config.spikeWindowSize, i)
            .map(s => s.aggregates[metric as keyof typeof s.aggregates] as number)
            .filter(v => typeof v === 'number' && !isNaN(v));
          
          if (baselineValues.length >= 3) {
            const zScore = this.calculateZScore(currentValue, baselineValues);
            
            if (Math.abs(zScore) > this.config.spikeZScoreThreshold) {
              issues.push({
                flag: 'spike_anomaly',
                severity: Math.abs(zScore) > 5 ? 'high' : 'medium',
                description: `${metric} shows unusual ${zScore > 0 ? 'spike' : 'drop'} (z-score: ${zScore.toFixed(2)})`,
                affectedMetrics: [metric],
                affectedTimeRange: {
                  start: snapshots[i].timestamp,
                  end: snapshots[i].timestamp
                },
                detectedAt: new Date().toISOString(),
                value: currentValue,
                expectedValue: this.calculateMean(baselineValues),
                suggestion: 'Investigate potential data anomaly or external factors'
              });
            }
          }
        }
      }
    });
    
    return issues;
  }

  /**
   * Detect missing data patterns
   */
  private detectMissingData(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    
    if (snapshots.length < 2) return issues;

    // Check for large gaps in timestamp sequence
    for (let i = 1; i < snapshots.length; i++) {
      const currentTime = new Date(snapshots[i].timestamp).getTime();
      const previousTime = new Date(snapshots[i - 1].timestamp).getTime();
      const gapHours = (currentTime - previousTime) / (1000 * 60 * 60);
      
      // If gap is more than 4 hours (assuming regular updates), flag as missing data
      if (gapHours > 4) {
        issues.push({
          flag: 'missing_data',
          severity: gapHours > 24 ? 'high' : 'medium',
          description: `${gapHours.toFixed(1)} hour gap in data between snapshots`,
          affectedMetrics: ['timestamp'],
          affectedTimeRange: {
            start: snapshots[i - 1].timestamp,
            end: snapshots[i].timestamp
          },
          detectedAt: new Date().toISOString(),
          suggestion: 'Check data collection pipeline for interruptions'
        });
      }
    }
    
    return issues;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(issues: DataQualityIssue[], snapshotCount: number): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });
    
    // Bonus for having sufficient data
    if (snapshotCount >= 10) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate validation metrics
   */
  private calculateValidationMetrics(
    snapshots: AggregateSnapshot[],
    issues: DataQualityIssue[]
  ): DataQualityValidationResult['metrics'] {
    const flaggedSnapshots = new Set<string>();
    
    issues.forEach(issue => {
      // Mark snapshots in affected time range as flagged
      snapshots.forEach(snapshot => {
        const snapTime = new Date(snapshot.timestamp).getTime();
        const startTime = new Date(issue.affectedTimeRange.start).getTime();
        const endTime = new Date(issue.affectedTimeRange.end).getTime();
        
        if (snapTime >= startTime && snapTime <= endTime) {
          flaggedSnapshots.add(snapshot.timestamp);
        }
      });
    });

    const timeSpan = snapshots.length > 1 
      ? (new Date(snapshots[snapshots.length - 1].timestamp).getTime() - 
         new Date(snapshots[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    const avgInterval = snapshots.length > 1
      ? timeSpan * 24 / (snapshots.length - 1) // Average hours between snapshots
      : 0;

    return {
      totalSnapshots: snapshots.length,
      validSnapshots: snapshots.length - flaggedSnapshots.size,
      flaggedSnapshots: flaggedSnapshots.size,
      timeSpanDays: timeSpan,
      avgInterval
    };
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(
    issues: DataQualityIssue[],
    metrics: DataQualityValidationResult['metrics']
  ): DataQualityValidationResult['recommendations'] {
    const recommendations: DataQualityValidationResult['recommendations'] = [];
    
    // Group issues by flag type
    const issuesByFlag = issues.reduce((acc, issue) => {
      if (!acc[issue.flag]) acc[issue.flag] = [];
      acc[issue.flag].push(issue);
      return acc;
    }, {} as Record<DataQualityFlag, DataQualityIssue[]>);

    // Generate recommendations based on issue patterns
    if (issuesByFlag.out_of_order?.length > 0) {
      recommendations.push({
        type: 'immediate',
        title: 'Fix Timestamp Ordering Issues',
        description: 'Multiple out-of-order timestamps detected. Check data ingestion pipeline.',
        impact: 'high'
      });
    }

    if (issuesByFlag.stagnation?.length > 0) {
      recommendations.push({
        type: 'investigation',
        title: 'Investigate Data Stagnation',
        description: 'Some metrics show periods of no change. Verify data collection is active.',
        impact: 'medium'
      });
    }

    if (issuesByFlag.spike_anomaly?.length > 2) {
      recommendations.push({
        type: 'monitoring',
        title: 'Monitor for Data Quality Issues',
        description: 'Multiple anomalies detected. Consider implementing automated quality checks.',
        impact: 'medium'
      });
    }

    if (metrics.avgInterval > 6) { // More than 6 hours between updates
      recommendations.push({
        type: 'monitoring',
        title: 'Increase Data Collection Frequency',
        description: 'Long intervals between data points may miss important changes.',
        impact: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Emit validation telemetry (throttled)
   */
  private emitValidationTelemetry(
    campaignId: string,
    issues: DataQualityIssue[],
    metrics: DataQualityValidationResult['metrics']
  ): void {
    const now = Date.now();
    const lastEmission = this.telemetryThrottle.get(campaignId) || 0;
    
    if (now - lastEmission < this.config.telemetryThrottleWindowMs) {
      return; // Throttled
    }

    if (Math.random() > this.config.telemetrySamplingRate) {
      return; // Sampled out
    }

    const flags = Array.from(new Set(issues.map(i => i.flag)));
    const affectedMetrics = Array.from(new Set(issues.flatMap(i => i.affectedMetrics)));

    telemetryService.emitTelemetry('data_quality_flag', {
      campaignId,
      flags,
      affectedMetrics
    });

    this.telemetryThrottle.set(campaignId, now);
  }

  /**
   * Utility methods
   */
  private calculateHoursBetween(startTime: string, endTime: string): number {
    return (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
  }

  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = this.calculateMean(values);
    if (mean === 0) return 0;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / mean;
  }

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateZScore(value: number, baseline: number[]): number {
    const mean = this.calculateMean(baseline);
    const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (value - mean) / stdDev : 0;
  }

  private createBasicValidationResult(
    campaignId: string,
    snapshots: AggregateSnapshot[]
  ): DataQualityValidationResult {
    return {
      campaignId,
      validatedAt: new Date().toISOString(),
      overallScore: 100,
      issues: [],
      metrics: {
        totalSnapshots: snapshots.length,
        validSnapshots: snapshots.length,
        flaggedSnapshots: 0,
        timeSpanDays: 0,
        avgInterval: 0
      },
      recommendations: []
    };
  }

  private getDefaultConfig(): ValidationConfig {
    return {
      maxTimeSkewSeconds: 60,
      negativeDerivativeThreshold: 1,
      allowNegativeMetrics: [],
      stagnationThreshold: 2, // 2 hours
      stagnationTolerancePercent: 0.1, // 0.1%
      lowVarianceWindow: 10,
      lowVarianceThreshold: 0.01,
      spikeZScoreThreshold: 3,
      spikeWindowSize: 5,
      telemetrySamplingRate: 0.1, // 10% sampling
      telemetryThrottleWindowMs: 300000 // 5 minutes
    };
  }
}

// Export singleton instance
export const dataQualityValidationService = new DataQualityValidationService();

/**
 * Validate campaign data quality (convenience function)
 */
export function validateCampaignDataQuality(
  campaignId: string,
  snapshots: AggregateSnapshot[]
): DataQualityValidationResult {
  return dataQualityValidationService.validateCampaignData(campaignId, snapshots);
}

/**
 * Check if enhanced data quality validation is available
 */
export function isEnhancedDataQualityValidationAvailable(): boolean {
  return isEnhancedValidationEnabled();
}