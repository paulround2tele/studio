/**
 * Stream Pool Service (Phase 5)
 * EventSource pooling/multiplexing to reduce connection count
 */

// Feature flag for stream pooling
const isStreamPoolingEnabled = () => 
  process.env.NEXT_PUBLIC_STREAM_POOLING !== 'false';

/**
 * Stream pool event callback
 */
export type StreamEventCallback = (event: MessageEvent) => void;

/**
 * Stream pool entry
 */
interface PooledStream {
  eventSource: EventSource;
  refCount: number;
  callbacks: Map<string, StreamEventCallback>;
  url: string;
  lastHeartbeat: number;
  missedHeartbeats: number;
  failureCount: number;
}

/**
 * Stream pool configuration
 */
interface StreamPoolConfig {
  maxMissedHeartbeats: number;
  heartbeatTimeoutMs: number;
  maxFailures: number;
  reconnectDelayMs: number;
}

/**
 * Stream pool class for managing EventSource connections
 */
class StreamPool {
  private pools = new Map<string, PooledStream>();
  private config: StreamPoolConfig = {
    maxMissedHeartbeats: 3,
    heartbeatTimeoutMs: 60000, // 60 seconds
    maxFailures: 5,
    reconnectDelayMs: 3000
  };
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeatMonitoring();
  }

  /**
   * Subscribe to a pooled stream
   */
  public subscribeStreamPool(
    url: string,
    subscriberId: string,
    callback: StreamEventCallback
  ): () => void {
    if (!isStreamPoolingEnabled()) {
      // Fallback to direct EventSource
      return this.createDirectConnection(url, callback);
    }

    let pool = this.pools.get(url);

    if (!pool) {
      pool = this.createPooledStream(url);
      this.pools.set(url, pool);
    }

    pool.refCount++;
    pool.callbacks.set(subscriberId, callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(url, subscriberId);
    };
  }

  /**
   * Create a new pooled stream
   */
  private createPooledStream(url: string): PooledStream {
    const eventSource = new EventSource(url);
    const pool: PooledStream = {
      eventSource,
      refCount: 0,
      callbacks: new Map(),
      url,
      lastHeartbeat: Date.now(),
      missedHeartbeats: 0,
      failureCount: 0
    };

    // Set up event handlers
    eventSource.onmessage = (event) => {
      this.handleMessage(pool, event);
    };

    eventSource.onerror = (error) => {
      this.handleError(pool, error);
    };

    eventSource.onopen = () => {
      pool.failureCount = 0;
      pool.missedHeartbeats = 0;
      pool.lastHeartbeat = Date.now();
    };

    return pool;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(pool: PooledStream, event: MessageEvent): void {
    // Update heartbeat tracking
    const now = Date.now();
    pool.lastHeartbeat = now;
    pool.missedHeartbeats = 0;

    // Check if this is a heartbeat message
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'heartbeat') {
        // Don't forward heartbeat messages to callbacks
        return;
      }
    } catch {
      // Not JSON, proceed normally
    }

    // Forward message to all subscribers
    pool.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.warn('[StreamPool] Callback error:', error);
      }
    });

    // Emit telemetry event
    this.emitTelemetryEvent('stream_pool_state', {
      url: pool.url,
      refCount: pool.refCount
    });
  }

  /**
   * Handle stream errors
   */
  private handleError(pool: PooledStream, error: Event): void {
    pool.failureCount++;
    
    console.warn(`[StreamPool] Stream error for ${pool.url}:`, error);

    // If too many failures, switch to polling mode
    if (pool.failureCount >= this.config.maxFailures) {
      console.warn(`[StreamPool] Max failures reached for ${pool.url}, would switch to polling`);
      // TODO: Implement polling fallback when needed
    }
  }

  /**
   * Unsubscribe from a stream
   */
  private unsubscribe(url: string, subscriberId: string): void {
    const pool = this.pools.get(url);
    if (!pool) return;

    pool.callbacks.delete(subscriberId);
    pool.refCount--;

    // Clean up pool if no more subscribers
    if (pool.refCount <= 0) {
      pool.eventSource.close();
      this.pools.delete(url);
    }
  }

  /**
   * Create direct EventSource connection (fallback)
   */
  private createDirectConnection(
    url: string,
    callback: StreamEventCallback
  ): () => void {
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = callback;
    eventSource.onerror = (error) => {
      console.warn('[StreamPool] Direct connection error:', error);
    };

    return () => {
      eventSource.close();
    };
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatTimeoutMs / 2);
  }

  /**
   * Check for missed heartbeats
   */
  private checkHeartbeats(): void {
    const now = Date.now();

    this.pools.forEach((pool) => {
      const timeSinceLastHeartbeat = now - pool.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.config.heartbeatTimeoutMs) {
        pool.missedHeartbeats++;
        
        if (pool.missedHeartbeats >= this.config.maxMissedHeartbeats) {
          console.warn(`[StreamPool] Missed ${pool.missedHeartbeats} heartbeats for ${pool.url}`);
          
          // Emit telemetry event for heartbeat failure
          this.emitTelemetryEvent('stream_pool_state', {
            url: pool.url,
            refCount: pool.refCount,
            missedHeartbeats: pool.missedHeartbeats,
            status: 'heartbeat_failure'
          });
          
          // TODO: Implement polling mode fallback
          // For now, just log the event
        }
      }
    });
  }

  /**
   * Emit telemetry event (stub for Phase 5 telemetry service)
   */
  private emitTelemetryEvent(eventType: string, data: any): void {
    // This will be implemented when telemetry service is available
    if (typeof window !== 'undefined' && (window as any).__telemetryService) {
      try {
        (window as any).__telemetryService.emit(eventType, data);
      } catch (error) {
        // Silent fail for telemetry
      }
    }
  }

  /**
   * Get pool statistics
   */
  public getPoolStats(): {
    totalPools: number;
    totalConnections: number;
    pools: Array<{
      url: string;
      refCount: number;
      missedHeartbeats: number;
      failureCount: number;
    }>;
  } {
    const pools = Array.from(this.pools.entries()).map(([url, pool]) => ({
      url,
      refCount: pool.refCount,
      missedHeartbeats: pool.missedHeartbeats,
      failureCount: pool.failureCount
    }));

    return {
      totalPools: this.pools.size,
      totalConnections: pools.reduce((sum, pool) => sum + pool.refCount, 0),
      pools
    };
  }

  /**
   * Close all connections
   */
  public closeAll(): void {
    this.pools.forEach(pool => {
      pool.eventSource.close();
    });
    this.pools.clear();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Force reconnect for a specific URL
   */
  public reconnectStream(url: string): void {
    const pool = this.pools.get(url);
    if (!pool) return;

    const callbacks = new Map(pool.callbacks);
    const refCount = pool.refCount;

    // Close existing connection
    pool.eventSource.close();
    this.pools.delete(url);

    // Recreate with delay
    setTimeout(() => {
      const newPool = this.createPooledStream(url);
      newPool.callbacks = callbacks;
      newPool.refCount = refCount;
      this.pools.set(url, newPool);
    }, this.config.reconnectDelayMs);
  }
}

// Export singleton instance
export const streamPool = new StreamPool();

/**
 * Subscribe to a pooled EventSource stream
 */
export function subscribeStreamPool(
  url: string,
  subscriberId: string,
  callback: StreamEventCallback
): () => void {
  return streamPool.subscribeStreamPool(url, subscriberId, callback);
}

/**
 * Check if stream pooling is available
 */
export function isStreamPoolingAvailable(): boolean {
  return isStreamPoolingEnabled();
}

/**
 * Get stream pool statistics
 */
export function getStreamPoolStats(): ReturnType<StreamPool['getPoolStats']> {
  return streamPool.getPoolStats();
}