/**
 * Stream Pool Service (Phase 5 + Phase 8)
 * EventSource pooling/multiplexing with differential updates and optimistic queue
 */

import { safeAt, safeLast } from '@/lib/utils/arrayUtils';
import { StreamPatchOp, applyPatchOp, createMessageEvent } from '@/lib/utils/typeSafetyPrimitives';

// Feature flag for stream pooling
const isStreamPoolingEnabled = () => 
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STREAM_POOLING !== 'false';

// Feature flag for differential updates (Phase 8)
const isDifferentialUpdatesEnabled = () =>
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STREAM_DIFFERENTIAL_UPDATES !== 'false';

/**
 * Stream pool event callback
 */
export type StreamEventCallback = (event: MessageEvent) => void;

/**
 * Phase 8: Differential update patch
 */
export interface DifferentialPatch {
  type: 'delta' | 'full_snapshot';
  timestamp: string;
  changes: StreamPatchOp[];
  sequenceNumber?: number;
  campaignId?: string;
}

/**
 * Phase 8: Optimistic update entry
 */
interface OptimisticUpdate {
  id: string;
  patch: DifferentialPatch;
  timestamp: number;
  applied: boolean;
  confirmed: boolean;
}

/**
 * Phase 8: Stream quality metrics
 */
interface StreamQualityMetrics {
  score: number; // 0-100
  latencyMs: number;
  errorRate: number;
  lastUpdated: number;
  updateCount: number;
  missedUpdates: number;
}

/**
 * Stream pool entry
 */
interface PooledStream {
  eventSource: EventSource;
  refCount: number;
  callbacks: Map<string, StreamEventCallback>;
  url: string;
  lastHeartbeat: number;
  lastMessageTime: number; // Added missing property
  missedHeartbeats: number;
  failureCount: number;
  // Phase 8: Enhanced state
  qualityMetrics: StreamQualityMetrics;
  optimisticQueue: OptimisticUpdate[];
  lastSequenceNumber: number;
  patchProcessor?: DifferentialPatchProcessor;
}

/**
 * Stream pool configuration
 */
interface StreamPoolConfig {
  maxMissedHeartbeats: number;
  heartbeatTimeoutMs: number;
  maxFailures: number;
  reconnectDelayMs: number;
  // Phase 8: Quality and optimistic update configs
  qualityThresholdMs: number;
  maxOptimisticUpdates: number;
  reconciliationTimeoutMs: number;
}

/**
 * Phase 8: Differential patch processor for optimistic updates
 */
class DifferentialPatchProcessor {
  private baseSnapshot: Record<string, unknown> = {};
  private pendingPatches = new Map<string, DifferentialPatch>();

  /**
   * Apply a differential patch to create updated data
   */
  applyPatch(patch: DifferentialPatch, baseData?: Record<string, unknown>): Record<string, unknown> {
    const target = baseData || this.baseSnapshot;
    const result = JSON.parse(JSON.stringify(target)); // Deep clone
    
    for (const change of patch.changes) {
      try {
        this.applyChange(result, change);
      } catch (error) {
        console.warn('[DifferentialPatchProcessor] Failed to apply change:', change, error);
      }
    }
    
    return result;
  }

  /**
   * Apply a single change operation
   */
  private applyChange(target: Record<string, unknown>, change: StreamPatchOp): void {
    const result = applyPatchOp(target, change);
    if (!result.ok) {
      console.warn('[DifferentialPatchProcessor] Failed to apply change:', change, result.error);
    }
  }

  /**
   * Update base snapshot for future patch applications
   */
  updateBaseSnapshot(snapshot: Record<string, unknown>): void {
    this.baseSnapshot = JSON.parse(JSON.stringify(snapshot));
  }

  /**
   * Get current computed state after applying all pending patches
   */
  getCurrentState(): Record<string, unknown> {
    let current = this.baseSnapshot;
    
    // Apply patches in sequence order
    const sortedPatches = Array.from(this.pendingPatches.values())
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    
    for (const patch of sortedPatches) {
      current = this.applyPatch(patch, current);
    }
    
    return current;
  }

  /**
   * Add pending patch for optimistic updates
   */
  addPendingPatch(id: string, patch: DifferentialPatch): void {
    this.pendingPatches.set(id, patch);
  }

