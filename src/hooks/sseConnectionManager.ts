/**
 * SSE Connection Manager - Singleton pattern for EventSource connections
 * 
 * Problem: Multiple React components calling useSSE for the same URL create
 * duplicate EventSource connections, causing:
 * - Connection storms (reconnects fighting each other)
 * - Duplicate events
 * - Browser connection limit exhaustion
 * 
 * Solution: Shared connection registry that deduplicates connections per URL.
 * Multiple subscribers share a single EventSource.
 */

import type { SSEEvent } from './useSSE';

interface EventSourceLike {
  onopen: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  addEventListener: (type: string, listener: (ev: MessageEvent) => void) => void;
  removeEventListener: (type: string, listener: (ev: MessageEvent) => void) => void;
  close: () => void;
  readyState: number;
}

type EventSourceCtorOptions = {
  withCredentials?: boolean;
  headers?: Record<string, string>;
};

type EventSourceCtor = new (url: string, options?: EventSourceCtorOptions) => EventSourceLike;

type EventCallback = (event: SSEEvent) => void;
type StateCallback = (state: ConnectionState) => void;

export interface ConnectionState {
  readyState: number;
  error: string | null;
  connectedAt: string | null;
  reconnectAttempts: number;
}

interface SharedConnection {
  url: string;
  eventSource: EventSourceLike | null;
  subscribers: Set<{
    onEvent: EventCallback;
    onStateChange: StateCallback;
  }>;
  state: ConnectionState;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  staleInterval: ReturnType<typeof setInterval> | null;
  lastActivity: number;
}

const ES_CONNECTING = 0;
const ES_OPEN = 1;
const ES_CLOSED = 2;

const STALE_TIMEOUT_MS = 45000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;
const MAX_JITTER_MS = 500;

// Global registry of shared connections
const connectionRegistry = new Map<string, SharedConnection>();

// Event types to listen for
const DEFAULT_EVENT_TYPES = [
  'campaign_progress',
  'phase_started',
  'phase_paused',
  'phase_resumed',
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

function getEventSourceCtor(): EventSourceCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as typeof window & { EventSourcePolyfill?: EventSourceCtor };
  return win.EventSource as EventSourceCtor ?? win.EventSourcePolyfill ?? null;
}

