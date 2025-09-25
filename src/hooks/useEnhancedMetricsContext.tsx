/**
 * Enhanced Metrics Context with Phase 4 Integration
 * Shows how to integrate history store, worker offload, and advanced scoring
 */

import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { 
  DomainMetricsInput, 
  AggregateSnapshot, 
  DeltaMetrics, 
  Mover, 
  ProgressUpdate, 
  ClassificationBuckets 
} from '@/types/campaignMetrics';
import { useCampaignServerMetrics } from '@/hooks/useCampaignServerMetrics';
import { useCampaignDeltas } from '@/hooks/useCampaignDeltas';
import { useCampaignMovers } from '@/hooks/useCampaignMovers';
import { useCampaignProgress } from '@/hooks/useCampaignProgress';
import { useWorkerMetricsFallback } from '@/hooks/useWorkerMetricsFallback';
import { getRecommendations } from '@/services/campaignMetrics/recommendationService';
import { scoreAndGroupRecommendations, type ScoredRecommendation } from '@/services/campaignMetrics/recommendationScoreService';
import { addSnapshot, getSnapshots, getSnapshotCount } from '@/services/campaignMetrics/historyStore';
import { mark, measure, incrementCounter, PerfMarkers } from '@/services/campaignMetrics/metricsPerf';

// Enhanced context interface with Phase 4 features
export interface EnhancedMetricsContextValue {
  // Core metrics data
  currentSnapshot: AggregateSnapshot | null;
  aggregates: any;
  classification: any;
  uiBuckets: any[];
  
  // Phase 4: Historical data
  snapshots: AggregateSnapshot[];
  snapshotCount: number;
  hasHistoricalData: boolean;
  
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
  
  // Phase 4: Enhanced recommendations
  recommendations: ScoredRecommendation[];
  recommendationGroups: any[];
  
  // Phase 4: Worker metrics
  workerMetrics: {
    isUsingWorker: boolean;
    workerTimingMs: number | null;
    workerError: Error | null;
  };
  
  // Loading and error states
  isLoading: boolean;
  isServerData: boolean;
  error: Error | null;
  
  // Phase 4: Performance metrics
  performanceMetrics: {
    computeTimeMs: number | null;
    fallbackCount: number;
    cacheHitRate: number;
  };
  
  // Feature flags
  features: {
    useServerMetrics: boolean;
    enableDeltas: boolean;
    enableMoversPanel: boolean;
    enableRealtimeProgress: boolean;
    enableTrends: boolean;
    enableWorkerMetrics: boolean;
    enableAdvancedScoring: boolean;
  };
}

const EnhancedMetricsContext = createContext<EnhancedMetricsContextValue | null>(null);

export interface EnhancedMetricsProviderProps {
  children: ReactNode;
  campaignId: string;
  domains: DomainMetricsInput[];
  previousDomains?: DomainMetricsInput[];
}

/**
 * Enhanced Metrics Context Provider with Phase 4 features
 */
