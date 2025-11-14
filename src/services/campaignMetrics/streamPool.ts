/**
 * Stream Pool Service (Phase 5 + Phase 8)
 * EventSource pooling/multiplexing with differential updates and optimistic queue
 */

import { StreamPatchOp, applyPatchOp, createMessageEvent } from '@/lib/utils/typeSafetyPrimitives';

// Feature flags
const isStreamPoolingEnabled = () => typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STREAM_POOLING !== 'false';
const isDifferentialUpdatesEnabled = () => typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STREAM_DIFFERENTIAL_UPDATES !== 'false';

// Event callback
export type StreamEventCallback = (event: MessageEvent) => void;

// Differential patch
export interface DifferentialPatch {
  type: 'delta' | 'full_snapshot';
  timestamp: string;
  changes: StreamPatchOp[];
  sequenceNumber?: number;
  campaignId?: string;
}

// Optimistic update entry
interface OptimisticUpdate {
  id: string;
  patch: DifferentialPatch;
  timestamp: number;
  applied: boolean;
  confirmed: boolean;
}

// Stream quality metrics
interface StreamQualityMetrics {
  score: number;
  latencyMs: number;
  errorRate: number;
  lastUpdated: number;
  updateCount: number;
  missedUpdates: number;
}

// Message variants & guards
interface HeartbeatMessage { type: 'heartbeat'; serverTime?: string }
interface DifferentialUpdateMessage { type: 'differential_update'; patch: DifferentialPatch }
interface FullSnapshotMessage { type: 'full_snapshot'; snapshot: Record<string, unknown> }
interface RawMessage { type: 'raw'; data: string }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const hasType = (v: unknown): v is Record<string, unknown> & { type: string } => isRecord(v) && typeof (v as { type?: unknown }).type === 'string';
const isHeartbeatMessage = (v: unknown): v is HeartbeatMessage => hasType(v) && v.type === 'heartbeat';
const isDifferentialUpdateMessage = (v: unknown): v is DifferentialUpdateMessage => {
  if (!hasType(v) || v.type !== 'differential_update') return false;
  const candidate = v as Record<string, unknown> & { patch?: unknown };
  return isRecord(candidate.patch);
};
const isFullSnapshotMessage = (v: unknown): v is FullSnapshotMessage => {
  if (!hasType(v) || v.type !== 'full_snapshot') return false;
  const candidate = v as Record<string, unknown> & { snapshot?: unknown };
  return isRecord(candidate.snapshot);
};

// Pooled stream entry
interface PooledStream {
  eventSource: EventSource;
  refCount: number;
  callbacks: Map<string, StreamEventCallback>;
  url: string;
  lastHeartbeat: number;
  lastMessageTime: number;
  missedHeartbeats: number;
  failureCount: number;
  qualityMetrics: StreamQualityMetrics;
  optimisticQueue: OptimisticUpdate[];
  lastSequenceNumber: number;
  patchProcessor?: DifferentialPatchProcessor;
}

// Config
interface StreamPoolConfig {
  maxMissedHeartbeats: number;
  heartbeatTimeoutMs: number;
  maxFailures: number;
  reconnectDelayMs: number;
  qualityThresholdMs: number;
  maxOptimisticUpdates: number;
  reconciliationTimeoutMs: number;
}

class DifferentialPatchProcessor {
  private baseSnapshot: Record<string, unknown> = {};
  private pendingPatches = new Map<string, DifferentialPatch>();

  applyPatch(patch: DifferentialPatch, baseData?: Record<string, unknown>): Record<string, unknown> {
    const target = baseData || this.baseSnapshot;
    const result = JSON.parse(JSON.stringify(target));
    for (const change of patch.changes) {
      const applyResult = applyPatchOp(result, change);
      if (!applyResult.ok) {
        console.warn('[DifferentialPatchProcessor] Failed to apply change:', change, applyResult.error);
      }
    }
    return result;
  }

  updateBaseSnapshot(snapshot: Record<string, unknown>): void {
    this.baseSnapshot = JSON.parse(JSON.stringify(snapshot));
  }

  getCurrentState(): Record<string, unknown> {
    let current = this.baseSnapshot;
    const sorted = Array.from(this.pendingPatches.values()).sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    for (const patch of sorted) {
      current = this.applyPatch(patch, current);
    }
    return current;
  }

  addPendingPatch(id: string, patch: DifferentialPatch): void { this.pendingPatches.set(id, patch); }
  removePatch(id: string): void { this.pendingPatches.delete(id); }
  clearPendingPatches(): void { this.pendingPatches.clear(); }
}

