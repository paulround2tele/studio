/**
 * Portfolio Metrics Hook (Phase 5)
 * Aggregates multiple campaigns and detects outliers
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import { 
  computePortfolioAggregate,
  detectPortfolioOutliers,
  isPortfolioMetricsAvailable,
  type PortfolioSummary,
  type PortfolioOutlier,
  type CampaignTimeline 
} from '@/services/campaignMetrics/portfolioMetricsService';

/**
 * Portfolio metrics hook options
 */
export interface UsePortfolioMetricsOptions {
  enabled?: boolean;
  autoUpdate?: boolean;
  minCampaigns?: number;
}

/**
 * Portfolio metrics hook return type
 */
export interface UsePortfolioMetricsReturn {
  summary: PortfolioSummary | null;
  outliers: PortfolioOutlier[];
  loading: boolean;
  error: string | null;
  isEnabled: boolean;
  campaignCount: number;
  refresh: () => void;
  lastUpdate: string | null;
}

/**
 * Hook for portfolio metrics across multiple campaigns
 */
export function usePortfolioMetrics(
  campaignTimelines: CampaignTimeline[],
  options: UsePortfolioMetricsOptions = {}
): UsePortfolioMetricsReturn {
  const {
    enabled = true,
    autoUpdate = true,
    minCampaigns = 2
  } = options;

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [outliers, setOutliers] = useState<PortfolioOutlier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Check if portfolio metrics are available and sufficient campaigns exist
  const isEnabled = useMemo(() => {
    return enabled && 
           isPortfolioMetricsAvailable() && 
           campaignTimelines.length >= minCampaigns;
  }, [enabled, campaignTimelines.length, minCampaigns]);

  /**
   * Compute portfolio metrics
   */
  const computeMetrics = useCallback(() => {
    if (!isEnabled) {
      setSummary(null);
      setOutliers([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = Date.now();

      // Compute portfolio aggregate summary
      const portfolioSummary = computePortfolioAggregate(campaignTimelines);
      
      // Detect portfolio outliers
      const portfolioOutliers = detectPortfolioOutliers(campaignTimelines);

      setSummary(portfolioSummary);
      setOutliers(portfolioOutliers);
      setLastUpdate(new Date().toISOString());

      const duration = Date.now() - startTime;
      console.log(`[usePortfolioMetrics] Computed portfolio metrics for ${campaignTimelines.length} campaigns in ${duration}ms`);
      console.log(`Portfolio summary:`, portfolioSummary);
      console.log(`Found ${portfolioOutliers.length} outliers`);
    } catch (computeError) {
      const errorMessage = computeError instanceof Error 
        ? computeError.message 
        : 'Portfolio metrics computation failed';
      
      setError(errorMessage);
      setSummary(null);
      setOutliers([]);
      console.warn('[usePortfolioMetrics] Computation failed:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, campaignTimelines]);

  /**
   * Auto-update when campaign timelines change
   */
  useEffect(() => {
    if (autoUpdate && isEnabled) {
      // Debounce computation to avoid excessive runs
      const timeoutId = setTimeout(computeMetrics, 500);
      return () => clearTimeout(timeoutId);
    } else if (!isEnabled) {
      // Clear data when disabled
      setSummary(null);
      setOutliers([]);
      setError(null);
    }
  }, [autoUpdate, isEnabled, computeMetrics]);

  /**
   * Refresh function for manual updates
   */
  const refresh = useCallback(() => {
    computeMetrics();
  }, [computeMetrics]);

  return {
    summary,
    outliers,
    loading,
    error,
    isEnabled,
    campaignCount: campaignTimelines.length,
    refresh,
    lastUpdate
  };
}

export default usePortfolioMetrics;