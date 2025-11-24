/**
 * Worker Metrics Fallback Hook (Phase 4)
 * Hook for using Web Worker for large domain classification
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DomainMetricsInput } from '@/types/campaignMetrics';

const DEFAULT_THRESHOLD = 4000;

interface WorkerMessage {
  type: 'compute' | 'result' | 'error';
  id?: string;
  domains?: unknown[];
  aggregates?: unknown;
  classifiedCounts?: unknown;
  error?: string;
  timingMs?: number;
}

interface WorkerResult {
  aggregates: unknown;
  classifiedCounts: unknown;
  timingMs: number;
}

interface UseWorkerMetricsFallbackOptions {
  threshold?: number;
  enabled?: boolean;
}

interface UseWorkerMetricsFallbackReturn {
  result: WorkerResult | null;
  isLoading: boolean;
  error: Error | null;
  isUsingWorker: boolean;
  timingMs: number | null;
}

/**
 * Hook for computing metrics via Web Worker when domain count exceeds threshold
 */
export function useWorkerMetricsFallback(
  domains: DomainMetricsInput[],
  options: UseWorkerMetricsFallbackOptions = {}
): UseWorkerMetricsFallbackReturn {
  const envEnabled = process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS !== 'false';
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const resolvedEnabled = options.enabled ?? envEnabled;
  const shouldUseWorker = resolvedEnabled && domains.length >= threshold;

  const [result, setResult] = useState<WorkerResult | null>(null);
  const [isLoading, setIsLoading] = useState(() => shouldUseWorker && domains.length > 0);
  const [error, setError] = useState<Error | null>(null);
  const [timingMs, setTimingMs] = useState<number | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const pendingRequestRef = useRef<string | null>(null);

  // Initialize worker
  useEffect(() => {
    if (!shouldUseWorker) {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      return;
    }

    if (typeof Worker === 'undefined') {
      setError(new Error('Worker not supported in this environment'));
      setIsLoading(false);
      return;
    }

    try {
      // Create worker from URL (Next.js handles this in public folder or via webpack)
      workerRef.current = new Worker(
        new URL('../workers/metricsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, id, aggregates, classifiedCounts, error: workerError, timingMs: workerTiming } = event.data;
        
        // Only process if this is the current request
        if (id !== pendingRequestRef.current) {
          return;
        }
        
        pendingRequestRef.current = null;
        setIsLoading(false);

        if (type === 'result' && aggregates && classifiedCounts) {
          setResult({
            aggregates,
            classifiedCounts,
            timingMs: workerTiming || 0
          });
          setTimingMs(workerTiming || 0);
          setError(null);
        } else if (type === 'error') {
          setError(new Error(workerError || 'Worker computation failed'));
          setResult(null);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setError(new Error('Worker failed to initialize'));
        setIsLoading(false);
        pendingRequestRef.current = null;
      };

    } catch (err) {
      console.warn('Failed to create worker, falling back to main thread:', err);
      setError(err instanceof Error ? err : new Error('Worker initialization failed'));
      setIsLoading(false);
      workerRef.current = null;
      return;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [shouldUseWorker]);

  // Compute metrics
  const computeMetrics = useCallback(() => {
    if (!shouldUseWorker || !workerRef.current) {
      if (shouldUseWorker && !workerRef.current) {
        setError(new Error('Worker unavailable'));
        setIsLoading(false);
      }
      return;
    }

    // Cancel any pending request
    if (pendingRequestRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const requestId = `req_${++requestIdRef.current}_${Date.now()}`;
    pendingRequestRef.current = requestId;

    const message: WorkerMessage = {
      type: 'compute',
      id: requestId,
      domains
    };

    try {
      workerRef.current.postMessage(message);
    } catch (err) {
      console.error('Failed to post message to worker:', err);
      setError(new Error('Failed to communicate with worker'));
      setIsLoading(false);
      pendingRequestRef.current = null;
    }
  }, [domains, shouldUseWorker]);

  useEffect(() => {
    if (shouldUseWorker && domains.length > 0) {
      setIsLoading(true);
    }
  }, [shouldUseWorker, domains.length]);

  // Trigger computation when domains change
  useEffect(() => {
    if (shouldUseWorker && domains.length > 0) {
      computeMetrics();
    } else {
      // Clear results when not using worker
      setResult(null);
      setError(null);
      setTimingMs(null);
      setIsLoading(false);
    }
  }, [domains, computeMetrics, shouldUseWorker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingRequestRef.current) {
        pendingRequestRef.current = null;
      }
    };
  }, []);

  return {
    result,
    isLoading,
    error,
    isUsingWorker: shouldUseWorker,
    timingMs
  };
}

export default useWorkerMetricsFallback;