function parseEventData(raw: string): unknown {
  try {
    const trimmed = raw?.trim();
    if (trimmed?.startsWith('{') || trimmed?.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    return raw;
  } catch {
    return raw;
  }
}

function notifySubscribers(conn: SharedConnection, event: SSEEvent): void {
  conn.subscribers.forEach(sub => {
    try {
      sub.onEvent(event);
    } catch (err) {
      console.error('[SSEManager] subscriber error:', err);
    }
  });
}

function notifyStateChange(conn: SharedConnection): void {
  conn.subscribers.forEach(sub => {
    try {
      sub.onStateChange({ ...conn.state });
    } catch (err) {
      console.error('[SSEManager] state change error:', err);
    }
  });
}

function scheduleReconnect(conn: SharedConnection): void {
  if (conn.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(`[SSEManager] max reconnect attempts reached for ${conn.url}`);
    return;
  }
  
  const attempts = conn.state.reconnectAttempts + 1;
  conn.state.reconnectAttempts = attempts;
  
  const backoff = RECONNECT_DELAY_MS * Math.pow(2, attempts - 1);
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  const delay = Math.min(backoff + jitter, 30000);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SSEManager] reconnecting ${conn.url} in ${delay}ms (attempt ${attempts})`);
  }
  
  conn.reconnectTimeout = setTimeout(() => {
    if (conn.subscribers.size > 0) {
      connectShared(conn);
    }
  }, delay);
}

function connectShared(conn: SharedConnection): void {
  const EventSourceImpl = getEventSourceCtor();
  if (!EventSourceImpl) {
    conn.state.error = 'SSE not supported';
    conn.state.readyState = ES_CLOSED;
    notifyStateChange(conn);
    return;
  }
  
  // Clean up existing connection
  if (conn.eventSource) {
    conn.eventSource.close();
    conn.eventSource = null;
  }
  if (conn.reconnectTimeout) {
    clearTimeout(conn.reconnectTimeout);
    conn.reconnectTimeout = null;
  }
  if (conn.staleInterval) {
    clearInterval(conn.staleInterval);
    conn.staleInterval = null;
  }
  
  conn.state.readyState = ES_CONNECTING;
  conn.state.error = null;
  conn.lastActivity = Date.now();
  notifyStateChange(conn);
  
  try {
    const eventSource = new EventSourceImpl(conn.url, { withCredentials: true });
    conn.eventSource = eventSource;
    
    eventSource.onopen = () => {
      conn.state.readyState = ES_OPEN;
      conn.state.error = null;
      conn.state.connectedAt = new Date().toISOString();
      conn.state.reconnectAttempts = 0;
      conn.lastActivity = Date.now();
      notifyStateChange(conn);
      
      // Start stale connection check
      conn.staleInterval = setInterval(() => {
        if (Date.now() - conn.lastActivity > STALE_TIMEOUT_MS) {
          console.warn(`[SSEManager] stale connection detected for ${conn.url}`);
          eventSource.close();
          scheduleReconnect(conn);
        }
      }, STALE_TIMEOUT_MS / 2);
      
      console.log(`✅ [SSEManager] Connected to ${conn.url}`);
    };
    
    eventSource.onerror = () => {
      conn.state.readyState = ES_CLOSED;
      conn.state.error = 'Connection error';
      notifyStateChange(conn);
      
      if (conn.staleInterval) {
        clearInterval(conn.staleInterval);
        conn.staleInterval = null;
      }
      
      scheduleReconnect(conn);
    };
    
    const handleMessage = (event: MessageEvent, forcedType?: string) => {
      conn.lastActivity = Date.now();
      conn.state.readyState = ES_OPEN;
      
      const parsed = parseEventData(event.data ?? '');
      const sseEvent: SSEEvent = {
        id: (event as MessageEvent & { lastEventId?: string }).lastEventId,
        event: forcedType || event.type || 'message',
        data: parsed,
        timestamp: new Date().toISOString(),
        raw: parsed,
      };
      
      notifySubscribers(conn, sseEvent);
    };
    
    eventSource.onmessage = (event) => handleMessage(event);
    
    DEFAULT_EVENT_TYPES.forEach(eventType => {
      eventSource.addEventListener(eventType, (event) => handleMessage(event, eventType));
    });
    
  } catch (err) {
    console.error(`[SSEManager] Failed to create connection for ${conn.url}:`, err);
    conn.state.error = 'Failed to create connection';
    conn.state.readyState = ES_CLOSED;
    notifyStateChange(conn);
  }
}

/**
 * Subscribe to a shared SSE connection
 * Returns an unsubscribe function
 */
export function subscribeToSSE(
  url: string,
  onEvent: EventCallback,
  onStateChange: StateCallback
): () => void {
  let conn = connectionRegistry.get(url);
  
  if (!conn) {
    conn = {
      url,
      eventSource: null,
      subscribers: new Set(),
      state: {
        readyState: ES_CONNECTING,
        error: null,
        connectedAt: null,
        reconnectAttempts: 0,
      },
      reconnectTimeout: null,
      staleInterval: null,
      lastActivity: Date.now(),
    };
    connectionRegistry.set(url, conn);
  }
  
  const subscriber = { onEvent, onStateChange };
  conn.subscribers.add(subscriber);
  
  // If this is the first subscriber, connect
  if (conn.subscribers.size === 1) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SSEManager] First subscriber for ${url}, connecting...`);
    }
    connectShared(conn);
  } else {
    // Notify new subscriber of current state
    onStateChange({ ...conn.state });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SSEManager] Added subscriber #${conn.subscribers.size} for ${url}`);
    }
  }
  
  // Return unsubscribe function
  return () => {
    conn!.subscribers.delete(subscriber);
    
    if (conn!.subscribers.size === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SSEManager] Last subscriber removed for ${url}, closing...`);
      }
      
      // Clean up connection
      if (conn!.eventSource) {
        conn!.eventSource.close();
        conn!.eventSource = null;
      }
      if (conn!.reconnectTimeout) {
        clearTimeout(conn!.reconnectTimeout);
      }
      if (conn!.staleInterval) {
        clearInterval(conn!.staleInterval);
      }
      
      connectionRegistry.delete(url);
    }
  };
}

/**
 * Force reconnect a shared connection
 */
export function reconnectSSE(url: string): void {
  const conn = connectionRegistry.get(url);
  if (conn) {
    conn.state.reconnectAttempts = 0;
    connectShared(conn);
  }
}

/**
 * Get current connection state (for debugging)
 */
export function getConnectionState(url: string): ConnectionState | null {
  const conn = connectionRegistry.get(url);
  return conn ? { ...conn.state } : null;
}

/**
 * Get all active connections (for debugging)
 */
export function getActiveConnections(): Map<string, { subscriberCount: number; state: ConnectionState }> {
  const result = new Map<string, { subscriberCount: number; state: ConnectionState }>();
  connectionRegistry.forEach((conn, url) => {
    result.set(url, {
      subscriberCount: conn.subscribers.size,
      state: { ...conn.state },
    });
  });
  return result;
}

// Expose debugging functions to window in development
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __sseManager?: unknown }).__sseManager = {
    getActiveConnections,
    getConnectionState,
    reconnectSSE,
    getRegistry: () => connectionRegistry,
  };
}
