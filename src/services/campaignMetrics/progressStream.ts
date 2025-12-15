/**
 * Progress Stream Service (Phase 3, Updated for Phase 5)
 * SSE or polling abstraction for real-time progress updates with stream pooling
 */

import { ProgressUpdate } from '@/types/campaignMetrics';
import type { CampaignProgressResponse } from '@/lib/api-client/models';
import { subscribeStreamPool, isStreamPoolingAvailable } from './streamPool';
import { telemetryService } from './telemetryService';

export interface ProgressStreamOptions {
  campaignId: string;
  useSSE?: boolean; // Default true, fallback to polling if false or SSE fails
  pollingInterval?: number; // Default 5000ms
  maxRetries?: number; // Default 3
}

export interface ProgressStreamCallbacks {
  onUpdate: (update: ProgressUpdate) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Progress stream manager - handles both SSE and polling fallback with stream pooling
 */
export class ProgressStream {
  private eventSource: EventSource | null = null;
  private streamUnsubscribe: (() => void) | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private retryCount = 0;
  private isDestroyed = false;
  private missedHeartbeats = 0;
  private lastHeartbeat = Date.now();
  private heartbeatCheckInterval: NodeJS.Timeout | null = null;
  private static readonly CANONICAL_VERSION = 1;

  constructor(
    private options: ProgressStreamOptions,
    private callbacks: ProgressStreamCallbacks
  ) {}

  /**
   * Start the progress stream
   */
  async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('ProgressStream has been destroyed');
    }

    const useSSE = this.options.useSSE !== false;
    
