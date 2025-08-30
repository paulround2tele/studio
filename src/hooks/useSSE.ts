// File: src/hooks/useSSE.ts
import { useEffect, useRef, useCallback, useState } from 'react';

export interface SSEEvent {
  id?: string;
  event: string;
  data: unknown;
  timestamp: string;
  campaign_id?: string;
  user_id?: string;
}

export interface SSEOptions {
  /**
   * Whether to automatically reconnect on connection loss
   * @default true
   */
  autoReconnect?: boolean;
  
  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
  
  /**
   * Delay between reconnection attempts in milliseconds
   * @default 3000
   */
  reconnectDelay?: number;
  
  /**
   * Headers to send with the SSE request
   */
  headers?: Record<string, string>;
  
  /**
   * Whether to include credentials in the request
   * @default true
   */
  withCredentials?: boolean;
}

export interface UseSSEReturn {
  /**
   * Current connection state
   */
  readyState: number;
  
  /**
   * Last received event
   */
  lastEvent: SSEEvent | null;
  
  /**
   * Error information if connection failed
   */
  error: string | null;
  
  /**
   * Manually reconnect to the SSE stream
   */
  reconnect: () => void;
  
  /**
   * Close the SSE connection
   */
  close: () => void;
  
  /**
   * Whether the connection is open and ready
   */
  isConnected: boolean;
  
  /**
   * Number of reconnection attempts made
   */
  reconnectAttempts: number;
}

/**
 * Advanced SSE hook with automatic reconnection and error handling
 * 
 * @param url - The SSE endpoint URL
 * @param onEvent - Callback function called when an event is received
 * @param options - SSE configuration options
 * @returns SSE connection state and control functions
 */
export function useSSE(
  url: string | null,
  onEvent?: (event: SSEEvent) => void,
  options: SSEOptions = {}
): UseSSEReturn {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 3000,
    withCredentials = true,
  } = options;

  // Runtime-safe EventSource access (SSR-friendly)
  interface SSEMessageEvent {
    data: string;
    lastEventId?: string;
    type?: string;
  }
  interface EventSourceLike {
    onopen: ((ev: Event) => void) | null;
    onerror: ((ev: Event) => void) | null;
    onmessage: ((ev: SSEMessageEvent) => void) | null;
    addEventListener: (type: string, listener: (ev: SSEMessageEvent) => void) => void;
    close: () => void;
    readyState: number;
  }
  type EventSourceCtor = new (url: string, options?: { withCredentials?: boolean }) => EventSourceLike;
  const ES: EventSourceCtor | null =
    typeof window !== 'undefined' && 'EventSource' in window
      ? (window as unknown as { EventSource: EventSourceCtor }).EventSource
      : null;
  const ES_CONNECTING = 0;
  const ES_OPEN = 1;
  const ES_CLOSED = 2;

  const eventSourceRef = useRef<EventSourceLike | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  
  const [readyState, setReadyState] = useState<number>(ES_CONNECTING);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setReadyState(ES_CLOSED);
  }, []);

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return;
    // Ensure we're in a browser with EventSource support
    if (!ES) {
      setError('SSE not supported in this environment');
      setReadyState(ES_CLOSED);
      return;
    }

    cleanup();
    setError(null);
    setReadyState(ES_CONNECTING);

    try {
      // Modern browsers support headers via EventSource constructor
      const eventSource = new ES(url, {
        withCredentials,
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        setReadyState(ES_OPEN);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log(`✅ SSE Connected to ${url}`);
      };

      eventSource.onerror = (_event: Event) => {
        if (!mountedRef.current) return;
        
        console.error('❌ SSE Connection error');
        setReadyState(ES_CLOSED);
        
        const errorMessage = 'SSE connection failed';
        setError(errorMessage);

        // Auto-reconnect logic
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          mountedRef.current
        ) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `🔄 SSE Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectDelay);
        } else {
          console.log('🛑 SSE Max reconnection attempts reached or auto-reconnect disabled');
        }
      };

  // Generic event listener for all SSE events
  eventSource.onmessage = (event: SSEMessageEvent) => {
        if (!mountedRef.current) return;
        
        try {
          const parsedData = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || undefined,
            event: event.type || 'message',
            data: parsedData,
            timestamp: new Date().toISOString(),
            ...parsedData, // Spread any additional fields from the server
          };
          
          setLastEvent(sseEvent);
          onEvent?.(sseEvent);
        } catch (parseError) {
          console.error('❌ Failed to parse SSE event data:', parseError);
          setError('Failed to parse event data');
        }
      };

      // Specific event listeners for custom event types
      const eventTypes = [
        'campaign_progress',
        'phase_started',
        'phase_completed',
        'phase_failed',
        'domain_generated',
        'domain_validated',
        'analysis_completed',
        'keep_alive',
        'error',
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event: SSEMessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const parsedData = JSON.parse(event.data);
            const sseEvent: SSEEvent = {
              id: event.lastEventId || undefined,
              event: eventType,
              data: parsedData,
              timestamp: new Date().toISOString(),
              ...parsedData,
            };
            
            setLastEvent(sseEvent);
            onEvent?.(sseEvent);
          } catch (parseError) {
            console.error(`❌ Failed to parse ${eventType} event data:`, parseError);
            setError(`Failed to parse ${eventType} event data`);
          }
        });
      });

    } catch (connectionError) {
      console.error('❌ Failed to create SSE connection:', connectionError);
      setError('Failed to create SSE connection');
      setReadyState(ES_CLOSED);
    }
  }, [url, onEvent, autoReconnect, maxReconnectAttempts, reconnectDelay, withCredentials, ES, cleanup]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  const close = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Connect when URL changes or component mounts
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    readyState,
    lastEvent,
    error,
    reconnect,
    close,
  isConnected: readyState === ES_OPEN,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}
