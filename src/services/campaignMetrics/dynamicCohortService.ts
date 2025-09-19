/**
 * Dynamic Cohort Segmentation Service (Phase 8)
 * Extends Phase 6 cohort service with adaptive/dynamic segmentation capabilities
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';
import { telemetryService } from './telemetryService';

// Feature flag for dynamic cohort segmentation
const isDynamicCohortSegmentationEnabled = () => 
  process.env.NEXT_PUBLIC_DYNAMIC_COHORT_SEGMENTATION !== 'false';

/**
 * Campaign metadata for cohort segmentation
 */
export interface CampaignMetadata {
  id: string;
  name: string;
  createdAt: string;
  launchDate?: string;
  snapshots: AggregateSnapshot[];
  tags?: string[];
  category?: string;
}

/**
 * Cohort segmentation modes
 */
export type CohortSegmentationMode = 'launchWindow' | 'performanceTier';

/**
 * Launch window cohort configuration
 */
export interface LaunchWindowCohortConfig {
  windowSize: 'week' | 'month' | 'quarter';
  includePreLaunch?: boolean;
  maxWindows?: number;
}

/**
 * Performance tier cohort configuration
 */
export interface PerformanceTierCohortConfig {
  metric: 'avgLeadScore' | 'successRate' | 'totalDomains';
  tiers: number; // Number of performance tiers (2-5)
  method: 'percentile' | 'fixed_thresholds';
  thresholds?: number[]; // For fixed_thresholds method
}

/**
 * Unified cohort configuration
 */
export interface DynamicCohortConfig {
  mode: CohortSegmentationMode;
  launchWindow?: LaunchWindowCohortConfig;
  performanceTier?: PerformanceTierCohortConfig;
}

/**
 * Cohort segment
 */
export interface CohortSegment {
  id: string;
  name: string;
  description: string;
  campaigns: CampaignMetadata[];
  criteria: {
    mode: CohortSegmentationMode;
    parameters: Record<string, any>;
  };
  metrics: {
    totalCampaigns: number;
    avgMetrics: Record<string, number>;
    growthRate?: number;
    retentionRate?: number;
  };
  timeRange?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Cohort comparison result
 */
export interface CohortComparisonResult {
  segments: CohortSegment[];
  insights: {
    topPerformer: string;
    fastestGrowing: string;
    mostStable: string;
    recommendations: Array<{
      type: 'optimization' | 'investigation' | 'replication';
      title: string;
      description: string;
      targetSegments: string[];
    }>;
  };
  generatedAt: string;
  config: DynamicCohortConfig;
}

/**
 * Dynamic cohort segmentation service
 */
class DynamicCohortSegmentationService {
  
  /**
   * Build cohorts based on segmentation mode
   */
  buildCohorts(
    campaigns: CampaignMetadata[],
    config: DynamicCohortConfig
  ): CohortComparisonResult {
    const startTime = Date.now();
    
    if (!isDynamicCohortSegmentationEnabled()) {
      throw new Error('Dynamic cohort segmentation is disabled');
    }

    let segments: CohortSegment[];

    switch (config.mode) {
      case 'launchWindow':
        segments = this.buildLaunchWindowCohorts(campaigns, config.launchWindow!);
        break;
      case 'performanceTier':
        segments = this.buildPerformanceTierCohorts(campaigns, config.performanceTier!);
        break;
      default:
        throw new Error(`Unsupported cohort mode: ${config.mode}`);
    }

    // Generate insights from segments
    const insights = this.generateCohortInsights(segments);

    // Emit telemetry
    telemetryService.emitTelemetry('cohort_segmentation', {
      mode: config.mode,
      cohortCount: segments.length,
      totalCampaigns: campaigns.length,
      segmentationTimeMs: Date.now() - startTime
    });

    return {
      segments,
      insights,
      generatedAt: new Date().toISOString(),
      config
    };
  }

