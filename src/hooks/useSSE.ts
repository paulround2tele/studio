// File: src/hooks/useSSE.ts
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

// Narrowed runtime event shape used by consumers. `data` will be strongly typed when
// the event name matches a known CampaignSseEvent discriminator; otherwise unknown.
export type SSEEvent = {
  id?: string;
  event: string;
  data: unknown;
  timestamp: string;
  raw?: unknown;
} & Record<string, unknown>;

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
  
  /**
   * Custom event types to register listeners for. Defaults to campaign events list.
   */
  eventTypes?: string[];
  
  /**
   * Optional constructor override (e.g. EventSource polyfill)
   */
  eventSourceFactory?: EventSourceCtor;
}

const DEFAULT_EVENT_TYPES = [
  'campaign_progress',
  'phase_started',
  'phase_completed',
  'phase_failed',
  'domain_generated',
  'domain_validated',
  'analysis_completed',
  'analysis_reuse_enrichment',
  'analysis_failed',
  'counters_reconciled',
  'mode_changed',
  'keyword_set_created',
  'keyword_set_updated',
  'keyword_set_deleted',
  'keep_alive',
  'error',
];

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

type EventSourceCtorOptions = {
  withCredentials?: boolean;
  headers?: Record<string, string>;
};

type EventSourceCtor = new (url: string, options?: EventSourceCtorOptions) => EventSourceLike;

declare global {
  interface Window {
    EventSourcePolyfill?: EventSourceCtor;
  }
}

const ES_CONNECTING = 0;
const ES_OPEN = 1;
const ES_CLOSED = 2;

const shouldAttemptJsonParse = (raw: string): boolean => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return false;
  }
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

const safeParseEventData = (raw: string): { data: unknown; error?: Error } => {
  try {
    if (!shouldAttemptJsonParse(raw)) {
      return { data: raw };
    }
    return { data: JSON.parse(raw) };
  } catch (error) {
    return {
      data: raw,
      error: error instanceof Error ? error : new Error('Failed to parse SSE payload'),
    };
  }
};

interface CanonicalEnvelope {
  version: number;
  type: string;
  payload?: unknown;
}

const isCanonicalEnvelope = (value: unknown): value is CanonicalEnvelope => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.type === 'string' &&
    Object.prototype.hasOwnProperty.call(candidate, 'payload')
  );
};

const unwrapPayload = (payload: unknown): { data: unknown; raw: unknown } => {
  if (isCanonicalEnvelope(payload)) {
    const envelope = payload as CanonicalEnvelope;
    const inner = typeof envelope.payload === 'undefined' ? payload : envelope.payload;
    return { data: inner, raw: payload };
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in (payload as Record<string, unknown>)) {
    const rawContainer = payload as Record<string, unknown>;
    const inner = rawContainer.data;
    return { data: inner ?? payload, raw: payload };
  }

  return { data: payload, raw: payload };
};

export interface UseSSEReturn {
  /**
   * Current connection state
   */
  readyState: number;

  /**
   * Whether the connection has ever successfully opened
   */
  hasEverConnected: boolean;

