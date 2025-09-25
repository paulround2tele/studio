/**
 * Cohort Service (Phase 6)
 * Time-aligned campaign comparison by relative "day since launch"
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';

// Feature flag
const isCohortComparisonEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_COHORT_COMPARISON !== 'false';

/**
 * Normalized snapshot with relative day index
 */
export interface NormalizedSnapshot {
  dayIndex: number;
  originalTimestamp: string;
  snapshot: AggregateSnapshot;
}

/**
 * Cohort campaign data
 */
export interface CohortCampaign {
  campaignId: string;
  campaignName: string;
  launchDate: string; // t0 timestamp
  snapshots: AggregateSnapshot[];
  normalizedSnapshots: NormalizedSnapshot[];
}

/**
 * Cohort matrix - aligned data by day index
 */
export interface CohortMatrix {
  maxDays: number;
  campaigns: CohortCampaign[];
  matrixDensity: number; // percentage of cells filled
  alignedData: Record<number, Record<string, AggregateSnapshot>>; // dayIndex -> campaignId -> snapshot
  interpolated: boolean;
}

/**
 * Cohort comparison configuration
 */
export interface CohortComparisonConfig {
  enableInterpolation: boolean;
  maxDaySpread: number; // Maximum days to analyze
  minCampaigns: number; // Minimum campaigns required
}

/**
 * Default cohort configuration
 */
const DEFAULT_CONFIG: CohortComparisonConfig = {
  enableInterpolation: false,
  maxDaySpread: 30,
  minCampaigns: 2
};

/**
 * Normalize snapshots by start date (t0 = first snapshot timestamp)
 */
export function normalizeSnapshotsByStart(
  snapshots: AggregateSnapshot[]
): NormalizedSnapshot[] {
  if (!isCohortComparisonEnabled() || snapshots.length === 0) {
    return [];
  }

  // Sort snapshots by timestamp
  const sortedSnapshots = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Determine t0 (launch date) - first snapshot timestamp
  const firstSnapshot = sortedSnapshots[0];
  if (!firstSnapshot) {
    return [];
  }
  
  const t0 = new Date(firstSnapshot.timestamp).getTime();

  // Convert to normalized snapshots with day index
  return sortedSnapshots.map(snapshot => {
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    const dayIndex = Math.floor((snapshotTime - t0) / 86400000); // 24 * 60 * 60 * 1000

    return {
      dayIndex,
      originalTimestamp: snapshot.timestamp,
      snapshot
    };
  });
}

/**
 * Build cohort matrix from multiple campaign snapshots
 */
export function buildCohortMatrix(
  campaignSnapshots: Array<{
    campaignId: string;
    campaignName: string;
    snapshots: AggregateSnapshot[];
  }>,
  config: CohortComparisonConfig = DEFAULT_CONFIG
): CohortMatrix {
  if (!isCohortComparisonEnabled() || campaignSnapshots.length < config.minCampaigns) {
    return {
      maxDays: 0,
      campaigns: [],
      matrixDensity: 0,
      alignedData: {},
      interpolated: false
    };
  }

  // Create cohort campaigns with normalized snapshots
  const cohortCampaigns: CohortCampaign[] = campaignSnapshots.map(campaign => {
    const normalizedSnapshots = normalizeSnapshotsByStart(campaign.snapshots);
    const sortedSnapshots = campaign.snapshots.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const launchDate = sortedSnapshots.length > 0 && sortedSnapshots[0] ? 
      sortedSnapshots[0].timestamp : 
      new Date().toISOString();

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      launchDate,
      snapshots: campaign.snapshots,
      normalizedSnapshots
    };
  });

  // Find maximum day index across all campaigns
  const maxDays = Math.min(
    Math.max(...cohortCampaigns.map(campaign => 
      Math.max(...campaign.normalizedSnapshots.map(ns => ns.dayIndex), 0)
    )),
    config.maxDaySpread
  );

  // Build aligned data matrix
  const alignedData: Record<number, Record<string, AggregateSnapshot>> = {};
  let totalCells = 0;
  let filledCells = 0;

  for (let dayIndex = 0; dayIndex <= maxDays; dayIndex++) {
    alignedData[dayIndex] = {};
    
    for (const campaign of cohortCampaigns) {
      totalCells++;
      
      // Find snapshot for this day index
      const normalizedSnapshot = campaign.normalizedSnapshots.find(ns => ns.dayIndex === dayIndex);
      
      if (normalizedSnapshot && alignedData[dayIndex]) {
        alignedData[dayIndex]![campaign.campaignId] = normalizedSnapshot.snapshot;
        filledCells++;
      } else if (config.enableInterpolation) {
        // Linear interpolation for missing days
        const interpolatedSnapshot = interpolateSnapshot(campaign.normalizedSnapshots, dayIndex);
        if (interpolatedSnapshot && alignedData[dayIndex]) {
          alignedData[dayIndex]![campaign.campaignId] = interpolatedSnapshot;
          filledCells++;
        }
      }
    }
  }

  const matrixDensity = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;

  return {
    maxDays,
    campaigns: cohortCampaigns,
    matrixDensity,
    alignedData,
    interpolated: config.enableInterpolation
  };
}

/**
 * Interpolate snapshot for missing day using linear interpolation
 */