  /**
   * Remove confirmed patch
   */
  removePatch(id: string): void {
    this.pendingPatches.delete(id);
  }

  /**
   * Clear all pending patches (on full reconciliation)
   */
  clearPendingPatches(): void {
    this.pendingPatches.clear();
  }
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
    reconnectDelayMs: 3000,
    // Phase 8: New configs
    qualityThresholdMs: 5000, // 5 second threshold for quality degradation
    maxOptimisticUpdates: 50,
    reconciliationTimeoutMs: 30000 // 30 seconds
  };
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  // Phase 8: Quality monitoring interval
  private qualityInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeatMonitoring();
    this.startQualityMonitoring();
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
      lastMessageTime: Date.now(), // Initialize missing property
      missedHeartbeats: 0,
      failureCount: 0,
      // Phase 8: Initialize enhanced state
      qualityMetrics: {
        score: 100,
        latencyMs: 0,
        errorRate: 0,
        lastUpdated: Date.now(),
        updateCount: 0,
        missedUpdates: 0
      },
      optimisticQueue: [],
      lastSequenceNumber: 0,
      patchProcessor: isDifferentialUpdatesEnabled() ? new DifferentialPatchProcessor() : undefined
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
   * Handle incoming messages with Phase 8 enhancements
   */
  private handleMessage(pool: PooledStream, event: MessageEvent): void {
    const messageStartTime = Date.now();
    
    // Update heartbeat tracking
    const now = Date.now();
    pool.lastHeartbeat = now;
    pool.lastMessageTime = now; // Update message time tracking
    pool.missedHeartbeats = 0;
    pool.qualityMetrics.updateCount++;

    let messageData: unknown;
    let isDifferentialUpdate = false;
    
    // Parse message
    try {
      messageData = JSON.parse(event.data);
    } catch {
      // Not JSON, proceed with raw data
      messageData = { type: 'raw', data: event.data };
    }

    // Check if this is a heartbeat message
  if (messageData && typeof messageData === 'object' && (messageData as any).type === 'heartbeat') {
      // Update quality metrics from heartbeat
  if ((messageData as any).serverTime) {
  const latency = now - new Date((messageData as any).serverTime).getTime();
        pool.qualityMetrics.latencyMs = latency;
      }
      return; // Don't forward heartbeat messages
    }

    // Phase 8: Handle differential updates
  if (isDifferentialUpdatesEnabled() && messageData && typeof messageData === 'object' && (messageData as any).type === 'differential_update' && pool.patchProcessor) {
      isDifferentialUpdate = true;
      
      try {
  const patch: DifferentialPatch = (messageData as any).patch;
        
        // Validate sequence number for ordering
        if (patch.sequenceNumber && patch.sequenceNumber <= pool.lastSequenceNumber) {
          console.warn('[StreamPool] Out-of-order patch received, skipping');
          pool.qualityMetrics.missedUpdates++;
          return;
        }
        
        // Apply optimistic update
        const updateId = `${patch.campaignId || 'global'}_${patch.sequenceNumber || Date.now()}`;
        
        if (pool.optimisticQueue.length < this.config.maxOptimisticUpdates) {
          pool.optimisticQueue.push({
            id: updateId,
            patch,
            timestamp: now,
            applied: false,
            confirmed: false
          });
          
          pool.patchProcessor.addPendingPatch(updateId, patch);
          pool.lastSequenceNumber = patch.sequenceNumber || pool.lastSequenceNumber + 1;
          
          // Create enhanced event with computed state
          const computedState = pool.patchProcessor.getCurrentState();
          const enhancedEvent = createMessageEvent({
            ...(messageData as any),
            computedState,
            isOptimistic: true
          });
          
          // Forward enhanced message to callbacks
          this.forwardToCallbacks(pool, enhancedEvent);
          
          // Emit telemetry for optimistic update
          this.emitTelemetryEvent('stream_quality_update', {
            streamId: pool.url,
            qualityScore: this.calculateQualityScore(pool),
            metricsCount: pool.optimisticQueue.length,
            latencyMs: pool.qualityMetrics.latencyMs
          });
          
          return;
        } else {
          console.warn('[StreamPool] Optimistic queue full, dropping update');
          pool.qualityMetrics.missedUpdates++;
        }
      } catch (error) {
        console.warn('[StreamPool] Error processing differential update:', error);
        pool.qualityMetrics.errorRate = Math.min(1, pool.qualityMetrics.errorRate + 0.1);
      }
    }

    // Handle full snapshot updates (reconciliation)
  if (messageData && typeof messageData === 'object' && (messageData as any).type === 'full_snapshot' && pool.patchProcessor) {
      try {
        // Update base snapshot and clear optimistic queue
  pool.patchProcessor.updateBaseSnapshot((messageData as any).snapshot);
        pool.patchProcessor.clearPendingPatches();
        
        // Mark optimistic updates as confirmed/reconciled
        const reconciledCount = pool.optimisticQueue.length;
        pool.optimisticQueue = [];
        
        // Emit reconciliation telemetry
        this.emitTelemetryEvent('optimistic_reconciliation', {
          provisionalUpdates: reconciledCount,
          reconciledUpdates: reconciledCount,
          conflicts: 0, // Would be calculated in real implementation
          reconciliationTimeMs: Date.now() - messageStartTime
        });
      } catch (error) {
        console.warn('[StreamPool] Error processing full snapshot:', error);
      }
    }

    // Forward message to all subscribers (if not already forwarded)
    if (!isDifferentialUpdate) {
      this.forwardToCallbacks(pool, event);
    }

    // Update quality metrics
    pool.qualityMetrics.lastUpdated = now;
  }

  /**
   * Forward message to all callbacks
   */
  private forwardToCallbacks(pool: PooledStream, event: MessageEvent): void {
    pool.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.warn('[StreamPool] Callback error:', error);
        pool.qualityMetrics.errorRate = Math.min(1, pool.qualityMetrics.errorRate + 0.05);
      }
    });
  }

  /**
   * Calculate stream quality score (0-100)
   */
  private calculateQualityScore(pool: PooledStream): number {
    const metrics = pool.qualityMetrics;
    let score = 100;
    
    // Deduct for high latency
    if (metrics.latencyMs > this.config.qualityThresholdMs) {
      score -= Math.min(30, (metrics.latencyMs - this.config.qualityThresholdMs) / 1000);
    }
    
    // Deduct for error rate
    score -= metrics.errorRate * 40;
    
    // Deduct for missed updates
    if (metrics.updateCount > 0) {
      const missedRatio = metrics.missedUpdates / metrics.updateCount;
      score -= missedRatio * 30;
    }
    
    // Deduct for missed heartbeats
    score -= pool.missedHeartbeats * 10;
    
    return Math.max(0, Math.round(score));
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
   * Start quality monitoring (Phase 8)
   */
  private startQualityMonitoring(): void {
    if (this.qualityInterval) return;

    this.qualityInterval = setInterval(() => {
      this.updateQualityMetrics();
    }, this.config.qualityThresholdMs);
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
  private emitTelemetryEvent(eventType: string, data: unknown): void {
    // This will be implemented when telemetry service is available
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __telemetryService?: { emitTelemetry: (e: string, d: unknown) => void } };
      try {
        w.__telemetryService?.emitTelemetry(eventType, data);
      } catch {
        // Silent fail for telemetry
      }
    }
  }

  /**
   * Update quality metrics for stream monitoring
   */
  private updateQualityMetrics(): void {
    for (const [url, pool] of this.pools.entries()) {
      const now = Date.now();
      const timeSinceLastMessage = now - pool.lastMessageTime;
      
      // Calculate quality score based on message frequency and missed heartbeats
      const qualityScore = Math.max(0, 100 - (pool.missedHeartbeats * 10) - Math.min(50, timeSinceLastMessage / 1000));
      
      // Emit telemetry for quality monitoring
      this.emitTelemetryEvent('stream_quality_update', {
        streamId: url,
        qualityScore,
        metricsCount: pool.lastSequenceNumber,
        latencyMs: timeSinceLastMessage,
        errorRate: pool.missedHeartbeats / Math.max(1, pool.lastSequenceNumber)
      });
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

    // Phase 8: Clean up quality monitoring
    if (this.qualityInterval) {
      clearInterval(this.qualityInterval);
      this.qualityInterval = null;
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