  /**
   * Build cohorts based on launch windows
   */
  private buildLaunchWindowCohorts(
    campaigns: CampaignMetadata[],
    config: LaunchWindowCohortConfig
  ): CohortSegment[] {
    const segments: CohortSegment[] = [];
    
    // Group campaigns by launch window
    const windowGroups = this.groupByLaunchWindow(campaigns, config);
    
    Object.entries(windowGroups).forEach(([windowKey, windowCampaigns]) => {
      const [startDate, endDate] = this.parseWindowKey(windowKey, config.windowSize);
      
      const segment: CohortSegment = {
        id: `launch_window_${windowKey}`,
        name: this.formatWindowName(windowKey, config.windowSize),
        description: `Campaigns launched ${this.formatWindowDescription(windowKey, config.windowSize)}`,
        campaigns: windowCampaigns,
        criteria: {
          mode: 'launchWindow',
          parameters: {
            windowSize: config.windowSize,
            startDate,
            endDate
          }
        },
        metrics: this.calculateSegmentMetrics(windowCampaigns),
        timeRange: { startDate, endDate }
      };
      
      segments.push(segment);
    });

    return segments.sort((a, b) => 
      a.timeRange!.startDate.localeCompare(b.timeRange!.startDate)
    );
  }

  /**
   * Build cohorts based on performance tiers
   */
  private buildPerformanceTierCohorts(
    campaigns: CampaignMetadata[],
    config: PerformanceTierCohortConfig
  ): CohortSegment[] {
    const segments: CohortSegment[] = [];
    
    // Calculate performance scores for all campaigns
    const campaignScores = campaigns.map(campaign => ({
      campaign,
      score: this.calculatePerformanceScore(campaign, config.metric)
    })).filter(item => !isNaN(item.score));

    if (campaignScores.length === 0) {
      return segments;
    }

    // Determine tier boundaries
    const tierBoundaries = config.method === 'fixed_thresholds' 
      ? config.thresholds! 
      : this.calculatePercentileBoundaries(campaignScores.map(c => c.score), config.tiers);

    // Create tier labels
    const tierLabels = this.generateTierLabels(config.tiers, config.metric);

    // Assign campaigns to tiers
    for (let tierIndex = 0; tierIndex < config.tiers; tierIndex++) {
      const lowerBound = tierIndex === 0 ? -Infinity : (tierBoundaries[tierIndex - 1] ?? -Infinity);
      const upperBound = tierIndex === config.tiers - 1 ? Infinity : (tierBoundaries[tierIndex] ?? Infinity);
      
      const tierCampaigns = campaignScores
        .filter(item => item.score > lowerBound && item.score <= upperBound)
        .map(item => item.campaign);

      if (tierCampaigns.length > 0) {
        const segment: CohortSegment = {
          id: `performance_tier_${tierIndex}`,
          name: tierLabels[tierIndex] ?? `Tier ${tierIndex}`,
          description: `Campaigns with ${config.metric} between ${this.formatBound(lowerBound)} and ${this.formatBound(upperBound)}`,
          campaigns: tierCampaigns,
          criteria: {
            mode: 'performanceTier',
            parameters: {
              metric: config.metric,
              tierIndex,
              lowerBound: lowerBound === -Infinity ? null : lowerBound,
              upperBound: upperBound === Infinity ? null : upperBound
            }
          },
          metrics: this.calculateSegmentMetrics(tierCampaigns)
        };
        
        segments.push(segment);
      }
    }

    return segments.sort((a, b) => 
      (b.criteria.parameters.tierIndex || 0) - (a.criteria.parameters.tierIndex || 0)
    );
  }