    if (useSSE && typeof EventSource !== 'undefined') {
      try {
        await this.startSSE();
      } catch (_error) {
        console.warn('[ProgressStream] SSE failed, falling back to polling:', _error);
        this.startPolling();
      }
    } else {
      this.startPolling();
    }
  }

  /**
   * Stop the progress stream
   */
  stop(): void {
    this.cleanup();
    this.isConnected = false;
    this.callbacks.onDisconnect?.();
  }

  /**
   * Destroy the progress stream (cannot be restarted)
   */
  destroy(): void {
    this.stop();
    this.isDestroyed = true;
  }

  /**
   * Check if stream is currently connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Start SSE connection with optional stream pooling
   */
  private async startSSE(): Promise<void> {
    const sseUrl = `/api/v2/campaigns/${this.options.campaignId}/progress/stream`;
    const useStreamPooling = isStreamPoolingAvailable();
    
    return new Promise((resolve, reject) => {
      if (useStreamPooling) {
        // Use stream pooling for Phase 5
        const subscriberId = `progress-${this.options.campaignId}-${Date.now()}`;
        
        this.streamUnsubscribe = subscribeStreamPool(
          sseUrl,
          subscriberId,
          (event: MessageEvent) => {
            this.handleSSEMessage(event);
          }
        );
        
        // Simulate connection success for pooled streams
        setTimeout(() => {
          this.isConnected = true;
          this.retryCount = 0;
          this.callbacks.onConnect?.();
          this.startHeartbeatMonitoring();
          resolve();
        }, 100);
      } else {
        // Use direct EventSource for backward compatibility
        this.eventSource = new EventSource(sseUrl);
        
        this.eventSource.onopen = () => {
          this.isConnected = true;
          this.retryCount = 0;
          this.callbacks.onConnect?.();
          this.startHeartbeatMonitoring();
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        this.eventSource.onerror = (_error) => {
          this.handleSSEError(reject);
        };
      }
    });
  }

  /**
   * Handle SSE message (common for both pooled and direct streams)
   */
  private handleSSEMessage(event: MessageEvent): void {
    try {
      const data: unknown = JSON.parse(event.data);
      
      if (typeof data === 'object' && data !== null && 'type' in data && (data as { type?: string }).type === 'heartbeat') {
        this.lastHeartbeat = Date.now();
        this.missedHeartbeats = 0;
        return;
      }

    if (!this.isCanonicalEnvelope(data)) {
    this.callbacks.onError(new Error('Unexpected SSE payload format'));
    return;
    }

    const envelope = data as CanonicalEnvelope;
    if (envelope.version !== ProgressStream.CANONICAL_VERSION) {
    console.warn('[ProgressStream] Unsupported SSE version', envelope.version);
    return;
    }

    if (envelope.type === 'campaign_progress') {
    if (!this.isCanonicalProgressEnvelope(envelope)) {
      this.callbacks.onError(new Error('Malformed campaign_progress payload'));
      return;
    }
    this.processCampaignProgress(envelope as CanonicalCampaignProgressEvent);
    }
    } catch (_error) {
      this.callbacks.onError(new Error(`Failed to parse SSE data: ${String(_error)}`));
    }
  }

  /**
   * Handle SSE errors for direct EventSource
   */
  private handleSSEError(reject: (reason?: unknown) => void): void {
    this.isConnected = false;
    
    if (this.retryCount < (this.options.maxRetries || 3)) {
      this.retryCount++;
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.startSSE().catch(() => {
            reject(new Error('SSE connection failed'));
          });
        }
      }, 1000 * this.retryCount);
    } else {
      reject(new Error('SSE connection failed after retries'));
    }
  }

  /**
   * Start heartbeat monitoring for QoS degradation detection
   */
  private startHeartbeatMonitoring(): void {
    const heartbeatTimeout = parseInt(process.env.NEXT_PUBLIC_PROGRESS_HEARTBEAT_SECS || '45') * 1000;
    
    this.heartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > heartbeatTimeout) {
        this.missedHeartbeats++;
        
        if (this.missedHeartbeats >= 3) {
          console.warn('[ProgressStream] Multiple heartbeat failures, switching to polling');
          
          // Emit telemetry for degradation
          telemetryService.emitTelemetry('stream_pool_state', {
            url: `/api/v2/campaigns/${this.options.campaignId}/progress/stream`,
            status: 'heartbeat_failure',
            missedHeartbeats: this.missedHeartbeats
          });
          
          // Switch to polling mode
          this.stop();
          this.startPolling();
        }
      }
    }, heartbeatTimeout / 2);
  }

  /**
   * Start polling fallback
   */
  private startPolling(): void {
    const interval = this.options.pollingInterval || 5000;
    
    const poll = async () => {
      if (this.isDestroyed) {
        return;
      }

      try {
        const update = await this.fetchProgressUpdate();
        this.callbacks.onUpdate(update);
        
        if (this.isTerminalPhase(update.phase)) {
          this.callbacks.onComplete();
          this.stop();
          return;
        }
        
        // Schedule next poll
        this.pollingTimer = setTimeout(poll, interval);
      } catch (_error) {
        this.callbacks.onError(_error instanceof Error ? _error : new Error(String(_error)));
        
        // Retry with exponential backoff
        if (this.retryCount < (this.options.maxRetries || 3)) {
          this.retryCount++;
          const backoffDelay = interval * Math.pow(2, this.retryCount - 1);
          this.pollingTimer = setTimeout(poll, backoffDelay);
        }
      }
    };

    this.isConnected = true;
    this.callbacks.onConnect?.();
    poll();
  }

  /**
   * Fetch progress update via polling
   */
  private async fetchProgressUpdate(): Promise<ProgressUpdate> {
    const response = await fetch(`/api/campaigns/${this.options.campaignId}/progress`);
    
    if (!response.ok) {
      throw new Error(`Progress polling failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform response to ProgressUpdate format
    return {
      phase: data.phase || 'unknown',
      analyzedDomains: data.analyzedDomains,
      totalDomains: data.totalDomains,
      status: data.status,
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Check if phase indicates completion
   */
  private isTerminalPhase(phase: string): boolean {
    const terminalPhases = ['completed', 'failed', 'cancelled', 'finished'];
    return terminalPhases.includes(phase.toLowerCase());
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.streamUnsubscribe) {
      this.streamUnsubscribe();
      this.streamUnsubscribe = null;
    }
    
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  private processCampaignProgress(event: CanonicalCampaignProgressEvent): void {
    const overall = event.payload?.overall;
    if (!overall) {
      this.callbacks.onError(new Error('Missing overall progress payload'));
      return;
    }

    const phase = (event.payload?.currentPhase as string) || overall.status || 'unknown';
    const analyzed = typeof overall.processedDomains === 'number' ? overall.processedDomains : 0;
    const total = typeof overall.totalDomains === 'number' ? overall.totalDomains : 0;
    const status = overall.status || 'unknown';
    const updatedAt = typeof event.payload?.timestamp === 'string' ? event.payload?.timestamp : new Date().toISOString();

    const update: ProgressUpdate = {
      phase,
      analyzedDomains: analyzed,
      totalDomains: total,
      status,
      updatedAt,
    };

    this.callbacks.onUpdate(update);
    if (this.isTerminalPhase(update.phase)) {
      this.callbacks.onComplete();
      this.stop();
    }
  }

  private isCanonicalEnvelope(value: unknown): value is CanonicalEnvelope {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as Partial<CanonicalEnvelope>;
    const payload = candidate.payload;
    return (
      typeof candidate.version === 'number' &&
      typeof candidate.type === 'string' &&
      typeof payload === 'object' &&
      payload !== null
    );
  }

  private isCanonicalProgressEnvelope(value: CanonicalEnvelope): value is CanonicalCampaignProgressEvent {
    if (value.type !== 'campaign_progress') {
      return false;
    }
    const payload = (value as CanonicalCampaignProgressEvent).payload;
    return Boolean(payload && typeof payload === 'object' && payload.overall);
  }
}

interface CanonicalEnvelope {
  version: number;
  type: string;
  payload: Record<string, unknown>;
}

type CanonicalCampaignProgressPayload = CampaignProgressResponse & {
  currentPhase?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
};

type CanonicalCampaignProgressEvent = CanonicalEnvelope & {
  type: 'campaign_progress';
  payload: CanonicalCampaignProgressPayload;
};

/**
 * Create and start a progress stream
 */
export function createProgressStream(
  options: ProgressStreamOptions,
  callbacks: ProgressStreamCallbacks
): ProgressStream {
  const stream = new ProgressStream(options, callbacks);
  stream.start().catch(callbacks.onError);
  return stream;
}

/**
 * Create a mock progress stream for testing/demo
 */
export function createMockProgressStream(
  options: ProgressStreamOptions,
  callbacks: ProgressStreamCallbacks
): ProgressStream {
  const phases = ['initializing', 'dns_validation', 'http_validation', 'enrichment', 'analysis', 'completed'];
  let phaseIndex = 0;
  let analyzedCount = 0;
  
  const mockStream = {
    connected: true,
    
    start: async () => {
      callbacks.onConnect?.();
      
      const interval = setInterval(() => {
        if (phaseIndex >= phases.length) {
          clearInterval(interval);
          callbacks.onComplete();
          return;
        }
        
        const totalDomains = 100;
        analyzedCount = Math.min(totalDomains, analyzedCount + Math.floor(Math.random() * 10) + 5);
        
        const update: ProgressUpdate = {
          phase: phases[phaseIndex] || 'unknown',
          analyzedDomains: analyzedCount,
          totalDomains,
          status: phaseIndex === phases.length - 1 ? 'completed' : 'in_progress',
          updatedAt: new Date().toISOString()
        };
        
        callbacks.onUpdate(update);
        
        // Advance phase when domain count is high enough
        if (analyzedCount >= totalDomains || Math.random() > 0.7) {
          phaseIndex++;
          analyzedCount = 0;
        }
      }, 2000);
    },
    
    stop: () => {
      callbacks.onDisconnect?.();
    },
    
    destroy: () => {
      callbacks.onDisconnect?.();
    }
  } as ProgressStream;

  return mockStream;
}