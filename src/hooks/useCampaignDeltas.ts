/**
 * Campaign Deltas Hook (Phase 3)
 * Wraps deltasService for React consumption
 */

import { useMemo } from 'react';
import { AggregateSnapshot, DeltaMetrics } from '@/types/campaignMetrics';
import { 
  calculateDeltas, 
  filterSignificantDeltas, 
  createBaselineSnapshot 
} from '@/services/campaignMetrics/deltasService';

// Feature flag check
const ENABLE_DELTAS = process.env.NEXT_PUBLIC_ENABLE_DELTAS !== 'false';

export interface UseCampaignDeltasOptions {
  /**
   * Minimum absolute threshold for including deltas
   * @default 0.1
   */
  minAbsoluteThreshold?: number;
  
  /**
   * Minimum percentage threshold for including deltas  
   * @default 1
   */
  minPercentThreshold?: number;
  
  /**
   * Whether to create synthetic baseline if no previous snapshot
   * @default true
   */
  createBaseline?: boolean;
}

export interface UseCampaignDeltasReturn {
  /**
   * All calculated deltas
   */
  deltas: DeltaMetrics[];
  
  /**
   * Significant deltas only (filtered by thresholds)
   */
  significantDeltas: DeltaMetrics[];
  
  /**
   * Whether deltas feature is enabled
   */
  isEnabled: boolean;
  
  /**
   * Whether previous snapshot exists or was synthesized
   */
  hasPreviousData: boolean;
  
  /**
   * Whether baseline was artificially created
   */
  isBaselineSynthetic: boolean;
  
  /**
   * Snapshots used for calculation
   */
  snapshots: {
    current: AggregateSnapshot | null;
    previous: AggregateSnapshot | null;
  };
}

/**
 * Hook for calculating campaign metric deltas
 */
export function useCampaignDeltas(
  currentSnapshot: AggregateSnapshot | null,
  previousSnapshot: AggregateSnapshot | null,
  options: UseCampaignDeltasOptions = {}
): UseCampaignDeltasReturn {
  const {
    minAbsoluteThreshold = 0.1,
    minPercentThreshold = 1,
    createBaseline = true
  } = options;

  return useMemo(() => {
    // Return empty state if deltas are disabled
    if (!ENABLE_DELTAS) {
      return {
        deltas: [],
        significantDeltas: [],
        isEnabled: false,
        hasPreviousData: false,
        isBaselineSynthetic: false,
        snapshots: { current: currentSnapshot, previous: previousSnapshot }
      };
    }

    // Return empty state if no current snapshot
    if (!currentSnapshot) {
      return {
        deltas: [],
        significantDeltas: [],
        isEnabled: true,
        hasPreviousData: false,
        isBaselineSynthetic: false,
        snapshots: { current: null, previous: previousSnapshot }
      };
    }

    let actualPreviousSnapshot = previousSnapshot;
    let isBaselineSynthetic = false;

    // Create synthetic baseline if needed and enabled
    if (!previousSnapshot && createBaseline) {
      actualPreviousSnapshot = createBaselineSnapshot(currentSnapshot);
      isBaselineSynthetic = true;
    }

    // Calculate deltas if we have both snapshots
    let deltas: DeltaMetrics[] = [];
    if (actualPreviousSnapshot) {
      deltas = calculateDeltas(currentSnapshot, actualPreviousSnapshot);
    }

    // Filter significant deltas
    const significantDeltas = filterSignificantDeltas(
      deltas,
      minAbsoluteThreshold,
      minPercentThreshold
    );

    return {
      deltas,
      significantDeltas,
      isEnabled: true,
      hasPreviousData: !!actualPreviousSnapshot,
      isBaselineSynthetic,
      snapshots: { 
        current: currentSnapshot, 
        previous: actualPreviousSnapshot 
      }
    };
  }, [
    currentSnapshot,
    previousSnapshot,
    minAbsoluteThreshold,
    minPercentThreshold,
    createBaseline
  ]);
}

/**
 * Hook for getting specific delta by key
 */
export function useDeltaByKey(
  deltas: DeltaMetrics[],
  key: string
): DeltaMetrics | null {
  return useMemo(() => {
    return deltas.find(delta => delta.key === key) || null;
  }, [deltas, key]);
}

/**
 * Hook for grouping deltas by direction
 */
export function useGroupedDeltas(deltas: DeltaMetrics[]) {
  return useMemo(() => {
    const improvements = deltas.filter(delta => delta.direction === 'up');
    const declines = deltas.filter(delta => delta.direction === 'down');
    const stable = deltas.filter(delta => delta.direction === 'flat');

    return {
      improvements,
      declines,
      stable,
      hasChanges: improvements.length > 0 || declines.length > 0
    };
  }, [deltas]);
}

/**
 * Hook for getting deltas summary statistics
 */
export function useDeltasSummary(deltas: DeltaMetrics[]) {
  return useMemo(() => {
    if (deltas.length === 0) {
      return {
        totalChanges: 0,
        improvementCount: 0,
        declineCount: 0,
        stableCount: 0,
        largestImprovement: null,
        largestDecline: null,
        averageChange: 0
      };
    }

    const improvements = deltas.filter(d => d.direction === 'up');
    const declines = deltas.filter(d => d.direction === 'down');
    const stable = deltas.filter(d => d.direction === 'flat');

    const largestImprovement = improvements.reduce((max, delta) => 
      !max || Math.abs(delta.percent) > Math.abs(max.percent) ? delta : max, 
      null as DeltaMetrics | null
    );

    const largestDecline = declines.reduce((max, delta) => 
      !max || Math.abs(delta.percent) > Math.abs(max.percent) ? delta : max, 
      null as DeltaMetrics | null
    );

    const averageChange = deltas.reduce((sum, delta) => 
      sum + Math.abs(delta.percent), 0
    ) / deltas.length;

    return {
      totalChanges: deltas.length,
      improvementCount: improvements.length,
      declineCount: declines.length,
      stableCount: stable.length,
      largestImprovement,
      largestDecline,
      averageChange
    };
  }, [deltas]);
}