  /**
   * Group campaigns by launch window
   */
  private groupByLaunchWindow(
    campaigns: CampaignMetadata[],
    config: LaunchWindowCohortConfig
  ): Record<string, CampaignMetadata[]> {
    const groups: Record<string, CampaignMetadata[]> = {};

    campaigns.forEach(campaign => {
      const launchDate = campaign.launchDate || campaign.createdAt;
      const windowKey = this.getWindowKey(launchDate, config.windowSize);
      
      if (!groups[windowKey]) {
        groups[windowKey] = [];
      }
      groups[windowKey].push(campaign);
    });

    // Limit to maxWindows if specified
    if (config.maxWindows) {
      const sortedKeys = Object.keys(groups).sort().slice(-config.maxWindows);
      const limitedGroups: Record<string, CampaignMetadata[]> = {};
      sortedKeys.forEach(key => {
        limitedGroups[key] = groups[key] ?? [];
      });
      return limitedGroups;
    }

    return groups;
  }

  /**
   * Calculate performance score for a campaign
   */
  private calculatePerformanceScore(
    campaign: CampaignMetadata,
    metric: PerformanceTierCohortConfig['metric']
  ): number {
    if (campaign.snapshots.length === 0) {
      return NaN;
    }

    // Use the latest snapshot for scoring
    const latestSnapshot = campaign.snapshots[campaign.snapshots.length - 1];
    
    if (!latestSnapshot) {
      return NaN;
    }
    
    switch (metric) {
      case 'avgLeadScore':
        return latestSnapshot.aggregates.avgLeadScore || 0;
      case 'successRate':
        return latestSnapshot.aggregates.successRate || 0;
      case 'totalDomains':
        return latestSnapshot.aggregates.totalDomains || 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate percentile-based tier boundaries
   */
  private calculatePercentileBoundaries(scores: number[], tiers: number): number[] {
    const sortedScores = [...scores].sort((a, b) => a - b);
    const boundaries: number[] = [];
    
    for (let i = 1; i < tiers; i++) {
      const percentile = i / tiers;
      const index = Math.floor(percentile * sortedScores.length);
      boundaries.push(sortedScores[Math.min(index, sortedScores.length - 1)] ?? 0);
    }
    
    return boundaries;
  }

  /**
   * Generate tier labels based on configuration
   */
  private generateTierLabels(
    tiers: number,
    metric: PerformanceTierCohortConfig['metric']
  ): string[] {
    const labels: string[] = [];
    
    for (let i = 0; i < tiers; i++) {
      if (tiers === 2) {
        labels.push(i === 0 ? 'Low Performance' : 'High Performance');
      } else if (tiers === 3) {
        labels.push(['Low Performance', 'Medium Performance', 'High Performance'][i] ?? `Tier ${i}`);
      } else if (tiers === 4) {
        labels.push(['Bottom Quartile', 'Lower Middle', 'Upper Middle', 'Top Quartile'][i] ?? `Tier ${i}`);
      } else {
        labels.push(`Tier ${i + 1} (${metric})`);
      }
    }
    
    return labels;
  }

  /**
   * Calculate aggregate metrics for a segment
   */
  private calculateSegmentMetrics(campaigns: CampaignMetadata[]): CohortSegment['metrics'] {
    if (campaigns.length === 0) {
      return {
        totalCampaigns: 0,
        avgMetrics: {}
      };
    }

    const aggregates = campaigns.map(campaign => 
      campaign.snapshots[campaign.snapshots.length - 1]?.aggregates
    ).filter(Boolean);

    if (aggregates.length === 0) {
      return {
        totalCampaigns: campaigns.length,
        avgMetrics: {}
      };
    }

    // Calculate averages
    const avgMetrics: Record<string, number> = {};
    const metricKeys = aggregates[0] ? Object.keys(aggregates[0]) : [];
    
    metricKeys.forEach(key => {
      const values = aggregates.filter(agg => agg != null).map(agg => (agg as any)[key] as number).filter(v => typeof v === 'number' && !isNaN(v));
      if (values.length > 0) {
        avgMetrics[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    // Calculate growth rate (simplified - comparing first and last snapshots)
    let growthRate: number | undefined;
    const campaignsWithHistory = campaigns.filter(c => c.snapshots.length >= 2);
    if (campaignsWithHistory.length > 0) {
      const growthRates = campaignsWithHistory.map(campaign => {
        const firstSnapshot = campaign.snapshots[0];
        const lastSnapshot = campaign.snapshots[campaign.snapshots.length - 1];
        
        if (!firstSnapshot || !lastSnapshot) return 0;
        
        const first = firstSnapshot.aggregates.avgLeadScore || 0;
        const last = lastSnapshot.aggregates.avgLeadScore || 0;
        return first > 0 ? ((last - first) / first) * 100 : 0;
      });
      growthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    }

    return {
      totalCampaigns: campaigns.length,
      avgMetrics,
      growthRate
    };
  }

  /**
   * Generate insights from cohort comparison
   */
  private generateCohortInsights(segments: CohortSegment[]): CohortComparisonResult['insights'] {
    if (segments.length === 0) {
      return {
        topPerformer: 'N/A',
        fastestGrowing: 'N/A',
        mostStable: 'N/A',
        recommendations: []
      };
    }

    // Find top performer by average lead score
    const topPerformer = segments.reduce((best, current) => 
      (current.metrics.avgMetrics.avgLeadScore || 0) > (best.metrics.avgMetrics.avgLeadScore || 0) 
        ? current : best
    );

    // Find fastest growing by growth rate
    const fastestGrowing = segments.reduce((best, current) => 
      (current.metrics.growthRate || 0) > (best.metrics.growthRate || 0) 
        ? current : best
    );

    // Find most stable (lowest variance in lead score)
    const mostStable = segments.reduce((best, current) => {
      const currentStability = this.calculateStability(current);
      const bestStability = this.calculateStability(best);
      return currentStability > bestStability ? current : best;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(segments);

    return {
      topPerformer: topPerformer.name,
      fastestGrowing: fastestGrowing.name,
      mostStable: mostStable.name,
      recommendations
    };
  }

  /**
   * Calculate stability score for a segment
   */
  private calculateStability(segment: CohortSegment): number {
    // Simplified stability calculation - in practice would analyze variance over time
    const campaigns = segment.campaigns;
    if (campaigns.length < 2) return 0;

    const leadScores = campaigns.map(c => {
      const latest = c.snapshots[c.snapshots.length - 1];
      return latest?.aggregates.avgLeadScore || 0;
    });

    const mean = leadScores.reduce((sum, score) => sum + score, 0) / leadScores.length;
    const variance = leadScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / leadScores.length;
    
    // Return inverse of coefficient of variation (higher = more stable)
    return mean > 0 ? mean / Math.sqrt(variance) : 0;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(segments: CohortSegment[]): CohortComparisonResult['insights']['recommendations'] {
    const recommendations: CohortComparisonResult['insights']['recommendations'] = [];

    if (segments.length < 2) return recommendations;

    // Compare performance between segments
    const topSegment = segments.reduce((best, current) => 
      (current.metrics.avgMetrics.avgLeadScore || 0) > (best.metrics.avgMetrics.avgLeadScore || 0) 
        ? current : best
    );

    const bottomSegment = segments.reduce((worst, current) => 
      (current.metrics.avgMetrics.avgLeadScore || 0) < (worst.metrics.avgMetrics.avgLeadScore || 0) 
        ? current : worst
    );

    if (topSegment !== bottomSegment) {
      recommendations.push({
        type: 'optimization',
        title: 'Replicate High-Performing Strategies',
        description: `Analyze successful patterns from ${topSegment.name} and apply to ${bottomSegment.name}`,
        targetSegments: [topSegment.id, bottomSegment.id]
      });

      recommendations.push({
        type: 'investigation',
        title: 'Investigate Performance Gaps',
        description: `Significant performance difference detected between cohorts. Investigate operational differences.`,
        targetSegments: [topSegment.id, bottomSegment.id]
      });
    }

    // Check for growth opportunities
    const growingSegments = segments.filter(s => (s.metrics.growthRate || 0) > 5);
    if (growingSegments.length > 0) {
      recommendations.push({
        type: 'replication',
        title: 'Scale Growth Strategies',
        description: `High growth detected in specific cohorts. Consider scaling successful strategies.`,
        targetSegments: growingSegments.map(s => s.id)
      });
    }

    return recommendations;
  }

  /**
   * Utility functions for window management
   */
  private getWindowKey(dateString: string, windowSize: LaunchWindowCohortConfig['windowSize']): string {
    const date = new Date(dateString);
    
    switch (windowSize) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().slice(0, 10);
      
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      
      default:
        return dateString.slice(0, 10);
    }
  }

  private parseWindowKey(windowKey: string, windowSize: LaunchWindowCohortConfig['windowSize']): [string, string] {
    switch (windowSize) {
      case 'week': {
        const startDate = new Date(windowKey);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        return [startDate.toISOString(), endDate.toISOString()];
      }
      
      case 'month': {
        const [year, month] = windowKey.split('-');
        const startDate = new Date(parseInt(year ?? '0'), parseInt(month ?? '0') - 1, 1);
        const endDate = new Date(parseInt(year ?? '0'), parseInt(month ?? '0'), 0);
        return [startDate.toISOString(), endDate.toISOString()];
      }
      
      case 'quarter': {
        const [year, quarterStr] = windowKey.split('-Q');
        const quarter = parseInt(quarterStr ?? '0');
        const startMonth = (quarter - 1) * 3;
        const startDate = new Date(parseInt(year ?? '0'), startMonth, 1);
        const endDate = new Date(parseInt(year ?? '0'), startMonth + 3, 0);
        return [startDate.toISOString(), endDate.toISOString()];
      }
      
      default:
        return [windowKey, windowKey];
    }
  }

  private formatWindowName(windowKey: string, windowSize: LaunchWindowCohortConfig['windowSize']): string {
    switch (windowSize) {
      case 'week':
        return `Week of ${windowKey}`;
      case 'month':
        const [year, month] = windowKey.split('-');
        const monthName = new Date(parseInt(year ?? '0'), parseInt(month ?? '0') - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return monthName;
      case 'quarter':
        return windowKey.replace('-', ' ');
      default:
        return windowKey;
    }
  }

  private formatWindowDescription(windowKey: string, windowSize: LaunchWindowCohortConfig['windowSize']): string {
    switch (windowSize) {
      case 'week':
        return `during the week of ${windowKey}`;
      case 'month':
        return `in ${this.formatWindowName(windowKey, windowSize)}`;
      case 'quarter':
        return `in ${windowKey.replace('-', ' ')}`;
      default:
        return `on ${windowKey}`;
    }
  }

  private formatBound(bound: number): string {
    if (bound === -Infinity) return '−∞';
    if (bound === Infinity) return '+∞';
    return bound.toFixed(2);
  }
}

// Export singleton instance
export const dynamicCohortSegmentationService = new DynamicCohortSegmentationService();

/**
 * Build cohorts with dynamic segmentation (convenience function)
 */
export function buildCohorts(
  campaigns: CampaignMetadata[],
  mode: CohortSegmentationMode,
  config?: Partial<DynamicCohortConfig>
): CohortComparisonResult {
  const fullConfig: DynamicCohortConfig = {
    mode,
    launchWindow: mode === 'launchWindow' ? {
      windowSize: 'week',
      maxWindows: 8,
      ...config?.launchWindow
    } : undefined,
    performanceTier: mode === 'performanceTier' ? {
      metric: 'avgLeadScore',
      tiers: 3,
      method: 'percentile',
      ...config?.performanceTier
    } : undefined
  };

  return dynamicCohortSegmentationService.buildCohorts(campaigns, fullConfig);
}

/**
 * Check if dynamic cohort segmentation is available
 */
export function isDynamicCohortSegmentationAvailable(): boolean {
  return isDynamicCohortSegmentationEnabled();
}