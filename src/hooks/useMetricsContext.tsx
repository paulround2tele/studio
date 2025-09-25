/**
 * Metrics Context Provider (Phase 3)
 * Optional unified context for metrics consumption across components
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { DomainMetricsInput, AggregateSnapshot, DeltaMetrics, Mover, ProgressUpdate, ClassificationBuckets } from '@/types/campaignMetrics';
import { useCampaignServerMetrics } from '@/hooks/useCampaignServerMetrics';
import { useCampaignDeltas } from '@/hooks/useCampaignDeltas';
import { useCampaignMovers } from '@/hooks/useCampaignMovers';
import { useCampaignProgress } from '@/hooks/useCampaignProgress';
import { getRecommendations } from '@/services/campaignMetrics/recommendationService';

export interface MetricsContextValue {
  // Core metrics data
  currentSnapshot: AggregateSnapshot | null;
  aggregates: any; // AggregateMetrics
  classification: any;
  uiBuckets: any[];
  
  // Delta analysis
  deltas: DeltaMetrics[];
  significantDeltas: DeltaMetrics[];
  hasPreviousData: boolean;
  
  // Movers analysis
  movers: Mover[];
  groupedMovers: {
    gainers: Mover[];
    decliners: Mover[];
  };
  hasMovers: boolean;
  
  // Real-time progress
  progress: ProgressUpdate | null;
  isConnected: boolean;
  progressStats: {
    percentage: number;
    analyzedDomains: number;
    totalDomains: number;
    estimatedTimeRemaining?: string;
  };
  
  // Recommendations with delta awareness
  recommendations: any[]; // Recommendation[]
  
  // Loading and error states
  isLoading: boolean;
  isServerData: boolean;
  error: Error | null;
  
  // Feature flags
  features: {
    useServerMetrics: boolean;
    enableDeltas: boolean;
    enableMoversPanel: boolean;
    enableRealtimeProgress: boolean;
  };
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export interface MetricsProviderProps {
  children: ReactNode;
  campaignId: string;
  domains: DomainMetricsInput[];
  previousDomains?: DomainMetricsInput[];
}

/**
 * Metrics Context Provider - centralizes all campaign metrics data
 */
