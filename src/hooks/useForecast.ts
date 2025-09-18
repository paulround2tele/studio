/**
 * useForecast Hook (Phase 6)
 * Manages forecast data with server-first approach and client fallback
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import {
  getServerForecast,
  computeClientForecast,
  extractTimeSeriesFromSnapshots,
  getDefaultHorizon,
  isForecastAvailable,
  ForecastResult,
  ForecastPoint
} from '@/services/campaignMetrics/forecastService';

/**
 * Forecast hook configuration
 */
export interface ForecastConfig {
  horizon: number;
  metricKey: keyof AggregateSnapshot['aggregates'];
  enableServerFetch: boolean;
  enableClientFallback: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
}

/**
 * Default forecast configuration
 */
const DEFAULT_CONFIG: ForecastConfig = {
  horizon: getDefaultHorizon(),
  metricKey: 'avgLeadScore',
  enableServerFetch: true,
  enableClientFallback: true,
  autoRefresh: false,
  refreshInterval: 5 * 60 * 1000 // 5 minutes
};

/**
 * Forecast hook state
 */
export interface ForecastState {
  forecast: ForecastPoint[] | null;
  loading: boolean;
  error: string | null;
  method: 'server' | 'client' | null;
  lastUpdated: string | null;
  timingMs: number;
}

/**
 * Forecast hook return type
 */
export interface UseForecastReturn extends ForecastState {
  refreshForecast: () => Promise<void>;
  clearForecast: () => void;
  config: ForecastConfig;
  updateConfig: (newConfig: Partial<ForecastConfig>) => void;
}

/**
 * Forecast hook implementation
 */
