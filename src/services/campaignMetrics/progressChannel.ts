/**
 * Progress Channel (Phase 4)
 * Enhanced version of progressStream with heartbeat, reconnection, and fallback
 */

import { ProgressUpdate } from '@/types/campaignMetrics';

// Feature flags
const PROGRESS_HEARTBEAT_SECS = parseInt(process.env.NEXT_PUBLIC_PROGRESS_HEARTBEAT_SECS || '45');
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 60000; // 60s
const JITTER_FACTOR = 0.1; // ±10%

export type ConnectionState = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'degraded'
  | 'pollingFallback'
  | 'error';

export interface ProgressChannelOptions {
  campaignId: string;
  useSSE?: boolean;
  pollingInterval?: number;
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
  fallbackActivations: number;
}

export class ProgressChannel {
  private options: ProgressChannelOptions;
  private eventSource: EventSource | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  private state: ConnectionState = 'disconnected';
  private metrics: ProgressChannelMetrics = {
    reconnectAttempts: 0,
    totalMessages: 0,
    lastHeartbeat: null,
    uptime: 0,
    fallbackActivations: 0
  };
  
  private startTime: number = 0;
  private isDestroyed: boolean = false;

  constructor(options: ProgressChannelOptions) {
    this.options = options;
  }

  /**
   * Start the progress channel
   */
  async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot start destroyed ProgressChannel');
    }

    this.startTime = Date.now();
    this.setState('connecting');
    
    try {
      if (this.options.useSSE && typeof EventSource !== 'undefined') {
        await this.startSSE();
      } else {
        await this.startPolling();
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to start'));
    }
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
   * Start polling fallback
   */
  private async startPolling(): Promise<void> {
    this.setState('pollingFallback');
    this.metrics.fallbackActivations++;
    
    const poll = async () => {
      if (this.isDestroyed) return;
      
      try {
        const url = this.buildPollingUrl();
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }
        
        const data = await response.json();
        this.handleMessage(JSON.stringify(data));
        
        // Schedule next poll
        this.pollingTimer = setTimeout(poll, this.options.pollingInterval || 5000);
        
      } catch (error) {
        console.error('Polling error:', error);
        this.handleConnectionError();
      }
    };

    // Start first poll
    await poll();
  }

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
   * Handle connection errors
   */
  private handleConnectionError(): void {
    if (this.isDestroyed) return;
    
    this.setState('error');
    this.metrics.reconnectAttempts++;
    
    if (this.metrics.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      // Try to reconnect
      this.reconnect();
    } else if (this.options.useSSE) {
      // Fall back to polling
      console.warn('Max SSE reconnection attempts reached, falling back to polling');
      this.options.useSSE = false;
      this.metrics.reconnectAttempts = 0;
      this.reconnect();
    } else {
      // Final failure
      this.handleError(new Error('Connection failed after maximum retry attempts'));
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
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://');
    return `${baseUrl}/campaigns/${this.options.campaignId}/progress/stream`;
  }

  /**
   * Build polling URL
   */
  private buildPollingUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
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
    
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
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