/**
 * SSE Fallback Hook
 * Provides fallback polling when SSE events are not received
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SSEFallbackOptions {
  enabled?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxRetries?: number;
  onFallbackTriggered?: () => void;
  onStatusRefresh?: () => Promise<void>;
}

interface SSEFallbackReturn {
  isUsingFallback: boolean;
  lastEventTime: number | null;
  retryCount: number;
  resetFallback: () => void;
  triggerManualRefresh: () => Promise<void>;
}

export function useSSEFallback({
  enabled = true,
  timeoutMs = 20000, // 20 seconds
  pollIntervalMs = 5000, // 5 seconds
  maxRetries = 3,
  onFallbackTriggered,
  onStatusRefresh
}: SSEFallbackOptions): SSEFallbackReturn {
  const { toast } = useToast();
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredFallback = useRef(false);
  const retryCountRef = useRef(0);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(async () => {
      if (retryCountRef.current >= maxRetries) {
        console.warn('Max fallback retries reached, stopping polling');
        setIsUsingFallback(false);
        retryCountRef.current = 0;
        setRetryCount(0);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        toast({
          title: "Manual Refresh Required",
          description: "Please refresh the page to get the latest campaign status.",
          variant: 'default'
        });
        
        return;
      }
      
      try {
        if (onStatusRefresh) {
          await onStatusRefresh();
          setRetryCount(prev => {
            const next = prev + 1;
            retryCountRef.current = next;
            return next;
          });
        }
      } catch (error) {
        console.error('Fallback status refresh failed:', error);
        setRetryCount(prev => {
          const next = prev + 1;
          retryCountRef.current = next;
          return next;
        });
      }
    }, pollIntervalMs);
  }, [maxRetries, onStatusRefresh, pollIntervalMs, toast]);

  // Trigger fallback when no events received
  const triggerFallback = useCallback(async () => {
    if (hasTriggeredFallback.current || !enabled) {
      return;
    }
    
    hasTriggeredFallback.current = true;
    setIsUsingFallback(true);
    
    console.warn(`No SSE events received for ${timeoutMs}ms, switching to fallback polling`);
    
    if (onFallbackTriggered) {
      onFallbackTriggered();
    }
    
    toast({
      title: "Connection Issue",
      description: "Real-time updates are delayed. Switching to manual refresh mode.",
      variant: 'default'
    });
    
    startFallbackPolling();
  }, [enabled, onFallbackTriggered, startFallbackPolling, timeoutMs, toast]);

  // Reset event timer when SSE event received
  const resetEventTimer = useCallback(() => {
    setLastEventTime(Date.now());
    hasTriggeredFallback.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isUsingFallback) {
      setIsUsingFallback(false);
      retryCountRef.current = 0;
      setRetryCount(0);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        triggerFallback();
      }, timeoutMs);
    }
  }, [enabled, isUsingFallback, timeoutMs, triggerFallback]);

  // Manual refresh trigger
  const triggerManualRefresh = useCallback(async () => {
    if (onStatusRefresh) {
      try {
        await onStatusRefresh();
        toast({
          title: "Status Refreshed",
          description: "Campaign status has been updated manually.",
          variant: 'default'
        });
      } catch (error) {
        console.error('Manual refresh failed:', error);
        toast({
          title: "Refresh Failed",
          description: "Unable to refresh status. Please try again.",
          variant: 'destructive'
        });
      }
    }
  }, [onStatusRefresh, toast]);

  // Reset fallback state
  const resetFallback = useCallback(() => {
    setIsUsingFallback(false);
    retryCountRef.current = 0;
    setRetryCount(0);
    hasTriggeredFallback.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Initialize timer on mount
  useEffect(() => {
    if (enabled && !timeoutRef.current) {
      resetEventTimer();
    }
  }, [enabled, resetEventTimer]);

  return {
    isUsingFallback,
    lastEventTime,
    retryCount,
    resetFallback,
    triggerManualRefresh
  };
}

/**
 * Hook to track SSE event activity
 */
export function useSSEEventTracker(fallbackReset?: () => void) {
  const eventRef = useRef<() => void>();
  
  useEffect(() => {
    eventRef.current = fallbackReset;
  }, [fallbackReset]);

  // Call this when an SSE event is received
  const onEventReceived = useCallback(() => {
    if (eventRef.current) {
      eventRef.current();
    }
  }, []);

  return { onEventReceived };
}