export function MetricsProvider({ 
  children, 
  campaignId, 
  domains, 
  previousDomains = [] 
}: MetricsProviderProps) {
  // Server metrics with fallback
  const serverMetrics = useCampaignServerMetrics(campaignId, domains);
  
  // Delta analysis
  const deltaResults = useCampaignDeltas(
    serverMetrics.currentSnapshot,
    null, // TODO: Add previous snapshot support
    { createBaseline: true }
  );
  
  // Movers analysis
  const moversResults = useCampaignMovers(domains, previousDomains);
  
  // Real-time progress
  const progressResults = useCampaignProgress({
    campaignId,
    autoStart: true,
    useMock: true // Use mock for demo
  });
  
  // Enhanced recommendations with delta awareness
  const enhancedRecommendations = useMemo(() => {
    // Convert classification to the expected format if needed
    let classification: ClassificationBuckets;
    
    const serverClassification = serverMetrics.classification;
    
    // Check if classification is already in ClassificationBuckets format
    if (serverClassification && 
        typeof serverClassification === 'object' &&
        'highQuality' in serverClassification &&
        typeof serverClassification.highQuality === 'object' &&
        'count' in serverClassification.highQuality) {
      // Already in ClassificationBuckets format
      classification = serverClassification as ClassificationBuckets;
    } else if (serverClassification && typeof serverClassification === 'object') {
      // Convert from server format (Record<string, number>) to ClassificationBuckets format
      const total = serverMetrics.aggregates?.totalDomains || 1;
      const counts = serverClassification as Record<string, number>;
      
      classification = {
        highQuality: {
          count: counts.highQuality || 0,
          percentage: ((counts.highQuality || 0) / total) * 100
        },
        mediumQuality: {
          count: counts.mediumQuality || 0,
          percentage: ((counts.mediumQuality || 0) / total) * 100
        },
        lowQuality: {
          count: counts.lowQuality || 0,
          percentage: ((counts.lowQuality || 0) / total) * 100
        }
      };
    } else {
      // Fallback to empty classification
      classification = {
        highQuality: { count: 0, percentage: 0 },
        mediumQuality: { count: 0, percentage: 0 },
        lowQuality: { count: 0, percentage: 0 }
      };
    }

    return getRecommendations({
      aggregates: serverMetrics.aggregates,
      classification,
      warningRate: 0, // TODO: Calculate from actual data
      deltas: deltaResults.significantDeltas,
      previousAggregates: deltaResults.snapshots.previous?.aggregates
    });
  }, [
    serverMetrics.aggregates,
    serverMetrics.classification,
    deltaResults.significantDeltas,
    deltaResults.snapshots.previous
  ]);
  
  // Feature flags
  const features = useMemo(() => ({
    useServerMetrics: process.env.NEXT_PUBLIC_USE_SERVER_METRICS === 'true',
    enableDeltas: process.env.NEXT_PUBLIC_ENABLE_DELTAS !== 'false',
    enableMoversPanel: process.env.NEXT_PUBLIC_ENABLE_MOVERS_PANEL !== 'false',
    enableRealtimeProgress: process.env.NEXT_PUBLIC_ENABLE_REALTIME_PROGRESS === 'true',
    // Phase 4: New feature flags
    enableTrends: process.env.NEXT_PUBLIC_ENABLE_TRENDS !== 'false',
    enableWorkerMetrics: process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS !== 'false',
    enableAdvancedScoring: process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2 !== 'false',
    enableDebugPanel: process.env.NEXT_PUBLIC_DEBUG_METRICS_PANEL === 'true'
  }), []);
  
  const contextValue: MetricsContextValue = useMemo(() => ({
    // Core metrics
    currentSnapshot: serverMetrics.currentSnapshot,
    aggregates: serverMetrics.aggregates,
    classification: serverMetrics.classification,
    uiBuckets: serverMetrics.uiBuckets,
    
    // Deltas
    deltas: deltaResults.deltas,
    significantDeltas: deltaResults.significantDeltas,
    hasPreviousData: deltaResults.hasPreviousData,
    
    // Movers
    movers: moversResults.movers,
    groupedMovers: moversResults.grouped,
    hasMovers: moversResults.hasMovers,
    
    // Progress
    progress: progressResults.progress,
    isConnected: progressResults.isConnected,
    progressStats: progressResults.stats,
    
    // Recommendations
    recommendations: enhancedRecommendations,
    
    // States
    isLoading: serverMetrics.isLoading,
    isServerData: serverMetrics.isServerData,
    error: (serverMetrics.error || progressResults.error) as Error | null,
    
    // Features
    features
  }), [
    serverMetrics,
    deltaResults,
    moversResults,
    progressResults,
    enhancedRecommendations,
    features
  ]);
  
  return (
    <MetricsContext.Provider value={contextValue}>
      {children}
    </MetricsContext.Provider>
  );
}

/**
 * Hook to consume metrics context
 */
export function useMetricsContext(): MetricsContextValue {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error('useMetricsContext must be used within a MetricsProvider');
  }
  return context;
}

/**
 * Hook for specific metric data (performance optimization)
 */
export function useMetricData<T extends keyof MetricsContextValue>(
  key: T
): MetricsContextValue[T] {
  const context = useMetricsContext();
  return context[key];
}

/**
 * Hook for feature flags only
 */
export function useMetricsFeatures() {
  return useMetricData('features');
}

/**
 * Hook for loading state only
 */
export function useMetricsLoading() {
  const context = useMetricsContext();
  return {
    isLoading: context.isLoading,
    isServerData: context.isServerData,
    error: context.error
  };
}

/**
 * Hook for deltas and movers combined
 */
export function useMetricsAnalytics() {
  const context = useMetricsContext();
  return {
    deltas: context.deltas,
    significantDeltas: context.significantDeltas,
    movers: context.movers,
    groupedMovers: context.groupedMovers,
    hasMovers: context.hasMovers,
    hasPreviousData: context.hasPreviousData
  };
}

/**
 * Hook for progress data only
 */
export function useMetricsProgress() {
  const context = useMetricsContext();
  return {
    progress: context.progress,
    isConnected: context.isConnected,
    stats: context.progressStats
  };
}