  /**
   * Timestamp of the last successful connection
   */
  connectedAt: string | null;
  
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
    headers,
    eventTypes: customEventTypes,
    eventSourceFactory,
  } = options;

  // Keep a small timeout so we fail fast locally; actual liveness is confirmed by messages below.
  const STALE_TIMEOUT_MS = 45000; // Reconnect if no activity past keep-alive window
  const MAX_JITTER_MS = 500; // Jitter reconnections to avoid thundering herd

  const eventSourceRef = useRef<EventSourceLike | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const lastActivityRef = useRef<number>(Date.now());
  const connectRef = useRef<() => void>(() => {});
  const parseErrorStreakRef = useRef(0);
  
  const [readyState, setReadyState] = useState<number>(ES_CONNECTING);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  const eventTypeRegistry = useMemo(() => {
    const base = customEventTypes?.length ? customEventTypes : DEFAULT_EVENT_TYPES;
    return Array.from(new Set(base));
  }, [customEventTypes]);

  const resolveEventSourceCtor = useCallback((): { ctor: EventSourceCtor | null; isNative: boolean } => {
    if (eventSourceFactory) {
      return { ctor: eventSourceFactory, isNative: false };
    }
    if (typeof window === 'undefined') {
      return { ctor: null, isNative: false };
    }
    const win = window as typeof window & { EventSourcePolyfill?: EventSourceCtor };
    const nativeCtor = typeof win.EventSource === 'function' ? (win.EventSource as EventSourceCtor) : null;
    const polyfillCtor = win.EventSourcePolyfill ?? null;
    const forcePolyfill = process.env.NEXT_PUBLIC_SSE_FORCE_POLYFILL === '1';
    const preferPolyfill = forcePolyfill || Boolean(headers && Object.keys(headers).length > 0);
    if (preferPolyfill && polyfillCtor) {
      return { ctor: polyfillCtor, isNative: false };
    }
    if (nativeCtor) {
      return { ctor: nativeCtor, isNative: true };
    }
    if (polyfillCtor) {
      return { ctor: polyfillCtor, isNative: false };
    }
    return { ctor: null, isNative: false };
  }, [eventSourceFactory, headers]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (staleIntervalRef.current) {
      clearInterval(staleIntervalRef.current);
      staleIntervalRef.current = null;
    }
    setReadyState(ES_CLOSED);
  }, []);

  const scheduleReconnect = useCallback(
    (reason: string) => {
      if (!autoReconnect || !mountedRef.current) {
        return;
      }
      const attempts = reconnectAttemptsRef.current + 1;
      if (attempts > maxReconnectAttempts) {
        console.warn(`[useSSE] reconnection aborted after ${maxReconnectAttempts} attempts (${reason})`);
        return;
      }
      reconnectAttemptsRef.current = attempts;
      const backoff = reconnectDelay * Math.pow(2, attempts - 1);
      const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
      const delay = Math.min(backoff + jitter, 30000);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[useSSE] reconnecting in ${delay}ms (attempt ${attempts}, reason: ${reason})`);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connectRef.current();
        }
      }, delay);
    },
    [autoReconnect, maxReconnectAttempts, reconnectDelay]
  );

  const connect = useCallback(() => {
    connectRef.current = connect;
    if (!url || !mountedRef.current) {
      if (!url && process.env.NODE_ENV !== 'production') {
        console.warn('[useSSE] connect skipped - no URL');
      }
      return;
    }
    const { ctor: EventSourceCtorImpl, isNative } = resolveEventSourceCtor();
    if (!EventSourceCtorImpl) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[useSSE] EventSource not available in this environment');
      }
      setError('SSE not supported in this environment');
      setReadyState(ES_CLOSED);
      return;
    }

    cleanup();
    setError(null);
    setReadyState(ES_CONNECTING);
    lastActivityRef.current = Date.now();

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[useSSE] opening connection', url);
        // Optional dev-only probe to surface HTTP status if EventSource never fires.
        // Disabled by default because it can interfere with the real EventSource connection.
        const enableProbe = process.env.NEXT_PUBLIC_SSE_PROBE === '1';
        if (enableProbe) {
          const probe = new AbortController();
          setTimeout(() => probe.abort(), 1500);
          fetch(url, {
            method: 'GET',
            headers: { Accept: 'text/event-stream' },
            credentials: withCredentials ? 'include' : 'same-origin',
            signal: probe.signal,
          })
            .then((res) => {
              console.log('[useSSE] probe status', res.status, res.statusText);
            })
            .catch((err) => {
              console.error('[useSSE] probe failed', err?.message || err);
            });
        }
      }
      // Modern browsers support headers via EventSource constructor
      const ctorOptions: EventSourceCtorOptions = { withCredentials };
      if (!isNative && headers && Object.keys(headers).length > 0) {
        ctorOptions.headers = headers;
      }
      const eventSource = new EventSourceCtorImpl(url, ctorOptions);

      eventSourceRef.current = eventSource;

      const emitIncomingEvent = (event: SSEMessageEvent, forcedType?: string) => {
        if (!mountedRef.current) return;

        setReadyState(ES_OPEN);
        setError(null);
        setHasEverConnected(true);
        lastActivityRef.current = Date.now();

        const { data: parsedPayload, error: parseError } = safeParseEventData(event.data ?? '');
        if (parseError) {
          parseErrorStreakRef.current += 1;
          const message = `Failed to parse ${forcedType || event.type || 'message'} event data`;
          console.error(`❌ ${message}:`, parseError);
          setError(message);
          if (parseErrorStreakRef.current >= 3) {
            console.warn('[useSSE] too many parse failures; reconnecting');
            eventSourceRef.current?.close();
            scheduleReconnect('parse-error');
          }
          return;
        }

        parseErrorStreakRef.current = 0;
        const { data: payload, raw } = unwrapPayload(parsedPayload);
        const sseEvent: SSEEvent = {
          id: event.lastEventId || undefined,
          event: forcedType || event.type || 'message',
          data: payload,
          timestamp: new Date().toISOString(),
          raw,
        };

        setLastEvent(sseEvent);
        onEvent?.(sseEvent);
      };

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        setReadyState(ES_OPEN);
        setError(null);
        setHasEverConnected(true);
        setConnectedAt(new Date().toISOString());
        parseErrorStreakRef.current = 0;
        reconnectAttemptsRef.current = 0;
        lastActivityRef.current = Date.now();
        if (staleIntervalRef.current) {
          clearInterval(staleIntervalRef.current);
        }
        staleIntervalRef.current = setInterval(() => {
          const now = Date.now();
          if (now - lastActivityRef.current > STALE_TIMEOUT_MS) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[useSSE] stale connection detected; reconnecting');
            }
            eventSourceRef.current?.close();
            scheduleReconnect('stale-connection');
          }
        }, Math.floor(STALE_TIMEOUT_MS / 2));
        console.log(`✅ SSE Connected to ${url}`);
      };

      eventSource.onerror = (event: Event) => {
        if (!mountedRef.current) return;

        const targetReadyState = (event?.target as { readyState?: number } | null)?.readyState;
        const nextReadyState = typeof targetReadyState === 'number' ? targetReadyState : ES_CLOSED;
        const message = `SSE connection error (readyState=${nextReadyState})`;

        console.error('❌ SSE Connection error', {
          readyState: nextReadyState,
          url,
          lastActivityMsAgo: Date.now() - lastActivityRef.current,
        });

        setReadyState(nextReadyState);
        if (staleIntervalRef.current) {
          clearInterval(staleIntervalRef.current);
          staleIntervalRef.current = null;
        }

        setError(message);

        scheduleReconnect('onerror');
      };

      eventSource.onmessage = (event: SSEMessageEvent) => {
        emitIncomingEvent(event, event.type);
      };

      eventTypeRegistry.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event: SSEMessageEvent) => {
          emitIncomingEvent(event, eventType);
        });
      });
    } catch (connectionError) {
      console.error('❌ Failed to create SSE connection:', connectionError);
      setError('Failed to create SSE connection');
      setReadyState(ES_CLOSED);
    }
  }, [url, onEvent, headers, resolveEventSourceCtor, withCredentials, cleanup, scheduleReconnect, eventTypeRegistry]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  const close = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Connect when URL changes or component mounts. React Strict Mode double-invokes
  // effects in development, so ensure we re-mark the ref as mounted before connecting.
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  return {
    readyState,
    hasEverConnected,
    connectedAt,
    lastEvent,
    error,
    reconnect,
    close,
    isConnected: readyState === ES_OPEN,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}
