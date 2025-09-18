/**
 * Worker Metrics Fallback Hook (Phase 4)
 * Hook for using Web Worker for large domain classification
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DomainMetricsInput } from '@/types/campaignMetrics';

// Feature flags
const ENABLE_WORKER_METRICS = process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS !== 'false';
const DEFAULT_THRESHOLD = 4000;

interface WorkerMessage {
  type: 'compute' | 'result' | 'error';
  id?: string;
  domains?: any[];
  aggregates?: any;
  classifiedCounts?: any;
  error?: string;
  timingMs?: number;
}

interface WorkerResult {
  aggregates: any;
  classifiedCounts: any;
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
  const {
    threshold = DEFAULT_THRESHOLD,
    enabled = ENABLE_WORKER_METRICS
  } = options;

  const [result, setResult] = useState<WorkerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timingMs, setTimingMs] = useState<number | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const pendingRequestRef = useRef<string | null>(null);

  // Determine if we should use worker
  const shouldUseWorker = enabled && domains.length >= threshold;

  // Initialize worker
  useEffect(() => {
    if (!shouldUseWorker || typeof Worker === 'undefined') {
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
      workerRef.current = null;
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