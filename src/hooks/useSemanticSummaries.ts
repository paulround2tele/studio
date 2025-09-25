/**
 * Semantic Summaries Hook (Phase 10)
 * React hook for semantic summarization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  summarizationService, 
  type AnomalyCluster,
  type CausalGraphDelta,
  type SummaryResult,
  isSummarizationAvailable 
} from '@/services/summarization/summarizationService';

export interface UseSemanticSummariesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCaching?: boolean;
  cacheExpiry?: number;
}

export interface SemanticSummariesState {
  summaries: Map<string, SummaryResult>;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  capabilities: {
    available: boolean;
    localModel: boolean;
    remoteEndpoint: boolean;
    workerReady: boolean;
    modelLoaded: boolean;
  };
}

export interface SemanticSummariesActions {
  refresh: () => Promise<void>;
  summarizeAnomalyCluster: (cluster: AnomalyCluster) => Promise<SummaryResult>;
  summarizeCausalDelta: (delta: CausalGraphDelta) => Promise<SummaryResult>;
  getSummary: (key: string) => SummaryResult | undefined;
  clearSummaries: () => void;
  clearCache: () => void;
  setRemoteEndpoint: (endpoint: string) => void;
}

/**
 * Hook for semantic summaries functionality
 */
export function useSemanticSummaries(options: UseSemanticSummariesOptions = {}): [SemanticSummariesState, SemanticSummariesActions] {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
    enableCaching = true,
    cacheExpiry = 300000 // 5 minutes
  } = options;

  const [state, setState] = useState<SemanticSummariesState>({
    summaries: new Map(),
    loading: false,
    error: null,
    lastUpdate: null,
    capabilities: {
      available: isSummarizationAvailable(),
      localModel: false,
      remoteEndpoint: false,
      workerReady: false,
      modelLoaded: false
    }
  });

  // Cache for summaries with expiry
  const summaryCache = useMemo(() => new Map<string, { 
    summary: SummaryResult; 
    timestamp: number; 
  }>(), []);

  // Generate cache key
  const generateCacheKey = useCallback((type: string, data: any): string => {
    const dataStr = JSON.stringify(data);
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${type}_${Math.abs(hash).toString(16)}`;
  }, []);

  // Check if cached summary is still valid
  const isCacheValid = useCallback((timestamp: number): boolean => {
    return enableCaching && (Date.now() - timestamp < cacheExpiry);
  }, [enableCaching, cacheExpiry]);

  // Refresh capabilities
  const refresh = useCallback(async () => {
    if (!isSummarizationAvailable()) {
      setState(prev => ({
        ...prev,
        error: 'Summarization service is not available'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const capabilities = summarizationService.getCapabilities();
      
      setState(prev => ({
        ...prev,
        capabilities,
        loading: false,
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  // Summarize anomaly cluster
  const summarizeAnomalyCluster = useCallback(async (cluster: AnomalyCluster): Promise<SummaryResult> => {
    if (!isSummarizationAvailable()) {
      const fallbackSummary: SummaryResult = {
        summary: 'Summarization service is not available.',
        confidence: 0,
        method: 'template_fallback',
        tokensApprox: 0,
        generatedAt: new Date().toISOString(),
        metadata: {
          processingTime: 0,
          fallbackReason: 'Service disabled'
        }
      };
      return fallbackSummary;
    }

    const cacheKey = generateCacheKey('anomaly_cluster', cluster);
    
    // Check cache first
    if (enableCaching) {
      const cached = summaryCache.get(cacheKey);
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.summary;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const summary = await summarizationService.summarizeAnomalyCluster(cluster);
      
      // Cache the result
      if (enableCaching) {
        summaryCache.set(cacheKey, {
          summary,
          timestamp: Date.now()
        });
      }

      // Update state
      setState(prev => ({
        ...prev,
        summaries: new Map(prev.summaries).set(cacheKey, summary),
        loading: false
      }));

      return summary;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to summarize anomaly cluster'
      }));
      throw error;
    }
  }, [generateCacheKey, enableCaching, isCacheValid, summaryCache]);

  // Summarize causal delta
  const summarizeCausalDelta = useCallback(async (delta: CausalGraphDelta): Promise<SummaryResult> => {
    if (!isSummarizationAvailable()) {
      const fallbackSummary: SummaryResult = {
        summary: 'Summarization service is not available.',
        confidence: 0,
        method: 'template_fallback',
        tokensApprox: 0,
        generatedAt: new Date().toISOString(),
        metadata: {
          processingTime: 0,
          fallbackReason: 'Service disabled'
        }
      };
      return fallbackSummary;
    }

    const cacheKey = generateCacheKey('causal_delta', delta);
    
    // Check cache first
    if (enableCaching) {
      const cached = summaryCache.get(cacheKey);
      if (cached && isCacheValid(cached.timestamp)) {
        return cached.summary;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const summary = await summarizationService.summarizeCausalDelta(delta);
      
      // Cache the result
      if (enableCaching) {
        summaryCache.set(cacheKey, {
          summary,
          timestamp: Date.now()
        });
      }

      // Update state
      setState(prev => ({
        ...prev,
        summaries: new Map(prev.summaries).set(cacheKey, summary),
        loading: false
      }));

      return summary;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to summarize causal delta'
      }));
      throw error;
    }
  }, [generateCacheKey, enableCaching, isCacheValid, summaryCache]);

  // Get summary by key
  const getSummary = useCallback((key: string) => {
    return state.summaries.get(key);
  }, [state.summaries]);

  // Clear summaries
  const clearSummaries = useCallback(() => {
    setState(prev => ({
      ...prev,
      summaries: new Map()
    }));
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    summaryCache.clear();
    setState(prev => ({
      ...prev,
      summaries: new Map()
    }));
  }, [summaryCache]);

  // Set remote endpoint
  const setRemoteEndpoint = useCallback((endpoint: string) => {
    if (!isSummarizationAvailable()) return;
    
    try {
      summarizationService.setRemoteEndpoint(endpoint);
      refresh(); // Refresh capabilities after setting endpoint
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to set remote endpoint'
      }));
    }
  }, [refresh]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cache cleanup effect
  useEffect(() => {
    if (!enableCaching) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      summaryCache.forEach((value, key) => {
        if (!isCacheValid(value.timestamp)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => summaryCache.delete(key));
    }, cacheExpiry / 2); // Cleanup twice as often as expiry

    return () => clearInterval(cleanupInterval);
  }, [enableCaching, cacheExpiry, summaryCache, isCacheValid]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cache cleanup effect
  useEffect(() => {
    if (!enableCaching) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      summaryCache.forEach((value, key) => {
        if (!isCacheValid(value.timestamp)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => summaryCache.delete(key));
    }, cacheExpiry / 2); // Cleanup twice as often as expiry

    return () => clearInterval(cleanupInterval);
  }, [enableCaching, cacheExpiry, summaryCache, isCacheValid]);

  const actions: SemanticSummariesActions = {
    refresh,
    summarizeAnomalyCluster,
    summarizeCausalDelta,
    getSummary,
    clearSummaries,
    clearCache,
    setRemoteEndpoint
  };

  return [state, actions];
}

/**
 * Hook for batch summarization
 */
export function useBatchSummarization() {
  const [state, actions] = useSemanticSummaries({ enableCaching: true });
  const [batchJobs, setBatchJobs] = useState<Map<string, {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    result?: SummaryResult;
    error?: string;
  }>>(new Map());

  const processBatch = useCallback(async (
    items: Array<{ id: string; type: 'anomaly_cluster' | 'causal_delta'; data: any }>
  ) => {
    const batchId = `batch_${Date.now()}`;
    
    // Initialize batch jobs
    const initialJobs = new Map();
    items.forEach(item => {
      initialJobs.set(item.id, {
        status: 'pending' as const,
        progress: 0
      });
    });
    setBatchJobs(initialJobs);

    // Process items sequentially to avoid overwhelming the service
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      
      try {
        setBatchJobs(prev => new Map(prev).set(item.id, {
          ...prev.get(item.id)!,
          status: 'processing',
          progress: 0
        }));

        let result: SummaryResult;
        if (item.type === 'anomaly_cluster') {
          result = await actions.summarizeAnomalyCluster(item.data);
        } else {
          result = await actions.summarizeCausalDelta(item.data);
        }

        setBatchJobs(prev => new Map(prev).set(item.id, {
          status: 'completed',
          progress: 100,
          result
        }));

      } catch (error) {
        setBatchJobs(prev => new Map(prev).set(item.id, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }
  }, [actions]);

  const getBatchStatus = useCallback(() => {
    const jobs = Array.from(batchJobs.values());
    const completed = jobs.filter(job => job.status === 'completed').length;
    const errors = jobs.filter(job => job.status === 'error').length;
    const processing = jobs.filter(job => job.status === 'processing').length;
    
    return {
      total: jobs.length,
      completed,
      errors,
      processing,
      progress: jobs.length > 0 ? (completed / jobs.length) * 100 : 0,
      isComplete: jobs.length > 0 && completed + errors === jobs.length
    };
  }, [batchJobs]);

  const clearBatch = useCallback(() => {
    setBatchJobs(new Map());
  }, []);

  return {
    batchJobs,
    processBatch,
    getBatchStatus,
    clearBatch,
    summaryState: state,
    summaryActions: actions
  };
}

/**
 * Hook for summary quality metrics
 */
export function useSummaryQuality() {
  const [, actions] = useSemanticSummaries();

  const evaluateSummary = useCallback((summary: SummaryResult): {
    score: number;
    factors: {
      confidence: number;
      length: number;
      method: number;
      speed: number;
    };
    recommendation: string;
  } => {
    const factors = {
      confidence: summary.confidence,
      length: Math.min(1, summary.summary.length / 200), // Optimal around 200 chars
      method: summary.method === 'local_model' ? 1 : summary.method === 'remote_endpoint' ? 0.8 : 0.5,
      speed: summary.metadata.processingTime < 1000 ? 1 : summary.metadata.processingTime < 5000 ? 0.7 : 0.3
    };

    const score = (factors.confidence * 0.4 + factors.length * 0.2 + factors.method * 0.2 + factors.speed * 0.2);

    let recommendation = '';
    if (score >= 0.8) {
      recommendation = 'Excellent summary quality';
    } else if (score >= 0.6) {
      recommendation = 'Good summary quality';
    } else if (score >= 0.4) {
      recommendation = 'Acceptable summary quality, consider using a different method';
    } else {
      recommendation = 'Poor summary quality, review configuration or data';
    }

    return {
      score,
      factors,
      recommendation
    };
  }, []);

  return {
    evaluateSummary
  };
}