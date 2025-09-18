/**
 * Anomaly Recommendations Hook (Phase 5)
 * Runs anomaly detection on timeline and generates recommendations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import { 
  detectAnomalies, 
  getAnomalyThresholds,
  isAnomalyDetectionAvailable,
  type Anomaly,
  type AnomalyConfig 
} from '@/services/campaignMetrics/anomalyService';
import { 
  pipelineRecommendationsV3,
  isAnomalyRecommendationsAvailable,
  type EnhancedRecommendation 
} from '@/services/campaignMetrics/recommendationsV3Pipeline';
import { telemetryService } from '@/services/campaignMetrics/telemetryService';

/**
 * Anomaly recommendations hook options
 */
export interface UseAnomalyRecommendationsOptions {
  enabled?: boolean;
  config?: Partial<AnomalyConfig>;
  autoDetect?: boolean;
}

/**
 * Anomaly recommendations hook return type
 */
export interface UseAnomalyRecommendationsReturn {
  anomalies: Anomaly[];
  recommendations: EnhancedRecommendation[];
  loading: boolean;
  error: string | null;
  lastDetection: string | null;
  runDetection: () => void;
  anomalyCount: number;
  isEnabled: boolean;
}

/**
 * Hook for anomaly-based recommendations
 */
export function useAnomalyRecommendations(
  campaignId: string,
  snapshots: AggregateSnapshot[],
  baselineRecommendations: EnhancedRecommendation[] = [],
  options: UseAnomalyRecommendationsOptions = {}
): UseAnomalyRecommendationsReturn {
  const {
    enabled = true,
    config = {},
    autoDetect = true
  } = options;

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<string | null>(null);

  // Check if anomaly detection is available
  const isEnabled = useMemo(() => {
    return enabled && 
           isAnomalyDetectionAvailable() && 
           isAnomalyRecommendationsAvailable() &&
           snapshots.length > 0;
  }, [enabled, snapshots.length]);

  // Get anomaly detection configuration
  const anomalyConfig = useMemo(() => {
    const defaultConfig = getAnomalyThresholds();
    return { ...defaultConfig, ...config };
  }, [config]);

  /**
   * Run anomaly detection
   */
  const runDetection = useCallback(() => {
    if (!isEnabled || snapshots.length === 0) {
      setAnomalies([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const detectedAnomalies = detectAnomalies(snapshots, anomalyConfig);
      
      setAnomalies(detectedAnomalies);
      setLastDetection(new Date().toISOString());

      // Emit telemetry event
      telemetryService.emitAnomalyDetect({
        campaignId,
        anomalies: detectedAnomalies.length
      });

      console.log(`[useAnomalyRecommendations] Detected ${detectedAnomalies.length} anomalies in ${Date.now() - startTime}ms`);
    } catch (detectionError) {
      const errorMessage = detectionError instanceof Error 
        ? detectionError.message 
        : 'Anomaly detection failed';
      
      setError(errorMessage);
      setAnomalies([]);
      console.warn('[useAnomalyRecommendations] Detection failed:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, snapshots, anomalyConfig, campaignId]);

  /**
   * Generate enhanced recommendations using V3 pipeline
   */
  const recommendations = useMemo(() => {
    if (!isEnabled) {
      return baselineRecommendations;
    }

    try {
      return pipelineRecommendationsV3(baselineRecommendations, anomalies);
    } catch (pipelineError) {
      console.warn('[useAnomalyRecommendations] Pipeline failed:', pipelineError);
      return baselineRecommendations;
    }
  }, [isEnabled, baselineRecommendations, anomalies]);

  /**
   * Auto-run detection when snapshots change
   */
  useEffect(() => {
    if (autoDetect && isEnabled) {
      // Debounce detection to avoid excessive runs
      const timeoutId = setTimeout(runDetection, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [autoDetect, isEnabled, runDetection]);

  /**
   * Reset state when campaign changes
   */
  useEffect(() => {
    setAnomalies([]);
    setError(null);
    setLastDetection(null);
  }, [campaignId]);

  return {
    anomalies,
    recommendations,
    loading,
    error,
    lastDetection,
    runDetection,
    anomalyCount: anomalies.length,
    isEnabled
  };
}

export default useAnomalyRecommendations;