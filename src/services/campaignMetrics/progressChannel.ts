/**
 * Progress Channel (Phase 4)
 * Enhanced version of progressStream with heartbeat, reconnection, and fallback
 */

import { ProgressUpdate } from '@/types/campaignMetrics';

// Feature flags
const PROGRESS_HEARTBEAT_SECS = typeof process !== 'undefined' 
  ? parseInt(process.env?.NEXT_PUBLIC_PROGRESS_HEARTBEAT_SECS || '45')
  : 45;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 60000; // 60s
const JITTER_FACTOR = 0.1; // ±10%

export type ConnectionState = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'degraded'
  | 'error';

export interface ProgressChannelOptions {
  campaignId: string;
  useSSE?: boolean;
  maxRetries?: number;
  useMock?: boolean;
  onStateChange?: (state: ConnectionState) => void;
  onProgress?: (update: ProgressUpdate) => void;
  onError?: (error: Error) => void;
}

export interface ProgressChannelMetrics {
  reconnectAttempts: number;
  totalMessages: number;
  lastHeartbeat: number | null;
  uptime: number;
}

export class ProgressChannel {
  private options: ProgressChannelOptions;
  private eventSource: EventSource | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  private state: ConnectionState = 'disconnected';
  private metrics: ProgressChannelMetrics = {
    reconnectAttempts: 0,
    totalMessages: 0,
    lastHeartbeat: null,
    uptime: 0
  };
  
  private startTime: number = 0;
  private isDestroyed: boolean = false;

  constructor(options: ProgressChannelOptions) {
    this.options = options;
  }

  /**
   * Start the progress channel - SSE only, no polling fallback
   */
  async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot start destroyed ProgressChannel');
    }

    this.startTime = Date.now();
    this.setState('connecting');
    
    try {
      if (this.options.useMock) {
        await this.startMockProgress();
      } else if (typeof EventSource !== 'undefined') {
        await this.startSSE();
      } else {
        throw new Error('EventSource not supported in this environment');
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to start SSE connection'));
    }
  }

  /**
   * Start mock progress for development/testing
   */
  private async startMockProgress(): Promise<void> {
    // Mock implementation - simulate progress updates
    this.setState('connected');
    
    const mockProgressTimer = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(mockProgressTimer);
        return;
      }
      
      const mockUpdate: ProgressUpdate = {
        phase: 'running',
        analyzedDomains: Math.floor(Math.random() * 100),
        totalDomains: 100,
        status: 'active',
        updatedAt: new Date().toISOString()
      };
      
      if (this.options.onProgress) {
        this.options.onProgress(mockUpdate);
      }
    }, 1000);
  }

  /**
   * Stop the progress channel
   */
  stop(): void {
    this.clearTimers();
    this.closeEventSource();
    this.setState('disconnected');
  }

  /**
   * Destroy the progress channel
   */
  destroy(): void {
    this.stop();
    this.isDestroyed = true;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): ProgressChannelMetrics {
    return {
      ...this.metrics,
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    if (this.isDestroyed) return;
    
    this.setState('connecting');
    this.stop();
    
    // Exponential backoff with jitter
    const delay = this.calculateReconnectDelay();
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.start().catch(error => this.handleError(error));
      }
    }, delay);
  }

  /**
   * Start Server-Sent Events connection
   */
  private async startSSE(): Promise<void> {
    const url = this.buildSSEUrl();
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        this.setState('connected');
        this.metrics.reconnectAttempts = 0; // Reset on successful connection
        this.startHeartbeat();
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.eventSource.onerror = (event) => {
        console.error('SSE error:', event);
        this.handleConnectionError();
      };

    } catch (error) {
      throw new Error(`Failed to create EventSource: ${error}`);
    }
  }

  /**

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    this.metrics.totalMessages++;
    this.metrics.lastHeartbeat = Date.now();
    this.resetHeartbeat();

    try {
      const update: ProgressUpdate = JSON.parse(data);
      
      if (this.options.onProgress) {
        this.options.onProgress(update);
      }
      
      // Check if this indicates degraded performance
      if (update.phase === 'error' || update.phase === 'timeout') {
        this.setState('degraded');
      } else if (this.state === 'degraded') {
        this.setState('connected');
      }
      
    } catch (error) {
      console.error('Failed to parse progress message:', error);
    }
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    if (this.isDestroyed) return;
    
    this.setState('error');
    this.metrics.reconnectAttempts++;
    
    if (this.metrics.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      // Try to reconnect with exponential backoff
      this.reconnect();
    } else {
      // Final failure after max attempts
      this.handleError(new Error(`SSE connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`));
    }
  }

  /**
   * Handle final errors
   */
  private handleError(error: Error): void {
    this.setState('error');
    
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * Set state and notify
   */
  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      
      if (this.options.onStateChange) {
        this.options.onStateChange(newState);
      }
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.resetHeartbeat();
  }

  /**
   * Reset heartbeat timer
   */
  private resetHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setTimeout(() => {
      console.warn('Heartbeat timeout, reconnecting...');
      this.handleConnectionError();
    }, PROGRESS_HEARTBEAT_SECS * 1000);
  }

  /**
   * Calculate reconnect delay with exponential backoff and jitter
   */
  private calculateReconnectDelay(): number {
    const exponentialDelay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(1.5, this.metrics.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    
    // Add jitter (±10%)
    const jitter = exponentialDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
    
    return Math.max(0, exponentialDelay + jitter);
  }

  /**
   * Build SSE URL
   */
  private buildSSEUrl(): string {
    const baseUrl = typeof process !== 'undefined' 
      ? process.env?.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://')
      : 'http://localhost:8080';
    return `${baseUrl}/campaigns/${this.options.campaignId}/progress/stream`;
  }

  /**
   * Build polling URL
   */
  private buildPollingUrl(): string {
    const baseUrl = typeof process !== 'undefined' 
      ? process.env?.NEXT_PUBLIC_API_URL
      : 'http://localhost:8080/api/v2';
    return `${baseUrl}/campaigns/${this.options.campaignId}/progress`;
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Close EventSource connection
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Factory function for creating progress channels
 */
export function createProgressChannel(options: ProgressChannelOptions): ProgressChannel {
  return new ProgressChannel(options);
}

/**
 * Create mock progress channel for development
 */
export function createMockProgressChannel(options: ProgressChannelOptions): ProgressChannel {
  // For now, return a regular channel with mock flag
  // Could be extended to simulate various connection scenarios
  return new ProgressChannel({ ...options, useMock: true });
}