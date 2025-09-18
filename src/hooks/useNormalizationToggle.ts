/**
 * useNormalizationToggle Hook (Phase 6)
 * Manages raw vs normalized metric view toggle with benchmark fetching
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import {
  fetchBenchmarks,
  applyNormalizationBatch,
  getDisplayAggregates,
  isNormalized,
  getNormalizationMetadata,
  clearNormalizationCache,
  isNormalizationAvailable,
  BenchmarkMetrics,
  NormalizedSnapshot,
  NormalizationConfig
} from '@/services/campaignMetrics/normalizationService';

/**
 * Normalization state
 */
export interface NormalizationState {
  showNormalized: boolean;
  benchmarks: BenchmarkMetrics | null;
  normalizedSnapshots: NormalizedSnapshot[];
  loading: boolean;
  error: string | null;
  lastBenchmarkFetch: string | null;
}

/**
 * Normalization toggle hook return type
 */
export interface UseNormalizationToggleReturn extends NormalizationState {
  toggleNormalization: () => void;
  setShowNormalized: (show: boolean) => void;
  refreshBenchmarks: () => Promise<void>;
  clearCache: () => void;
  getDisplaySnapshot: (snapshot: AggregateSnapshot) => AggregateSnapshot;
  isReady: boolean;
  benchmarkVersion: string | null;
}

/**
 * Default normalization configuration
 */
const DEFAULT_CONFIG: NormalizationConfig = {
  method: 'baseline',
  preserveRaw: true,
  cacheTime: 6 * 60 * 60 * 1000 // 6 hours
};

/**
 * Normalization toggle hook implementation
 */
export function useNormalizationToggle(
  snapshots: AggregateSnapshot[],
  config: NormalizationConfig = DEFAULT_CONFIG
): UseNormalizationToggleReturn {
  const [state, setState] = useState<NormalizationState>({
    showNormalized: false,
    benchmarks: null,
    normalizedSnapshots: [],
    loading: false,
    error: null,
    lastBenchmarkFetch: null
  });

  // Check if normalization features are available
  const isReady = useMemo(() => {
    return isNormalizationAvailable() && snapshots.length > 0;
  }, [snapshots]);

  // Fetch benchmarks function
  const fetchBenchmarksData = useCallback(async () => {
    if (!isNormalizationAvailable()) {
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const benchmarks = await fetchBenchmarks();
      
      setState(prev => ({
        ...prev,
        loading: false,
        benchmarks,
        lastBenchmarkFetch: new Date().toISOString(),
        error: null
      }));

      // Emit telemetry for benchmark fetch
      emitNormalizationTelemetry(benchmarks.version, Object.keys(benchmarks.metrics));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch benchmarks'
      }));
    }
  }, []);

  // Apply normalization to snapshots
  const applyNormalizationToSnapshots = useCallback(async () => {
    if (!state.benchmarks || snapshots.length === 0) {
      return;
    }

    try {
      const normalizedSnapshots = await applyNormalizationBatch(snapshots, config);
      
      setState(prev => ({
        ...prev,
        normalizedSnapshots
      }));

    } catch (error) {
      console.warn('[useNormalizationToggle] Normalization failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Normalization failed'
      }));
    }
  }, [snapshots, state.benchmarks, config]);

  // Initial benchmark fetch
  useEffect(() => {
    if (isReady && !state.benchmarks && !state.loading) {
      fetchBenchmarksData();
    }
  }, [isReady, state.benchmarks, state.loading, fetchBenchmarksData]);

  // Apply normalization when benchmarks or snapshots change
  useEffect(() => {
    if (state.benchmarks && snapshots.length > 0) {
      applyNormalizationToSnapshots();
    }
  }, [state.benchmarks, snapshots, applyNormalizationToSnapshots]);

  // Toggle normalization function
  const toggleNormalization = useCallback(() => {
    setState(prev => ({
      ...prev,
      showNormalized: !prev.showNormalized
    }));
  }, []);

  // Set normalization state function
  const setShowNormalized = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      showNormalized: show
    }));
  }, []);

  // Manual benchmark refresh function
  const refreshBenchmarks = useCallback(async () => {
    await fetchBenchmarksData();
  }, [fetchBenchmarksData]);

  // Clear cache function
  const clearCache = useCallback(() => {
    clearNormalizationCache();
    setState(prev => ({
      ...prev,
      benchmarks: null,
      normalizedSnapshots: [],
      lastBenchmarkFetch: null,
      error: null
    }));
  }, []);

  // Get display snapshot (normalized or raw)
  const getDisplaySnapshot = useCallback((
    snapshot: AggregateSnapshot
  ): AggregateSnapshot => {
    if (!state.showNormalized) {
      return snapshot;
    }

    // Find normalized version of this snapshot
    const normalizedSnapshot = state.normalizedSnapshots.find(ns => ns.id === snapshot.id);
    
    if (normalizedSnapshot && isNormalized(normalizedSnapshot)) {
      return {
        ...snapshot,
        aggregates: getDisplayAggregates(normalizedSnapshot, true)
      };
    }

    return snapshot;
  }, [state.showNormalized, state.normalizedSnapshots]);

  // Get benchmark version
  const benchmarkVersion = useMemo(() => {
    return state.benchmarks?.version || null;
  }, [state.benchmarks]);

  return {
    ...state,
    toggleNormalization,
    setShowNormalized,
    refreshBenchmarks,
    clearCache,
    getDisplaySnapshot,
    isReady,
    benchmarkVersion
  };
}

