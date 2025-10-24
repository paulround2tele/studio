/**
 * Client Trace Debug Hook (Phase 10)
 * React hook for observability tracing
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  tracingService, 
  type TraceSpan, 
  type TraceExport,
  isTracingAvailable 
} from '@/services/observability/tracingService';

export interface UseTracingDebugOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  spanLimit?: number;
  enableStats?: boolean;
}

export interface TracingDebugState {
  spans: TraceSpan[];
  activeSpans: TraceSpan[];
  completedSpans: TraceSpan[];
  errorSpans: TraceSpan[];
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  capabilities: {
    available: boolean;
    totalSpans: number;
    activeCount: number;
    sessionId: string;
  };
  stats: {
    totalSpans: number;
    activeSpans: number;
    completedSpans: number;
    errorSpans: number;
    averageDuration: number;
    sessionId: string;
  };
}

export interface TracingDebugActions {
  refresh: () => Promise<void>;
  exportRecent: (limit?: number) => TraceExport;
  clearTraces: () => void;
  getSpan: (spanId: string) => TraceSpan | undefined;
  filterByOperation: (operation: string) => TraceSpan[];
  filterByStatus: (status: TraceSpan['status']) => TraceSpan[];
  getSpanDuration: (spanId: string) => number | null;
}

/**
 * Hook for tracing debug functionality
 */
