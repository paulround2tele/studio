/**
 * useCohortComparison Hook (Phase 6)
 * Builds and manages time-aligned campaign cohort data
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import {
  buildCohortMatrix,
  extractCohortGrowthCurves,
  calculateCohortBenchmarks,
  isCohortComparisonAvailable,
  getDefaultCohortConfig,
  CohortMatrix,
  CohortComparisonConfig,
  CohortCampaign
} from '@/services/campaignMetrics/cohortService';

/**
 * Campaign data input for cohort analysis
 */
export interface CohortCampaignInput {
  campaignId: string;
  campaignName: string;
  snapshots: AggregateSnapshot[];
}

/**
 * Cohort comparison state
 */
export interface CohortComparisonState {
  cohortMatrix: CohortMatrix | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Growth curve data for visualization
 */
export interface GrowthCurveData {
  campaignId: string;
  campaignName: string;
  curve: Array<{ dayIndex: number; value: number; interpolated?: boolean }>;
}

/**
 * Cohort benchmark data for visualization
 */
export interface CohortBenchmarkData {
  dayIndex: number;
  median: number;
  p25: number;
  p75: number;
  count: number;
}

/**
 * Cohort comparison hook return type
 */
export interface UseCohortComparisonReturn extends CohortComparisonState {
  config: CohortComparisonConfig;
  updateConfig: (newConfig: Partial<CohortComparisonConfig>) => void;
  refreshCohorts: () => void;
  clearCohorts: () => void;
  getGrowthCurves: (metricKey: keyof AggregateSnapshot['aggregates']) => GrowthCurveData[];
  getBenchmarks: (metricKey: keyof AggregateSnapshot['aggregates']) => CohortBenchmarkData[];
  canCompare: boolean;
  matrixDensity: number;
}

/**
 * Cohort comparison hook implementation
 */
export function useCohortComparison(
  campaigns: CohortCampaignInput[],
  initialConfig: Partial<CohortComparisonConfig> = {}
): UseCohortComparisonReturn {
  const [config, setConfig] = useState<CohortComparisonConfig>({
    ...getDefaultCohortConfig(),
    ...initialConfig
  });

  const [state, setState] = useState<CohortComparisonState>({
    cohortMatrix: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  // Check if cohort comparison can be performed
  const canCompare = useMemo(() => {
    return (
      isCohortComparisonAvailable() &&
      campaigns.length >= config.minCampaigns &&
      campaigns.every(campaign => campaign.snapshots.length > 0)
    );
  }, [campaigns, config.minCampaigns]);

  // Build cohort matrix when data or config changes
  const buildCohorts = useCallback(() => {
    if (!canCompare) {
      setState(prev => ({
        ...prev,
        cohortMatrix: null,
        error: campaigns.length < config.minCampaigns 
          ? `Need at least ${config.minCampaigns} campaigns for comparison`
          : 'Insufficient data for cohort analysis'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const cohortMatrix = buildCohortMatrix(campaigns, config);
      
      setState(prev => ({
        ...prev,
        loading: false,
        cohortMatrix,
        lastUpdated: new Date().toISOString(),
        error: null
      }));

      // Emit telemetry for cohort comparison
      emitCohortTelemetry(campaigns.length, cohortMatrix.maxDays, cohortMatrix.matrixDensity);

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Cohort analysis failed'
      }));
    }
  }, [campaigns, config, canCompare]);

  // Rebuild cohorts when dependencies change
  useEffect(() => {
    buildCohorts();
  }, [buildCohorts]);

  // Configuration update function
  const updateConfig = useCallback((newConfig: Partial<CohortComparisonConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Manual refresh function
  const refreshCohorts = useCallback(() => {
    buildCohorts();
  }, [buildCohorts]);

  // Clear cohorts function
  const clearCohorts = useCallback(() => {
    setState({
      cohortMatrix: null,
      loading: false,
      error: null,
      lastUpdated: null
    });
  }, []);

  // Get growth curves for specific metric
  const getGrowthCurves = useCallback((
    metricKey: keyof AggregateSnapshot['aggregates']
  ): GrowthCurveData[] => {
    if (!state.cohortMatrix) {
      return [];
    }

    const curves = extractCohortGrowthCurves(state.cohortMatrix, metricKey);
    
    return state.cohortMatrix.campaigns.map(campaign => ({
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      curve: curves[campaign.campaignId] || []
    }));
  }, [state.cohortMatrix]);

  // Get benchmark data for specific metric
  const getBenchmarks = useCallback((
    metricKey: keyof AggregateSnapshot['aggregates']
  ): CohortBenchmarkData[] => {
    if (!state.cohortMatrix) {
      return [];
    }

    return calculateCohortBenchmarks(state.cohortMatrix, metricKey);
  }, [state.cohortMatrix]);

  // Calculate matrix density
  const matrixDensity = useMemo(() => {
    return state.cohortMatrix?.matrixDensity || 0;
  }, [state.cohortMatrix]);

  return {
    ...state,
    config,
    updateConfig,
    refreshCohorts,
    clearCohorts,
    getGrowthCurves,
    getBenchmarks,
    canCompare,
    matrixDensity
  };
}

/**
 * Emit cohort comparison telemetry event
 */
function emitCohortTelemetry(
  cohortSize: number,
  maxDays: number,
  matrixDensity: number
): void {
  try {
    const telemetryEvent = {
      event: 'cohort_compare',
      timestamp: new Date().toISOString(),
      data: {
        campaigns: cohortSize,
        maxDays,
        matrixDensity: Math.round(matrixDensity * 100) / 100
      }
    };

    console.info('[useCohortComparison] Cohort telemetry:', telemetryEvent);
    
    // TODO: Integrate with actual telemetry service
    // telemetryService.emit(telemetryEvent);
  } catch (error) {
    console.warn('[useCohortComparison] Telemetry emission failed:', error);
  }
}

/**
 * Simplified cohort hook for basic usage
 */
export function useSimpleCohortComparison(
  campaigns: CohortCampaignInput[]
): {
  cohortMatrix: CohortMatrix | null;
  loading: boolean;
  error: string | null;
  canCompare: boolean;
} {
  const { cohortMatrix, loading, error, canCompare } = useCohortComparison(campaigns);
  
  return { cohortMatrix, loading, error, canCompare };
}

/**
 * Hook for getting growth curves only
 */
export function useCohortGrowthCurves(
  campaigns: CohortCampaignInput[],
  metricKey: keyof AggregateSnapshot['aggregates']
): {
  curves: GrowthCurveData[];
  loading: boolean;
  error: string | null;
} {
  const { getGrowthCurves, loading, error } = useCohortComparison(campaigns);
  
  const curves = useMemo(() => {
    return getGrowthCurves(metricKey);
  }, [getGrowthCurves, metricKey]);

  return { curves, loading, error };
}

/**
 * Hook for getting cohort benchmarks only
 */
export function useCohortBenchmarks(
  campaigns: CohortCampaignInput[],
  metricKey: keyof AggregateSnapshot['aggregates']
): {
  benchmarks: CohortBenchmarkData[];
  loading: boolean;
  error: string | null;
} {
  const { getBenchmarks, loading, error } = useCohortComparison(campaigns);
  
  const benchmarks = useMemo(() => {
    return getBenchmarks(metricKey);
  }, [getBenchmarks, metricKey]);

  return { benchmarks, loading, error };
}

/**
 * Get cohort comparison readiness info
 */
export function getCohortReadiness(campaigns: CohortCampaignInput[]): {
  ready: boolean;
  reason: string;
  requiredCampaigns: number;
  currentCampaigns: number;
} {
  const defaultConfig = getDefaultCohortConfig();
  const currentCampaigns = campaigns.length;
  const requiredCampaigns = defaultConfig.minCampaigns;

  if (!isCohortComparisonAvailable()) {
    return {
      ready: false,
      reason: 'Cohort comparison is disabled',
      requiredCampaigns,
      currentCampaigns
    };
  }

  if (currentCampaigns < requiredCampaigns) {
    return {
      ready: false,
      reason: `Need ${requiredCampaigns - currentCampaigns} more campaigns`,
      requiredCampaigns,
      currentCampaigns
    };
  }

  const campaignsWithoutData = campaigns.filter(c => c.snapshots.length === 0);
  if (campaignsWithoutData.length > 0) {
    return {
      ready: false,
      reason: `${campaignsWithoutData.length} campaigns have no snapshot data`,
      requiredCampaigns,
      currentCampaigns
    };
  }

  return {
    ready: true,
    reason: 'Ready for cohort comparison',
    requiredCampaigns,
    currentCampaigns
  };
}