export function useForecast(
  campaignId: string,
  snapshots: AggregateSnapshot[],
  initialConfig: Partial<ForecastConfig> = {}
): UseForecastReturn {
  const [config, setConfig] = useState<ForecastConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });

  const [state, setState] = useState<ForecastState>({
    forecast: null,
    loading: false,
    error: null,
    method: null,
    lastUpdated: null,
    timingMs: 0
  });

  // Extract time series from snapshots for the configured metric
  const timeSeries = useMemo(() => {
    if (!isForecastAvailable() || snapshots.length === 0) {
      return [];
    }
    
    return extractTimeSeriesFromSnapshots(snapshots, config.metricKey);
  }, [snapshots, config.metricKey]);

  // Forecast computation function
  const computeForecast = useCallback(async (): Promise<void> => {
    if (!isForecastAvailable() || !campaignId || timeSeries.length < 8) {
      setState(prev => ({
        ...prev,
        forecast: null,
        error: timeSeries.length < 8 ? 'Insufficient data for forecasting (minimum 8 points required)' : null,
        method: null
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    const startTime = performance.now();

    try {
      let forecastResult: ForecastResult | null = null;

      // Try server forecast first if enabled
      if (config.enableServerFetch) {
        try {
          const serverForecast = await getServerForecast(campaignId, config.horizon);
          forecastResult = {
            ...serverForecast,
            timingMs: performance.now() - startTime,
            // Map confidence to residualVariance for type compatibility
            qualityMetrics: serverForecast.qualityMetrics ? {
              mae: serverForecast.qualityMetrics.mae,
              mape: serverForecast.qualityMetrics.mape,
              residualVariance: serverForecast.qualityMetrics.confidence || 0
            } : undefined
          };
          
          // Emit telemetry for server forecast
          emitForecastTelemetry(campaignId, config.horizon, 'server', forecastResult.timingMs || 0);
          
        } catch (serverError) {
          console.warn('[useForecast] Server forecast failed:', serverError);
          
          // Continue to client fallback if enabled
          if (!config.enableClientFallback) {
            throw serverError;
          }
        }
      }

      // Use client fallback if server failed or disabled
      if (!forecastResult && config.enableClientFallback) {
        const clientStartTime = performance.now();
        const clientForecast = computeClientForecast(timeSeries, config.horizon);
        const clientTimingMs = performance.now() - clientStartTime;
        
        forecastResult = {
          horizon: config.horizon,
          generatedAt: new Date().toISOString(),
          method: 'client',
          points: clientForecast,
          timingMs: clientTimingMs
        };

        // Emit telemetry for client forecast
        emitForecastTelemetry(campaignId, config.horizon, 'client', clientTimingMs);
      }

      // Update state with results
      setState(prev => ({
        ...prev,
        loading: false,
        forecast: forecastResult?.points || null,
        method: forecastResult?.method || null,
        lastUpdated: forecastResult?.generatedAt || null,
        timingMs: forecastResult?.timingMs || 0,
        error: null
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Forecast computation failed',
        forecast: null,
        method: null
      }));
    }
  }, [campaignId, timeSeries, config]);

  // Initial forecast computation
  useEffect(() => {
    computeForecast();
  }, [computeForecast]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!config.autoRefresh || config.refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      computeForecast();
    }, config.refreshInterval);

    return () => clearInterval(intervalId);
  }, [config.autoRefresh, config.refreshInterval, computeForecast]);

  // Configuration update function
  const updateConfig = useCallback((newConfig: Partial<ForecastConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Manual refresh function
  const refreshForecast = useCallback(async () => {
    await computeForecast();
  }, [computeForecast]);

  // Clear forecast function
  const clearForecast = useCallback(() => {
    setState({
      forecast: null,
      loading: false,
      error: null,
      method: null,
      lastUpdated: null,
      timingMs: 0
    });
  }, []);

  return {
    ...state,
    refreshForecast,
    clearForecast,
    config,
    updateConfig
  };
}

/**
 * Emit forecast telemetry event
 */
function emitForecastTelemetry(
  campaignId: string,
  horizon: number,
  method: 'server' | 'client',
  durationMs: number
): void {
  try {
    const telemetryEvent = {
      event: 'forecast_compute',
      timestamp: new Date().toISOString(),
      data: {
        campaignId,
        horizon,
        method,
        durationMs,
        points: horizon // For simplicity, assume points = horizon
      }
    };

    console.info('[useForecast] Forecast telemetry:', telemetryEvent);
    
    // TODO: Integrate with actual telemetry service
    // telemetryService.emit(telemetryEvent);
  } catch (error) {
    console.warn('[useForecast] Telemetry emission failed:', error);
  }
}

/**
 * Simplified forecast hook for quick usage
 */
export function useSimpleForecast(
  campaignId: string,
  snapshots: AggregateSnapshot[],
  metricKey: keyof AggregateSnapshot['aggregates'] = 'avgLeadScore'
): {
  forecast: ForecastPoint[] | null;
  loading: boolean;
  error: string | null;
  method: 'server' | 'client' | null;
} {
  const { forecast, loading, error, method } = useForecast(campaignId, snapshots, {
    metricKey,
    autoRefresh: false
  });

  return { forecast, loading, error, method };
}

/**
 * Check if forecasting is available for given data
 */
export function canForecast(snapshots: AggregateSnapshot[]): boolean {
  return isForecastAvailable() && snapshots.length >= 8;
}

/**
 * Get forecast readiness info
 */
export function getForecastReadiness(snapshots: AggregateSnapshot[]): {
  ready: boolean;
  reason: string;
  requiredPoints: number;
  currentPoints: number;
} {
  const currentPoints = snapshots.length;
  const requiredPoints = 8;

  if (!isForecastAvailable()) {
    return {
      ready: false,
      reason: 'Forecasting is disabled',
      requiredPoints,
      currentPoints
    };
  }

  if (currentPoints < requiredPoints) {
    return {
      ready: false,
      reason: `Need ${requiredPoints - currentPoints} more data points`,
      requiredPoints,
      currentPoints
    };
  }

  return {
    ready: true,
    reason: 'Ready for forecasting',
    requiredPoints,
    currentPoints
  };
}