export function EnhancedMetricsProvider({ 
  children, 
  campaignId, 
  domains, 
  previousDomains = [] 
}: EnhancedMetricsProviderProps) {
  
  // Phase 4: Performance tracking
  useEffect(() => {
    mark(PerfMarkers.METRICS_COMPUTE_START);
    return () => {
      measure('metrics_compute_total', PerfMarkers.METRICS_COMPUTE_START);
    };
  }, [domains]);

  // Server metrics with fallback
  const serverMetrics = useCampaignServerMetrics(campaignId, domains);
  
  // Phase 4: Worker metrics fallback for large datasets
  const workerMetrics = useWorkerMetricsFallback(domains, {
    enabled: !serverMetrics.isServerData // Only use worker when not using server
  });

  // Delta analysis
  const deltaResults = useCampaignDeltas(
    serverMetrics.currentSnapshot,
    null, // Will be enhanced with historical data
    { createBaseline: true }
  );
  
  // Movers analysis
  const moversResults = useCampaignMovers(domains, previousDomains);
  
  // Real-time progress
  const progressResults = useCampaignProgress({
    campaignId,
    autoStart: true,
    useMock: true
  });

  // Phase 4: Historical snapshots
  const { snapshots, snapshotCount, hasHistoricalData } = useMemo(() => {
    const snapshots = getSnapshots(campaignId);
    const count = getSnapshotCount(campaignId);
    return {
      snapshots,
      snapshotCount: count,
      hasHistoricalData: count >= 3
    };
  }, [campaignId]);

  // Phase 4: Auto-save snapshots when new data arrives
  useEffect(() => {
    if (serverMetrics.currentSnapshot && !serverMetrics.isLoading) {
      mark('history_save_start');
      addSnapshot(campaignId, serverMetrics.currentSnapshot);
      measure('history_save', 'history_save_start');
      incrementCounter('snapshots_saved');
    }
  }, [campaignId, serverMetrics.currentSnapshot, serverMetrics.isLoading]);

  // Enhanced recommendations with Phase 4 scoring
  const enhancedRecommendations = useMemo(() => {
    mark('recommendation_compute_start');
    
    // Convert classification to the expected format if needed
    let classification: ClassificationBuckets;
    
    const serverClassification = serverMetrics.classification;
    
    if (serverClassification && 
        typeof serverClassification === 'object' &&
        'highQuality' in serverClassification &&
        typeof serverClassification.highQuality === 'object' &&
        'count' in serverClassification.highQuality) {
      classification = serverClassification as ClassificationBuckets;
    } else if (serverClassification && typeof serverClassification === 'object') {
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
      classification = {
        highQuality: { count: 0, percentage: 0 },
        mediumQuality: { count: 0, percentage: 0 },
        lowQuality: { count: 0, percentage: 0 }
      };
    }

    // Get base recommendations
    const baseRecommendations = getRecommendations({
      aggregates: serverMetrics.aggregates,
      classification,
      warningRate: 0, // TODO: Calculate from actual data
      deltas: deltaResults.significantDeltas,
      previousAggregates: deltaResults.snapshots.previous?.aggregates
    });

    // Phase 4: Apply advanced scoring and grouping
    const scoredGroups = scoreAndGroupRecommendations(baseRecommendations, {
      aggregates: serverMetrics.aggregates,
      classification,
      deltas: deltaResults.significantDeltas
    });

    const scoredRecommendations = scoredGroups.map(group => group.mergedRecommendation);
    
    measure('recommendation_compute', 'recommendation_compute_start');
    incrementCounter('recommendations_computed');
    
    return { recommendations: scoredRecommendations, groups: scoredGroups };
  }, [
    serverMetrics.aggregates,
    serverMetrics.classification,
    deltaResults.significantDeltas,
    deltaResults.snapshots.previous
  ]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const fallbackCount = workerMetrics.isUsingWorker ? 0 : 1;
    const computeTimeMs = workerMetrics.timingMs || null;
    
    return {
      computeTimeMs,
      fallbackCount,
      cacheHitRate: snapshots.length > 0 ? 0.8 : 0.0 // Simplified calculation
    };
  }, [workerMetrics.timingMs, workerMetrics.isUsingWorker, snapshots.length]);

  // Feature flags
  const features = useMemo(() => ({
    useServerMetrics: process.env.NEXT_PUBLIC_USE_SERVER_METRICS === 'true',
    enableDeltas: process.env.NEXT_PUBLIC_ENABLE_DELTAS !== 'false',
    enableMoversPanel: process.env.NEXT_PUBLIC_ENABLE_MOVERS_PANEL !== 'false',
    enableRealtimeProgress: process.env.NEXT_PUBLIC_ENABLE_REALTIME_PROGRESS === 'true',
    enableTrends: process.env.NEXT_PUBLIC_ENABLE_TRENDS !== 'false',
    enableWorkerMetrics: process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS !== 'false',
    enableAdvancedScoring: process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2 !== 'false'
  }), []);
  
  const contextValue: EnhancedMetricsContextValue = useMemo(() => ({
    // Core metrics
    currentSnapshot: serverMetrics.currentSnapshot,
    aggregates: serverMetrics.aggregates,
    classification: serverMetrics.classification,
    uiBuckets: serverMetrics.uiBuckets,
    
    // Phase 4: Historical data
    snapshots,
    snapshotCount,
    hasHistoricalData,
    
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
    
    // Phase 4: Enhanced recommendations
    recommendations: enhancedRecommendations.recommendations,
    recommendationGroups: enhancedRecommendations.groups,
    
    // Phase 4: Worker metrics
    workerMetrics: {
      isUsingWorker: workerMetrics.isUsingWorker,
      workerTimingMs: workerMetrics.timingMs,
      workerError: workerMetrics.error
    },
    
    // States
    isLoading: serverMetrics.isLoading || workerMetrics.isLoading,
    isServerData: serverMetrics.isServerData,
    error: (serverMetrics.error || progressResults.error || workerMetrics.error) as Error | null,
    
    // Phase 4: Performance metrics
    performanceMetrics,
    
    // Features
    features
  }), [
    serverMetrics,
    deltaResults,
    moversResults,
    progressResults,
    workerMetrics,
    snapshots,
    snapshotCount,
    hasHistoricalData,
    enhancedRecommendations,
    performanceMetrics,
    features
  ]);

  return (
    <EnhancedMetricsContext.Provider value={contextValue}>
      {children}
    </EnhancedMetricsContext.Provider>
  );
}

/**
 * Hook to consume enhanced metrics context
 */
export function useEnhancedMetricsContext(): EnhancedMetricsContextValue {
  const context = useContext(EnhancedMetricsContext);
  if (!context) {
    throw new Error('useEnhancedMetricsContext must be used within an EnhancedMetricsProvider');
  }
  return context;
}

export default EnhancedMetricsProvider;