/**
 * Campaign Progress Hook (Phase 3)
 * Wraps progressStream for real-time progress updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProgressUpdate } from '@/types/campaignMetrics';
import { 
  ProgressStream, 
  createProgressStream, 
  createMockProgressStream,
  ProgressStreamOptions 
} from '@/services/campaignMetrics/progressStream';

// Feature flag check
const ENABLE_REALTIME_PROGRESS = process.env.NEXT_PUBLIC_ENABLE_REALTIME_PROGRESS === 'true';
const USE_MOCK_PROGRESS = process.env.NODE_ENV === 'development';

export interface UseCampaignProgressOptions {
  /**
   * Campaign ID to track progress for
   */
  campaignId: string;
  
  /**
   * Whether to use SSE (default true)
   */
  useSSE?: boolean;
  
  /**
   * Polling interval in ms (default 5000)
   */
  pollingInterval?: number;
  
  /**
   * Maximum retry attempts (default 3)
   */
  maxRetries?: number;
  
  /**
   * Whether to auto-start the stream (default true)
   */
  autoStart?: boolean;
  
  /**
   * Use mock stream for development/demo (default false)
   */
  useMock?: boolean;
}

export interface UseCampaignProgressReturn {
  /**
   * Latest progress update
   */
  progress: ProgressUpdate | null;
  
  /**
   * Whether real-time progress is enabled
   */
  isEnabled: boolean;
  
  /**
   * Whether stream is currently connected
   */
  isConnected: boolean;
  
  /**
   * Whether stream has completed (terminal phase reached)
   */
  isCompleted: boolean;
  
  /**
   * Latest error from stream
   */
  error: Error | null;
  
  /**
   * Manual control functions
   */
  controls: {
    start: () => void;
    stop: () => void;
    restart: () => void;
  };
  
  /**
   * Progress statistics
   */
  stats: {
    percentage: number;
    analyzedDomains: number;
    totalDomains: number;
    estimatedTimeRemaining?: string;
  };
}

/**
 * Hook for real-time campaign progress updates
 */
export function useCampaignProgress(
  options: UseCampaignProgressOptions
): UseCampaignProgressReturn {
  const {
    campaignId,
    useSSE = true,
    pollingInterval = 5000,
    maxRetries = 3,
    autoStart = true,
    useMock = USE_MOCK_PROGRESS
  } = options;

  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const streamRef = useRef<ProgressStream | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Create stream instance
  const createStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.destroy();
    }

    const streamOptions: ProgressStreamOptions = {
      campaignId,
      useSSE,
      pollingInterval,
      maxRetries
    };

    const callbacks = {
      onUpdate: (update: ProgressUpdate) => {
        setProgress(update);
        setError(null);
        
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
      },
      
      onError: (err: Error) => {
        setError(err);
        setIsConnected(false);
      },
      
      onComplete: () => {
        setIsCompleted(true);
        setIsConnected(false);
      },
      
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      
      onDisconnect: () => {
        setIsConnected(false);
      }
    };

    // Use mock stream in development or when specified
    if (useMock) {
      streamRef.current = createMockProgressStream(streamOptions, callbacks);
    } else {
      streamRef.current = createProgressStream(streamOptions, callbacks);
    }

    return streamRef.current;
  }, [campaignId, useSSE, pollingInterval, maxRetries, useMock]);

  // Start stream
  const start = useCallback(() => {
    if (!ENABLE_REALTIME_PROGRESS) {
      return;
    }

    setIsCompleted(false);
    setError(null);
    startTimeRef.current = null;
    
    const stream = createStream();
    stream.start().catch(setError);
  }, [createStream]);

  // Stop stream
  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.stop();
    }
    setIsConnected(false);
  }, []);

  // Restart stream
  const restart = useCallback(() => {
    stop();
    setTimeout(start, 1000); // Brief delay before restart
  }, [start, stop]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && ENABLE_REALTIME_PROGRESS) {
      start();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.destroy();
      }
    };
  }, [autoStart, start]);

  // Calculate progress statistics
  const stats = useMemo(() => {
    if (!progress) {
      return {
        percentage: 0,
        analyzedDomains: 0,
        totalDomains: 0
      };
    }

    const analyzed = progress.analyzedDomains || 0;
    const total = progress.totalDomains || 0;
    const percentage = total > 0 ? Math.round((analyzed / total) * 100) : 0;

    // Estimate time remaining based on current progress
    let estimatedTimeRemaining: string | undefined;
    if (startTimeRef.current && analyzed > 0 && total > analyzed) {
      const elapsedMs = Date.now() - startTimeRef.current;
      const ratePerMs = analyzed / elapsedMs;
      const remainingDomains = total - analyzed;
      const estimatedRemainingMs = remainingDomains / ratePerMs;
      
      const minutes = Math.ceil(estimatedRemainingMs / 60000);
      estimatedTimeRemaining = minutes > 1 ? `~${minutes} min` : '<1 min';
    }

    return {
      percentage,
      analyzedDomains: analyzed,
      totalDomains: total,
      estimatedTimeRemaining
    };
  }, [progress]);

  return {
    progress,
    isEnabled: ENABLE_REALTIME_PROGRESS,
    isConnected,
    isCompleted,
    error,
    controls: {
      start,
      stop,
      restart
    },
    stats
  };
}

/**
 * Hook for checking if progress updates are available
 */
export function useProgressAvailability(campaignId: string): boolean {
  return useMemo(() => {
    return ENABLE_REALTIME_PROGRESS && !!campaignId;
  }, [campaignId]);
}

/**
 * Hook for formatting progress phase names for display
 */
export function useFormattedPhase(phase: string): string {
  return useMemo(() => {
    const phaseMap: Record<string, string> = {
      'initializing': 'Initializing',
      'dns_validation': 'DNS Validation', 
      'http_validation': 'HTTP Validation',
      'enrichment': 'Data Enrichment',
      'analysis': 'Analysis',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    };

    return phaseMap[phase.toLowerCase()] || phase;
  }, [phase]);
}