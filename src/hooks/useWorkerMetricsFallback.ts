/**
 * Worker Metrics Fallback Hook (Phase 4)
 * Hook for using Web Worker for large domain classification
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DomainMetricsInput } from '@/types/campaignMetrics';

const DEFAULT_THRESHOLD = 4000;

/**
 * Resolve worker script URL in environments that may not provide the URL constructor (e.g., Jest)
 */
const resolveWorkerScript = (): string | URL => {
  if (typeof URL === 'function') {
    try {
      return new URL('../workers/metricsWorker.ts', import.meta.url);
    } catch {
      // Fall through to string fallback when bundler metadata is unavailable
    }
  }

  return '/workers/metricsWorker.js';
};

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
  const [workerReady, setWorkerReady] = useState(false);
  
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
      setWorkerReady(false);
      return;
    }

    if (typeof Worker === 'undefined') {
      setError(new Error('Worker not supported in this environment'));
      setIsLoading(false);
      setWorkerReady(false);
      return;
    }

    try {
      const workerScript = resolveWorkerScript();
      workerRef.current = new Worker(workerScript, { type: 'module' });
      setWorkerReady(true);

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
            timingMs: workerTiming ?? 0
          });
          setTimingMs(workerTiming ?? null);
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
        setWorkerReady(false);
        pendingRequestRef.current = null;
      };

    } catch (err) {
      console.warn('Failed to create worker, falling back to main thread:', err);
      setError(err instanceof Error ? err : new Error('Worker initialization failed'));
      setIsLoading(false);
      setWorkerReady(false);
      workerRef.current = null;
      return;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setWorkerReady(false);
    };
  }, [shouldUseWorker]);

  // Compute metrics
  const computeMetrics = useCallback(() => {
    if (!shouldUseWorker || !workerReady || !workerRef.current) {
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
  }, [domains, shouldUseWorker, workerReady]);

  // Trigger computation when domains change
  useEffect(() => {
    if (!shouldUseWorker || domains.length === 0) {
      setResult(null);
      setError(null);
      setTimingMs(null);
      setIsLoading(false);
      return;
    }

    if (!workerReady) {
      setIsLoading(true);
      return;
    }

    computeMetrics();
  }, [domains, computeMetrics, shouldUseWorker, workerReady]);

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