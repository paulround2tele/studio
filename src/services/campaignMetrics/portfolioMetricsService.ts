/**
 * Portfolio Metrics Service (Phase 5)
 * Multi-campaign summary and outlier detection
 */

import { AggregateSnapshot, ExtendedAggregateMetrics } from '@/types/campaignMetrics';

// Feature flag for portfolio metrics
const isPortfolioMetricsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_METRICS !== 'false';

/**
 * Portfolio aggregate summary
 */
export interface PortfolioSummary {
  totalCampaigns: number;
  totalDomains: number;
  avgSuccessRate: number;
  avgLeadScore: number;
  totalLeads: number;
  totalHighPotential: number;
  performanceMetrics: {
    bestPerforming: CampaignSummary;
    worstPerforming: CampaignSummary;
    avgRichness: number;
    avgKeywordCoverage: number;
  };
}

/**
 * Individual campaign summary for portfolio view
 */
export interface CampaignSummary {
  campaignId: string;
  campaignName?: string;
  totalDomains: number;
  successRate: number;
  leadScore: number;
  lastUpdate: string;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Portfolio outlier detection result
 */
export interface PortfolioOutlier {
  campaignId: string;
  metric: string;
  value: number;
  deviation: number;
  severity: 'mild' | 'moderate' | 'extreme';
  description: string;
}

/**
 * Campaign timeline data for portfolio analysis
 */
export interface CampaignTimeline {
  campaignId: string;
  campaignName?: string;
  snapshots: AggregateSnapshot[];
}

/**
 * Compute portfolio aggregate summary from multiple campaign timelines
 */
export function computePortfolioAggregate(
  campaignTimelines: CampaignTimeline[]
): PortfolioSummary | null {
  if (!isPortfolioMetricsEnabled() || campaignTimelines.length < 2) {
    return null; // Graceful no-op for insufficient campaigns
  }

  const campaignSummaries = campaignTimelines.map(timeline => 
    createCampaignSummary(timeline)
  ).filter(summary => summary !== null) as CampaignSummary[];

  if (campaignSummaries.length === 0) {
    return null;
  }

  const totalDomains = campaignSummaries.reduce((sum, campaign) => sum + campaign.totalDomains, 0);
  const avgSuccessRate = campaignSummaries.reduce((sum, campaign) => sum + campaign.successRate, 0) / campaignSummaries.length;
  const avgLeadScore = campaignSummaries.reduce((sum, campaign) => sum + campaign.leadScore, 0) / campaignSummaries.length;

  // Calculate additional metrics from latest snapshots
  const latestSnapshots = campaignTimelines.map(timeline => getLatestSnapshot(timeline)).filter(s => s !== null) as AggregateSnapshot[];
  
  const totalLeads = latestSnapshots.reduce((sum, snapshot) => {
    const leadsCount = (snapshot.aggregates as ExtendedAggregateMetrics).leadsCount || 0;
    return sum + leadsCount;
  }, 0);

  const totalHighPotential = latestSnapshots.reduce((sum, snapshot) => {
    const highPotentialCount = (snapshot.aggregates as ExtendedAggregateMetrics).highPotentialCount || 0;
    return sum + highPotentialCount;
  }, 0);

  const avgRichness = calculateAvgMetric(latestSnapshots, 'avgRichness');
  const avgKeywordCoverage = calculateAvgMetric(latestSnapshots, 'keywordCoverage');

  // Find best and worst performing campaigns
  const bestPerforming = campaignSummaries.reduce((best, current) => 
    current.successRate > best.successRate ? current : best
  );

  const worstPerforming = campaignSummaries.reduce((worst, current) => 
    current.successRate < worst.successRate ? current : worst
  );

  return {
    totalCampaigns: campaignSummaries.length,
    totalDomains,
    avgSuccessRate,
    avgLeadScore,
    totalLeads,
    totalHighPotential,
    performanceMetrics: {
      bestPerforming,
      worstPerforming,
      avgRichness,
      avgKeywordCoverage
    }
  };
}

/**
 * Detect outliers across portfolio campaigns
 */
export function detectPortfolioOutliers(
  campaignTimelines: CampaignTimeline[]
): PortfolioOutlier[] {
  if (!isPortfolioMetricsEnabled() || campaignTimelines.length < 3) {
    return []; // Need at least 3 campaigns for meaningful outlier detection
  }

  const outliers: PortfolioOutlier[] = [];
  const metricsToCheck = ['successRate', 'avgLeadScore', 'totalDomains', 'leadsCount', 'avgRichness'];

  metricsToCheck.forEach(metric => {
    const campaignValues = campaignTimelines.map(timeline => ({
      campaignId: timeline.campaignId,
      value: extractMetricValue(timeline, metric)
    })).filter(item => item.value !== null) as { campaignId: string; value: number }[];

    if (campaignValues.length < 3) return;

    const outlierResults = detectMetricOutliers(campaignValues, metric);
    outliers.push(...outlierResults);
  });

  return outliers;
}

/**
 * Create campaign summary from timeline
 */
function createCampaignSummary(timeline: CampaignTimeline): CampaignSummary | null {
  if (timeline.snapshots.length === 0) {
    return null;
  }

  const latestSnapshot = getLatestSnapshot(timeline);
  if (!latestSnapshot) {
    return null;
  }

  const successRate = latestSnapshot.aggregates.successRate || 0;
  const leadScore = latestSnapshot.aggregates.avgLeadScore || 0;
  const totalDomains = latestSnapshot.aggregates.totalDomains || 0;

  // Calculate trend from last two snapshots
  const trend = calculateTrend(timeline.snapshots);

  return {
    campaignId: timeline.campaignId,
    campaignName: timeline.campaignName,
    totalDomains,
    successRate,
    leadScore,
    lastUpdate: latestSnapshot.timestamp,
    trend
  };
}

/**
 * Get latest snapshot from timeline
 */
function getLatestSnapshot(timeline: CampaignTimeline): AggregateSnapshot | null {
  if (timeline.snapshots.length === 0) return null;
  
  return timeline.snapshots.reduce((latest, current) => 
    new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
  );
}

/**
 * Calculate average metric across snapshots
 */
function calculateAvgMetric(
  snapshots: AggregateSnapshot[], 
  metric: keyof ExtendedAggregateMetrics
): number {
  const values = snapshots.map(s => (s.aggregates as ExtendedAggregateMetrics)[metric])
    .filter(v => typeof v === 'number') as number[];
  
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate trend direction from snapshots
 */
function calculateTrend(snapshots: AggregateSnapshot[]): 'up' | 'down' | 'stable' {
  if (snapshots.length < 2) return 'stable';

  const sorted = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const latestScore = latest?.aggregates?.successRate || 0;
  const previousScore = previous?.aggregates?.successRate || 0;

  const diff = latestScore - previousScore;
  const threshold = 0.05; // 5% threshold for stability

  if (Math.abs(diff) < threshold) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

/**
 * Extract metric value from campaign timeline
 */
function extractMetricValue(timeline: CampaignTimeline, metric: string): number | null {
  const latestSnapshot = getLatestSnapshot(timeline);
  if (!latestSnapshot) return null;

  const aggregates = latestSnapshot.aggregates as ExtendedAggregateMetrics;
  
  switch (metric) {
    case 'successRate':
      return aggregates.successRate || 0;
    case 'avgLeadScore':
      return aggregates.avgLeadScore || 0;
    case 'totalDomains':
      return aggregates.totalDomains || 0;
    case 'leadsCount':
      return aggregates.leadsCount || 0;
    case 'avgRichness':
      return aggregates.avgRichness || 0;
    default:
      return null;
  }
}

/**
 * Detect outliers for a specific metric
 */
function detectMetricOutliers(
  campaignValues: { campaignId: string; value: number }[],
  metric: string
): PortfolioOutlier[] {
  const values = campaignValues.map(cv => cv.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

  const outliers: PortfolioOutlier[] = [];

  campaignValues.forEach(({ campaignId, value }) => {
    const deviation = Math.abs(value - mean) / stdDev;
    
    let severity: 'mild' | 'moderate' | 'extreme' | null = null;
    if (deviation > 3.0) severity = 'extreme';
    else if (deviation > 2.0) severity = 'moderate';
    else if (deviation > 1.5) severity = 'mild';

    if (severity) {
      outliers.push({
        campaignId,
        metric,
        value,
        deviation,
        severity,
        description: `${metric} is ${deviation.toFixed(1)} standard deviations from portfolio average`
      });
    }
  });

  return outliers;
}

/**
 * Check if portfolio metrics are available
 */
export function isPortfolioMetricsAvailable(): boolean {
  return isPortfolioMetricsEnabled();
}