function interpolateSnapshot(
  normalizedSnapshots: NormalizedSnapshot[],
  targetDayIndex: number
): AggregateSnapshot | null {
  if (normalizedSnapshots.length < 2) {
    return null;
  }

  // Find surrounding snapshots
  const sortedSnapshots = normalizedSnapshots.sort((a, b) => a.dayIndex - b.dayIndex);
  
  let beforeSnapshot: NormalizedSnapshot | null = null;
  let afterSnapshot: NormalizedSnapshot | null = null;

  for (let i = 0; i < sortedSnapshots.length; i++) {
    const snapshot = sortedSnapshots[i];
    if (!snapshot) continue;
    
    if (snapshot.dayIndex < targetDayIndex) {
      beforeSnapshot = snapshot;
    } else if (snapshot.dayIndex > targetDayIndex && !afterSnapshot) {
      afterSnapshot = snapshot;
      break;
    }
  }

  // Can't interpolate without surrounding data
  if (!beforeSnapshot || !afterSnapshot) {
    return null;
  }

  // Calculate interpolation factor
  const totalDaySpan = afterSnapshot.dayIndex - beforeSnapshot.dayIndex;
  const targetOffset = targetDayIndex - beforeSnapshot.dayIndex;
  const factor = targetOffset / totalDaySpan;

  // Interpolate aggregate metrics
  const beforeAgg = beforeSnapshot.snapshot.aggregates;
  const afterAgg = afterSnapshot.snapshot.aggregates;

  const interpolatedAggregates = {
    totalDomains: Math.round(lerp(beforeAgg.totalDomains, afterAgg.totalDomains, factor)),
    successRate: lerp(beforeAgg.successRate, afterAgg.successRate, factor),
    avgLeadScore: lerp(beforeAgg.avgLeadScore, afterAgg.avgLeadScore, factor),
    dnsSuccessRate: lerp(beforeAgg.dnsSuccessRate, afterAgg.dnsSuccessRate, factor),
    httpSuccessRate: lerp(beforeAgg.httpSuccessRate, afterAgg.httpSuccessRate, factor)
  };

  // Interpolate classification counts
  const beforeClass = beforeSnapshot.snapshot.classifiedCounts;
  const afterClass = afterSnapshot.snapshot.classifiedCounts;

  const interpolatedClassification = {
    highQuality: Math.round(lerp(beforeClass.highQuality ?? 0, afterClass.highQuality ?? 0, factor)),
    mediumQuality: Math.round(lerp(beforeClass.mediumQuality ?? 0, afterClass.mediumQuality ?? 0, factor)),
    lowQuality: Math.round(lerp(beforeClass.lowQuality ?? 0, afterClass.lowQuality ?? 0, factor)),
    total: Math.round(lerp(beforeClass.total ?? 0, afterClass.total ?? 0, factor))
  };

  // Create interpolated timestamp
  const beforeTime = new Date(beforeSnapshot.originalTimestamp).getTime();
  const afterTime = new Date(afterSnapshot.originalTimestamp).getTime();
  const interpolatedTime = beforeTime + (afterTime - beforeTime) * factor;

  return {
    id: `interpolated-${targetDayIndex}`,
    timestamp: new Date(interpolatedTime).toISOString(),
    aggregates: interpolatedAggregates,
    classifiedCounts: interpolatedClassification
  };
}

/**
 * Linear interpolation helper
 */
function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Extract cohort growth curves for specific metrics
 */
export function extractCohortGrowthCurves(
  cohortMatrix: CohortMatrix,
  metricKey: keyof AggregateSnapshot['aggregates']
): Record<string, Array<{ dayIndex: number; value: number; interpolated?: boolean }>> {
  const curves: Record<string, Array<{ dayIndex: number; value: number; interpolated?: boolean }>> = {};

  for (const campaign of cohortMatrix.campaigns) {
    curves[campaign.campaignId] = [];

    for (let dayIndex = 0; dayIndex <= cohortMatrix.maxDays; dayIndex++) {
      const snapshot = cohortMatrix.alignedData[dayIndex]?.[campaign.campaignId];
      if (snapshot && curves[campaign.campaignId]) {
        curves[campaign.campaignId]!.push({
          dayIndex,
          value: snapshot.aggregates[metricKey] as number,
          interpolated: false // Since we removed the interpolated property
        });
      }
    }
  }

  return curves;
}

/**
 * Calculate cohort performance benchmarks
 */
export function calculateCohortBenchmarks(
  cohortMatrix: CohortMatrix,
  metricKey: keyof AggregateSnapshot['aggregates']
): Array<{ dayIndex: number; median: number; p25: number; p75: number; count: number }> {
  const benchmarks: Array<{ dayIndex: number; median: number; p25: number; p75: number; count: number }> = [];

  for (let dayIndex = 0; dayIndex <= cohortMatrix.maxDays; dayIndex++) {
    const dayData = cohortMatrix.alignedData[dayIndex];
    if (!dayData) continue;

    const values = Object.values(dayData)
      .map(snapshot => snapshot.aggregates[metricKey] as number)
      .filter(val => !isNaN(val))
      .sort((a, b) => a - b);

    if (values.length > 0) {
      const median = calculatePercentile(values, 50);
      const p25 = calculatePercentile(values, 25);
      const p75 = calculatePercentile(values, 75);

      benchmarks.push({
        dayIndex,
        median,
        p25,
        p75,
        count: values.length
      });
    }
  }

  return benchmarks;
}

/**
 * Calculate percentile value from sorted array
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedValues[lower] ?? 0;
  }
  
  const weight = index - lower;
  return (sortedValues[lower] ?? 0) * (1 - weight) + (sortedValues[upper] ?? 0) * weight;
}

/**
 * Check if cohort comparison features are available
 */
export function isCohortComparisonAvailable(): boolean {
  return isCohortComparisonEnabled();
}

/**
 * Get default cohort configuration
 */
export function getDefaultCohortConfig(): CohortComparisonConfig {
  return { ...DEFAULT_CONFIG };
}