export function useClientTraceDebug(options: UseTracingDebugOptions = {}): [TracingDebugState, TracingDebugActions] {
  const {
    autoRefresh = false,
    refreshInterval = 5000, // 5 seconds
    spanLimit = 100,
    enableStats = true
  } = options;

  const [state, setState] = useState<TracingDebugState>({
    spans: [],
    activeSpans: [],
    completedSpans: [],
    errorSpans: [],
    loading: false,
    error: null,
    lastUpdate: null,
    capabilities: {
      available: isTracingAvailable(),
      totalSpans: 0,
      activeCount: 0,
      sessionId: ''
    },
    stats: {
      totalSpans: 0,
      activeSpans: 0,
      completedSpans: 0,
      errorSpans: 0,
      averageDuration: 0,
      sessionId: ''
    }
  });

  // Refresh function
  const refresh = useCallback(async () => {
    if (!isTracingAvailable()) {
      setState(prev => ({
        ...prev,
        error: 'Tracing service is not available'
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const spans = tracingService.getRecentSpans(spanLimit);
      const stats = enableStats ? tracingService.getStats() : {
        totalSpans: 0,
        activeSpans: 0,
        completedSpans: 0,
        errorSpans: 0,
        averageDuration: 0,
        sessionId: ''
      };

      const activeSpans = spans.filter(span => span.status === 'started');
      const completedSpans = spans.filter(span => span.status === 'completed');
      const errorSpans = spans.filter(span => span.status === 'error');

      setState(prev => ({
        ...prev,
        spans,
        activeSpans,
        completedSpans,
        errorSpans,
        stats,
        loading: false,
        lastUpdate: new Date().toISOString(),
        capabilities: {
          available: true,
          totalSpans: spans.length,
          activeCount: activeSpans.length,
          sessionId: stats.sessionId
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [spanLimit, enableStats]);

  // Export recent traces
  const exportRecent = useCallback((limit?: number): TraceExport => {
    if (!isTracingAvailable()) {
      return {
        spans: [],
        exportedAt: new Date().toISOString(),
        sessionId: '',
        version: '1.0.0',
        metadata: {
          totalSpans: 0,
          completedSpans: 0,
          errorSpans: 0,
          timeRange: { start: 0, end: 0 }
        }
      };
    }

    return tracingService.exportRecent(limit);
  }, []);

  // Clear traces
  const clearTraces = useCallback(() => {
    if (!isTracingAvailable()) return;

    try {
      tracingService.clear();
      setState(prev => ({
        ...prev,
        spans: [],
        activeSpans: [],
        completedSpans: [],
        errorSpans: [],
        capabilities: {
          ...prev.capabilities,
          totalSpans: 0,
          activeCount: 0
        },
        stats: {
          ...prev.stats,
          totalSpans: 0,
          activeSpans: 0,
          completedSpans: 0,
          errorSpans: 0
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear traces'
      }));
    }
  }, []);

  // Get span by ID
  const getSpan = useCallback((spanId: string) => {
    if (!isTracingAvailable()) return undefined;
    return tracingService.getSpan(spanId);
  }, []);

  // Filter spans by operation
  const filterByOperation = useCallback((operation: string) => {
    return state.spans.filter(span => span.operation === operation);
  }, [state.spans]);

  // Filter spans by status
  const filterByStatus = useCallback((status: TraceSpan['status']) => {
    return state.spans.filter(span => span.status === status);
  }, [state.spans]);

  // Get span duration
  const getSpanDuration = useCallback((spanId: string) => {
    const span = getSpan(spanId);
    return span?.duration || null;
  }, [getSpan]);

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

  const actions: TracingDebugActions = {
    refresh,
    exportRecent,
    clearTraces,
    getSpan,
    filterByOperation,
    filterByStatus,
    getSpanDuration
  };

  return [state, actions];
}

/**
 * Hook for span lifecycle tracking
 */
export function useSpanTracker(operation: string, attributes?: Record<string, unknown>) {
  const [spanId, setSpanId] = useState<string | null>(null);
  const [status, setStatus] = useState<TraceSpan['status'] | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const startSpan = useCallback(() => {
    if (!isTracingAvailable()) return 'noop-span';

    const id = tracingService.startSpan(operation, attributes);
    setSpanId(id);
    setStatus('started');
    setDuration(null);
    return id;
  }, [operation, attributes]);

  const endSpan = useCallback((finalStatus: 'completed' | 'error' = 'completed', error?: unknown) => {
    if (!spanId || spanId === 'noop-span') return;

    const errorInfo = error
      ? (() => {
          if (error instanceof Error) {
            const withCode = error as Error & { code?: string };
            return {
              message: withCode.message,
              stack: withCode.stack,
              code: withCode.code
            };
          }

          if (typeof error === 'string') {
            return { message: error };
          }

          if (typeof error === 'object' && error !== null) {
            const errObj = error as { message?: unknown; stack?: unknown; code?: unknown };
            return {
              message: typeof errObj.message === 'string' ? errObj.message : 'Unknown error',
              stack: typeof errObj.stack === 'string' ? errObj.stack : undefined,
              code: typeof errObj.code === 'string' ? errObj.code : undefined
            };
          }

          return { message: 'Unknown error' };
        })()
      : undefined;

    tracingService.endSpan(spanId, finalStatus, errorInfo);
    setStatus(finalStatus);

    // Get final duration
    const span = tracingService.getSpan(spanId);
    if (span?.duration) {
      setDuration(span.duration);
    }
  }, [spanId]);

  const addAttributes = useCallback((newAttributes: Record<string, unknown>) => {
    if (!spanId || spanId === 'noop-span') return;
    tracingService.addSpanAttributes(spanId, newAttributes);
  }, [spanId]);

  const addTags = useCallback((tags: string[]) => {
    if (!spanId || spanId === 'noop-span') return;
    tracingService.addSpanTags(spanId, tags);
  }, [spanId]);

  const addLog = useCallback((level: 'debug' | 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>) => {
    if (!spanId || spanId === 'noop-span') return;
    tracingService.addSpanLog(spanId, level, message, fields);
  }, [spanId]);

  return {
    spanId,
    status,
    duration,
    startSpan,
    endSpan,
    addAttributes,
    addTags,
    addLog,
    isActive: status === 'started'
  };
}

/**
 * Hook for operation performance monitoring
 */
export function useOperationMonitor(operation: string) {
  const [state] = useClientTraceDebug({ autoRefresh: true, refreshInterval: 10000 });

  const operationStats = useMemo(() => {
    const operationSpans = state.spans.filter(span => span.operation === operation);
    
    if (operationSpans.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
        recentCalls: [],
        lastCall: null
      };
    }

    const completedSpans = operationSpans.filter(span => span.status === 'completed' && span.duration);
    const errorSpans = operationSpans.filter(span => span.status === 'error');
    
    const averageDuration = completedSpans.length > 0
      ? completedSpans.reduce((sum, span) => sum + (span.duration || 0), 0) / completedSpans.length
      : 0;

    const successRate = operationSpans.length > 0
      ? (completedSpans.length / operationSpans.length) * 100
      : 0;

    const errorRate = operationSpans.length > 0
      ? (errorSpans.length / operationSpans.length) * 100
      : 0;

    const recentCalls = operationSpans
      .slice(-10)
      .map(span => ({
        id: span.id,
        startTime: span.startTime,
        duration: span.duration,
        status: span.status
      }));

    const lastCall = operationSpans.length > 0 
      ? operationSpans[operationSpans.length - 1] 
      : null;

    return {
      count: operationSpans.length,
      averageDuration,
      successRate,
      errorRate,
      recentCalls,
      lastCall
    };
  }, [state.spans, operation]);

  return operationStats;
}

/**
 * Hook for trace export utilities
 */
export function useTraceExport() {
  const [, actions] = useClientTraceDebug();

  const exportToJson = useCallback((limit?: number) => {
    const exportData = actions.exportRecent(limit);
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `traces-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [actions]);

  const exportToCsv = useCallback((limit?: number) => {
    const exportData = actions.exportRecent(limit);
    
    const headers = ['ID', 'Operation', 'Status', 'Start Time', 'Duration (ms)', 'Error'];
    const rows = exportData.spans.map(span => [
      span.id,
      span.operation,
      span.status,
      new Date(span.startTime).toISOString(),
      span.duration?.toFixed(2) || '',
      span.error?.message || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `traces-${new Date().toISOString().slice(0, 19)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [actions]);

  return {
    exportToJson,
    exportToCsv
  };
}