class StreamPool {
  private pools = new Map<string, PooledStream>();
  private config: StreamPoolConfig = {
    maxMissedHeartbeats: 3,
    heartbeatTimeoutMs: 60000,
    maxFailures: 5,
    reconnectDelayMs: 3000,
    qualityThresholdMs: 5000,
    maxOptimisticUpdates: 50,
    reconciliationTimeoutMs: 30000,
  };
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private qualityInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeatMonitoring();
    this.startQualityMonitoring();
  }

  public subscribeStreamPool(url: string, subscriberId: string, callback: StreamEventCallback): () => void {
    if (!isStreamPoolingEnabled()) return this.createDirectConnection(url, callback);
    let pool = this.pools.get(url);
    if (!pool) { pool = this.createPooledStream(url); this.pools.set(url, pool); }
    pool.refCount++;
    pool.callbacks.set(subscriberId, callback);
    return () => this.unsubscribe(url, subscriberId);
  }

  private createPooledStream(url: string): PooledStream {
    const eventSource = new EventSource(url);
    const pool: PooledStream = {
      eventSource,
      refCount: 0,
      callbacks: new Map(),
      url,
      lastHeartbeat: Date.now(),
      lastMessageTime: Date.now(),
      missedHeartbeats: 0,
      failureCount: 0,
      qualityMetrics: { score: 100, latencyMs: 0, errorRate: 0, lastUpdated: Date.now(), updateCount: 0, missedUpdates: 0 },
      optimisticQueue: [],
      lastSequenceNumber: 0,
      patchProcessor: isDifferentialUpdatesEnabled() ? new DifferentialPatchProcessor() : undefined,
    };
    eventSource.onmessage = (e) => this.handleMessage(pool, e);
    eventSource.onerror = (err) => this.handleError(pool, err);
    eventSource.onopen = () => { pool.failureCount = 0; pool.missedHeartbeats = 0; pool.lastHeartbeat = Date.now(); };
    return pool;
  }

  private handleMessage(pool: PooledStream, event: MessageEvent): void {
    const start = Date.now();
    const now = Date.now();
    pool.lastHeartbeat = now;
    pool.lastMessageTime = now;
    pool.missedHeartbeats = 0;
    pool.qualityMetrics.updateCount++;

    let messageData: unknown;
    let isDifferential = false;
    try { messageData = JSON.parse(event.data); } catch { messageData = { type: 'raw', data: event.data } as RawMessage; }

    if (isHeartbeatMessage(messageData)) {
      if (messageData.serverTime) {
        pool.qualityMetrics.latencyMs = now - new Date(messageData.serverTime).getTime();
      }
      return;
    }

    if (isDifferentialUpdatesEnabled() && isDifferentialUpdateMessage(messageData) && pool.patchProcessor) {
      isDifferential = true;
      try {
        const patch = messageData.patch;
        if (patch.sequenceNumber && patch.sequenceNumber <= pool.lastSequenceNumber) {
          console.warn('[StreamPool] Out-of-order patch received, skipping');
          pool.qualityMetrics.missedUpdates++; return;
        }
        const updateId = `${patch.campaignId || 'global'}_${patch.sequenceNumber || Date.now()}`;
        if (pool.optimisticQueue.length < this.config.maxOptimisticUpdates) {
          pool.optimisticQueue.push({ id: updateId, patch, timestamp: now, applied: false, confirmed: false });
          pool.patchProcessor.addPendingPatch(updateId, patch);
          pool.lastSequenceNumber = patch.sequenceNumber || pool.lastSequenceNumber + 1;
          const computedState = pool.patchProcessor.getCurrentState();
            const enhancedEvent = createMessageEvent({ ...messageData, computedState, isOptimistic: true });
          this.forwardToCallbacks(pool, enhancedEvent);
          this.emitTelemetryEvent('stream_quality_update', { streamId: pool.url, qualityScore: this.calculateQualityScore(pool), metricsCount: pool.optimisticQueue.length, latencyMs: pool.qualityMetrics.latencyMs });
          return;
        } else {
          console.warn('[StreamPool] Optimistic queue full, dropping update');
          pool.qualityMetrics.missedUpdates++;
        }
      } catch (err) {
        console.warn('[StreamPool] Error processing differential update:', err);
        pool.qualityMetrics.errorRate = Math.min(1, pool.qualityMetrics.errorRate + 0.1);
      }
    }

    if (isFullSnapshotMessage(messageData) && pool.patchProcessor) {
      try {
        pool.patchProcessor.updateBaseSnapshot(messageData.snapshot);
        pool.patchProcessor.clearPendingPatches();
        const reconciledCount = pool.optimisticQueue.length;
        pool.optimisticQueue = [];
        this.emitTelemetryEvent('optimistic_reconciliation', { provisionalUpdates: reconciledCount, reconciledUpdates: reconciledCount, conflicts: 0, reconciliationTimeMs: Date.now() - start });
      } catch (err) {
        console.warn('[StreamPool] Error processing full snapshot:', err);
      }
    }

    if (!isDifferential) this.forwardToCallbacks(pool, event);
    pool.qualityMetrics.lastUpdated = now;
  }

  private forwardToCallbacks(pool: PooledStream, event: MessageEvent): void {
    pool.callbacks.forEach(cb => { try { cb(event); } catch (err) { console.warn('[StreamPool] Callback error:', err); pool.qualityMetrics.errorRate = Math.min(1, pool.qualityMetrics.errorRate + 0.05); } });
  }

  private calculateQualityScore(pool: PooledStream): number {
    const m = pool.qualityMetrics;
    let score = 100;
    if (m.latencyMs > this.config.qualityThresholdMs) score -= Math.min(30, (m.latencyMs - this.config.qualityThresholdMs) / 1000);
    score -= m.errorRate * 40;
    if (m.updateCount > 0) score -= (m.missedUpdates / m.updateCount) * 30;
    score -= pool.missedHeartbeats * 10;
    return Math.max(0, Math.round(score));
  }

  private handleError(pool: PooledStream, error: Event): void {
    pool.failureCount++;
    console.warn(`[StreamPool] Stream error for ${pool.url}:`, error);
    if (pool.failureCount >= this.config.maxFailures) {
      console.warn(`[StreamPool] Max failures reached for ${pool.url}, would switch to polling`);
    }
  }

  private unsubscribe(url: string, subscriberId: string): void {
    const pool = this.pools.get(url); if (!pool) return;
    pool.callbacks.delete(subscriberId); pool.refCount--;
    if (pool.refCount <= 0) { pool.eventSource.close(); this.pools.delete(url); }
  }

  private createDirectConnection(url: string, callback: StreamEventCallback): () => void {
    const eventSource = new EventSource(url);
    eventSource.onmessage = callback;
    eventSource.onerror = (e) => console.warn('[StreamPool] Direct connection error:', e);
    return () => eventSource.close();
  }

  private startQualityMonitoring(): void { if (!this.qualityInterval) this.qualityInterval = setInterval(() => this.updateQualityMetrics(), this.config.qualityThresholdMs); }
  private startHeartbeatMonitoring(): void { if (!this.heartbeatInterval) this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), this.config.heartbeatTimeoutMs / 2); }

  private checkHeartbeats(): void {
    const now = Date.now();
    this.pools.forEach(pool => {
      if (now - pool.lastHeartbeat > this.config.heartbeatTimeoutMs) {
        pool.missedHeartbeats++;
        if (pool.missedHeartbeats >= this.config.maxMissedHeartbeats) {
          console.warn(`[StreamPool] Missed ${pool.missedHeartbeats} heartbeats for ${pool.url}`);
          this.emitTelemetryEvent('stream_pool_state', { url: pool.url, refCount: pool.refCount, missedHeartbeats: pool.missedHeartbeats, status: 'heartbeat_failure' });
        }
      }
    });
  }

  private emitTelemetryEvent(eventType: string, data: unknown): void {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __telemetryService?: { emitTelemetry: (e: string, d: unknown) => void } };
      try { w.__telemetryService?.emitTelemetry(eventType, data); } catch { /* noop */ }
    }
  }

  private updateQualityMetrics(): void {
    for (const [url, pool] of this.pools.entries()) {
      const now = Date.now();
      const timeSince = now - pool.lastMessageTime;
      const qualityScore = Math.max(0, 100 - (pool.missedHeartbeats * 10) - Math.min(50, timeSince / 1000));
      this.emitTelemetryEvent('stream_quality_update', { streamId: url, qualityScore, metricsCount: pool.lastSequenceNumber, latencyMs: timeSince, errorRate: pool.missedHeartbeats / Math.max(1, pool.lastSequenceNumber) });
    }
  }

  public getPoolStats(): { totalPools: number; totalConnections: number; pools: Array<{ url: string; refCount: number; missedHeartbeats: number; failureCount: number; }>; } {
    const pools = Array.from(this.pools.entries()).map(([url, pool]) => ({ url, refCount: pool.refCount, missedHeartbeats: pool.missedHeartbeats, failureCount: pool.failureCount }));
    return { totalPools: this.pools.size, totalConnections: pools.reduce((s, p) => s + p.refCount, 0), pools };
  }

  public closeAll(): void {
    this.pools.forEach(p => p.eventSource.close());
    this.pools.clear();
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    if (this.qualityInterval) { clearInterval(this.qualityInterval); this.qualityInterval = null; }
  }

  public reconnectStream(url: string): void {
    const pool = this.pools.get(url); if (!pool) return;
    const callbacks = new Map(pool.callbacks); const refCount = pool.refCount;
    pool.eventSource.close(); this.pools.delete(url);
    setTimeout(() => { const newPool = this.createPooledStream(url); newPool.callbacks = callbacks; newPool.refCount = refCount; this.pools.set(url, newPool); }, this.config.reconnectDelayMs);
  }
}

export const streamPool = new StreamPool();
export function subscribeStreamPool(url: string, subscriberId: string, callback: StreamEventCallback): () => void { return streamPool.subscribeStreamPool(url, subscriberId, callback); }
export function isStreamPoolingAvailable(): boolean { return isStreamPoolingEnabled(); }
export function getStreamPoolStats(): ReturnType<StreamPool['getPoolStats']> { return streamPool.getPoolStats(); }