/**
 * Emit normalization telemetry event
 */
function emitNormalizationTelemetry(
  benchmarkVersion: string,
  metricsAffected: string[]
): void {
  try {
    const telemetryEvent = {
      event: 'normalization_applied',
      timestamp: new Date().toISOString(),
      data: {
        benchmarkVersion,
        metricsAffected
      }
    };

    console.info('[useNormalizationToggle] Normalization telemetry:', telemetryEvent);
    
    // TODO: Integrate with actual telemetry service
    // telemetryService.emit(telemetryEvent);
  } catch (error) {
    console.warn('[useNormalizationToggle] Telemetry emission failed:', error);
  }
}

/**
 * Simplified normalization hook for basic toggle functionality
 */
export function useSimpleNormalizationToggle(
  snapshots: AggregateSnapshot[]
): {
  showNormalized: boolean;
  toggleNormalization: () => void;
  loading: boolean;
  error: string | null;
  isReady: boolean;
} {
  const {
    showNormalized,
    toggleNormalization,
    loading,
    error,
    isReady
  } = useNormalizationToggle(snapshots);

  return {
    showNormalized,
    toggleNormalization,
    loading,
    error,
    isReady
  };
}

/**
 * Hook for getting normalized display values only
 */
export function useNormalizedDisplay(
  snapshots: AggregateSnapshot[],
  showNormalized: boolean = false
): {
  displaySnapshots: AggregateSnapshot[];
  loading: boolean;
  error: string | null;
  benchmarkVersion: string | null;
} {
  const {
    getDisplaySnapshot,
    loading,
    error,
    benchmarkVersion
  } = useNormalizationToggle(snapshots);

  const displaySnapshots = useMemo(() => {
    if (!showNormalized) {
      return snapshots;
    }
    
    return snapshots.map(snapshot => getDisplaySnapshot(snapshot));
  }, [snapshots, showNormalized, getDisplaySnapshot]);

  return {
    displaySnapshots,
    loading,
    error,
    benchmarkVersion
  };
}

/**
 * Get normalization readiness info
 */
export function getNormalizationReadiness(snapshots: AggregateSnapshot[]): {
  ready: boolean;
  reason: string;
  benchmarksRequired: boolean;
  hasData: boolean;
} {
  const hasData = snapshots.length > 0;
  const benchmarksRequired = true;

  if (!isNormalizationAvailable()) {
    return {
      ready: false,
      reason: 'Normalization is disabled',
      benchmarksRequired,
      hasData
    };
  }

  if (!hasData) {
    return {
      ready: false,
      reason: 'No snapshot data available',
      benchmarksRequired,
      hasData
    };
  }

  return {
    ready: true,
    reason: 'Ready for normalization',
    benchmarksRequired,
    hasData
  };
}

/**
 * Utility to check if any snapshots are normalized
 */
export function hasNormalizedSnapshots(snapshots: AggregateSnapshot[]): boolean {
  return snapshots.some(snapshot => isNormalized(snapshot));
}

/**
 * Get normalization metadata from snapshots
 */
export function getNormalizationInfo(snapshots: AggregateSnapshot[]): {
  hasNormalized: boolean;
  versions: string[];
  lastApplied: string | null;
} {
  const normalizedSnapshots = snapshots.filter(isNormalized) as NormalizedSnapshot[];
  
  if (normalizedSnapshots.length === 0) {
    return {
      hasNormalized: false,
      versions: [],
      lastApplied: null
    };
  }

  const versions = Array.from(new Set(
    normalizedSnapshots
      .map(snapshot => getNormalizationMetadata(snapshot)?.version)
      .filter(Boolean)
  )) as string[];

  const lastApplied = normalizedSnapshots
    .map(snapshot => getNormalizationMetadata(snapshot)?.appliedAt)
    .filter(Boolean)
    .sort()
    .pop() || null;

  return {
    hasNormalized: true,
    versions,
    lastApplied
  };
}