// WebSocket Stream Manager - High-performance real-time domain streaming
// Aligned with OpenAPI 3.0 contract and backend WebSocket capabilities

import type { StreamingMessage, DomainGenerationPayload } from '@/lib/stores/campaignDetailsStore';

export interface StreamEventHandlers {
  onDomainGenerated: (payload: DomainGenerationPayload) => void;
  onDNSValidation: (payload: DNSValidationPayload) => void;
  onHTTPValidation: (payload: HTTPValidationPayload) => void;
  onCampaignProgress: (payload: CampaignProgressPayload) => void;
  onCampaignStatus: (payload: CampaignStatusPayload) => void;
  onError: (error: WebSocketError) => void;
  onConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  // 🚀 WEBSOCKET PUSH MODEL: New handlers for real-time updates
  onProxyStatusUpdate?: (payload: ProxyStatusPayload) => void;
  onProxyListUpdate?: (payload: ProxyListPayload) => void;
  onDashboardActivity?: (payload: DashboardActivityPayload) => void;
}

export interface DNSValidationPayload {
  campaignId: string;
  domainId: string;
  domain: string;
  validationResult: 'resolved' | 'unresolved' | 'error';
  errorDetails?: string;
  timestamp: string;
}

export interface HTTPValidationPayload {
  campaignId: string;
  domainId: string;
  domain: string;
  validationResult: 'valid' | 'invalid' | 'error';
  statusCode?: number;
  finalUrl?: string;
  errorDetails?: string;
  timestamp: string;
}

export interface CampaignProgressPayload {
  campaignId: string;
  domainsGenerated?: number;
  targetCount?: number;
  progressPercentage?: number;
  estimatedTimeRemaining?: number;
  timestamp: string;
}

export interface CampaignStatusPayload {
  campaignId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  reason?: string;
  timestamp: string;
}

// 🚀 WEBSOCKET PUSH MODEL: New payload types for real-time updates
export interface ProxyStatusPayload {
  proxyId: string;
  status: string;
  health: 'healthy' | 'unhealthy';
  responseTime?: number;
  timestamp: string;
}

export interface ProxyListPayload {
  action: 'create' | 'update' | 'delete';
  proxyId: string;
  proxyData?: unknown;
  timestamp: string;
}

export interface DashboardActivityPayload {
  campaignId: string;
  domainName: string;
  activity: string;
  status: string;
  phase: string;
  timestamp: string;
}

export interface WebSocketError {
  code: string;
  message: string;
  timestamp: string;
  recoverable: boolean;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketStreamManager {
  // Connection management
  connect(campaignId: string): Promise<void>;
  disconnect(): void;
  getConnectionStatus(): ConnectionStatus;
  
  // Message handling
  subscribeToEvents(handlers: StreamEventHandlers): () => void;
  getLastSequenceNumber(): number;
  
  // Streaming configuration
  enableHighFrequencyMode(): void; // 100+ domains/second
  configureBatchSize(size: number): void;
  
  // Error recovery
  retryConnection(maxAttempts: number): Promise<void>;
  requestMissedMessages(lastSequenceNumber: number): Promise<void>;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableHighFrequency: boolean;
  batchSize: number;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url: '',
  maxReconnectAttempts: 10,
  reconnectInterval: 1000, // Start with 1 second
  heartbeatInterval: 30000, // 30 seconds
  messageTimeout: 5000, // 5 seconds
  enableHighFrequency: true,
  batchSize: 1, // Individual domain events
};

export class WebSocketStreamManagerImpl implements WebSocketStreamManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private handlers: StreamEventHandlers | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private campaignId: string | null = null;
  private lastSequenceNumber = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: StreamingMessage[] = [];
  private isDestroyed = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(campaignId: string): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('WebSocketStreamManager has been destroyed');
    }

    this.campaignId = campaignId;
    this.disconnect(); // Clean up any existing connection

    return new Promise((resolve, reject) => {
      try {
        // Construct WebSocket URL - backend expects just the base endpoint
        const wsUrl = this.config.url;

        console.log(`🔗 [WebSocket] Connecting to campaign ${campaignId}:`, wsUrl);

        this.ws = new WebSocket(wsUrl, this.config.protocols);
        this.updateConnectionStatus('reconnecting');

        this.ws.onopen = () => {
          console.log(`✅ [WebSocket] Connected to campaign ${campaignId}`);
          this.updateConnectionStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          // Send connection initialization as expected by backend
          this.sendMessage({
            type: 'connection_init',
            lastSequenceNumber: this.lastSequenceNumber,
          });

          // Subscribe to campaign-specific events
          this.sendMessage({
            type: 'subscribe_campaign',
            campaignId,
            lastSequenceNumber: this.lastSequenceNumber,
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error(`❌ [WebSocket] Connection error for campaign ${campaignId}:`, error);
          this.handleError(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 [WebSocket] Connection closed for campaign ${campaignId}:`, event.code, event.reason);
          this.updateConnectionStatus('disconnected');
          this.stopHeartbeat();
          
          if (!this.isDestroyed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionStatus === 'reconnecting') {
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.config.messageTimeout);

      } catch (error) {
        console.error(`❌ [WebSocket] Failed to create connection for campaign ${campaignId}:`, error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    console.log(`🔌 [WebSocket] Disconnecting from campaign ${this.campaignId}`);
    
    this.stopHeartbeat();
    this.stopReconnect();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.updateConnectionStatus('disconnected');
  }

  destroy(): void {
    console.log(`🗑️ [WebSocket] Destroying WebSocketStreamManager for campaign ${this.campaignId}`);
    this.isDestroyed = true;
    this.disconnect();
    this.handlers = null;
    this.messageQueue = [];
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  subscribeToEvents(handlers: StreamEventHandlers): () => void {
    this.handlers = handlers;
    
    return () => {
      this.handlers = null;
    };
  }

  getLastSequenceNumber(): number {
    return this.lastSequenceNumber;
  }

  enableHighFrequencyMode(): void {
    this.config.enableHighFrequency = true;
    this.config.batchSize = 1; // Individual events for real-time updates
  }

  configureBatchSize(size: number): void {
    this.config.batchSize = Math.max(1, size);
  }

  async retryConnection(maxAttempts: number): Promise<void> {
    if (!this.campaignId) {
      throw new Error('No campaign ID set for retry');
    }

    this.config.maxReconnectAttempts = maxAttempts;
    this.reconnectAttempts = 0;
    
    return this.connect(this.campaignId);
  }

  async requestMissedMessages(lastSequenceNumber: number): Promise<void> {
    if (!this.ws || this.connectionStatus !== 'connected') {
      throw new Error('WebSocket not connected');
    }

    this.sendMessage({
      type: 'request_missed_messages',
      campaignId: this.campaignId!,
      lastSequenceNumber,
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Handle concatenated JSON messages from backend
      const rawData = event.data.trim();
      
      // Split by newlines and filter out empty lines
      const jsonLines = rawData.split('\n').filter((line: string) => line.trim());
      
      // If no newlines, try to split by }{ pattern (concatenated JSON objects)
      let messages: string[] = jsonLines;
      if (jsonLines.length === 1 && jsonLines[0].includes('}{')) {
        // Split concatenated JSON objects
        const parts = jsonLines[0].split('}{');
        messages = parts.map((part: string, index: number) => {
          if (index === 0) return part + '}';
          if (index === parts.length - 1) return '{' + part;
          return '{' + part + '}';
        });
      }

      // Parse each JSON message
      for (const messageData of messages) {
        if (!messageData.trim()) continue;
        
        try {
          const message: StreamingMessage = JSON.parse(messageData);
          
          // Update sequence number for ordering
          if (message.sequenceNumber && message.sequenceNumber > this.lastSequenceNumber) {
            this.lastSequenceNumber = message.sequenceNumber;
          }

          console.log(`📥 [WebSocket] Received message:`, {
            type: message.type,
            campaignId: message.campaignId,
            sequenceNumber: message.sequenceNumber,
            timestamp: message.timestamp,
          });

          // Queue message for processing
          this.messageQueue.push(message);
        } catch (parseError) {
          console.error('❌ [WebSocket] Failed to parse individual message:', parseError, messageData);
        }
      }
      
      this.processMessageQueue();

    } catch (error) {
      console.error('❌ [WebSocket] Failed to parse message:', error, event.data);
      this.handleError(error);
    }
  }

  private processMessageQueue(): void {
    // Sort messages by sequence number for proper ordering
    this.messageQueue.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));

    while (this.messageQueue.length > 0 && this.handlers) {
      const message = this.messageQueue.shift()!;
      this.dispatchMessage(message);
    }
  }

  private dispatchMessage(message: StreamingMessage): void {
    if (!this.handlers) return;

    try {
      switch (message.type) {
        // Legacy message types
        case 'domain_generated':
        case 'domain.generated':
          if (message.data) {
            this.handlers.onDomainGenerated(message.data as DomainGenerationPayload);
          }
          break;

        case 'dns_validation_result':
        case 'dns.validation.result':
          if (message.data) {
            this.handlers.onDNSValidation(message.data as DNSValidationPayload);
          }
          break;

        case 'http_validation_result':
        case 'http.validation.result':
          if (message.data) {
            this.handlers.onHTTPValidation(message.data as HTTPValidationPayload);
          }
          break;

        case 'campaign_progress':
        case 'campaign.progress':
        case 'domain_generation_progress':
        case 'validation_progress':
          if (message.data) {
            this.handlers.onCampaignProgress(message.data as CampaignProgressPayload);
          }
          break;

        case 'campaign_status':
        case 'campaign.status':
        case 'campaign_completed':
        case 'campaign_failed':
        case 'campaign_phase_complete':
        case 'campaign_complete':
        case 'campaign_error':
          if (message.data) {
            this.handlers.onCampaignStatus(message.data as CampaignStatusPayload);
          }
          break;

        case 'connection_ack':
        case 'subscription_ack':
        case 'subscription_confirmed':
          console.log(`✅ [WebSocket] ${message.type} received`);
          break;

        case 'heartbeat':
          // Respond to heartbeat
          this.sendMessage({ type: 'heartbeat_response', timestamp: new Date().toISOString() });
          break;

        case 'pong':
          // Server responded to our ping
          console.log(`🏓 [WebSocket] Pong received`);
          break;

        case 'ping':
          // Server sent ping, respond with pong
          this.sendMessage({ type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'system_notification':
        case 'system.notification':
          console.log(`📢 [WebSocket] System notification:`, message.data);
          break;

        case 'proxy_status_update':
        case 'proxy.status':
          console.log(`🔗 [WebSocket] Proxy status update:`, message.data);
          // 🚀 WEBSOCKET PUSH MODEL: Route proxy status updates to handlers
          if (message.data && this.handlers && this.handlers.onProxyStatusUpdate) {
            this.handlers.onProxyStatusUpdate(message.data as ProxyStatusPayload);
          }
          break;

        case 'proxy_list_update':
          console.log(`📋 [WebSocket] Proxy list update:`, message.data);
          // 🚀 WEBSOCKET PUSH MODEL: Route proxy CRUD updates to handlers
          if (message.data && this.handlers && this.handlers.onProxyListUpdate) {
            this.handlers.onProxyListUpdate(message.data as ProxyListPayload);
          }
          break;

        case 'dashboard_activity':
          console.log(`📊 [WebSocket] Dashboard activity:`, message.data);
          // 🚀 WEBSOCKET PUSH MODEL: Route dashboard activity to handlers
          if (message.data && this.handlers && this.handlers.onDashboardActivity) {
            this.handlers.onDashboardActivity(message.data as DashboardActivityPayload);
          }
          break;

        case 'user_notification':
          console.log(`👤 [WebSocket] User notification:`, message.data);
          break;

        default:
          console.log(`📝 [WebSocket] Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ [WebSocket] Error dispatching message:`, error, message);
      this.handleError(error);
    }
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      console.log(`🔄 [WebSocket] Connection status changed: ${this.connectionStatus} → ${status}`);
      this.connectionStatus = status;
      
      if (this.handlers) {
        this.handlers.onConnectionStatus(status);
      }
    }
  }

  private handleError(error: unknown): void {
    const wsError: WebSocketError = {
      code: 'WEBSOCKET_ERROR',
      message: error instanceof Error ? error.message : 'Unknown WebSocket error',
      timestamp: new Date().toISOString(),
      recoverable: this.reconnectAttempts < this.config.maxReconnectAttempts,
    };

    console.error(`❌ [WebSocket] Error:`, wsError);

    if (this.handlers) {
      this.handlers.onError(wsError);
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`🔄 [WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (this.campaignId && !this.isDestroyed) {
        try {
          await this.connect(this.campaignId);
        } catch (error) {
          console.error(`❌ [WebSocket] Reconnect attempt ${this.reconnectAttempts} failed:`, error);
        }
      }
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.connectionStatus === 'connected') {
        this.sendMessage({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (this.ws && this.connectionStatus === 'connected') {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ [WebSocket] Failed to send message:', error, message);
        this.handleError(error);
      }
    }
  }
}

// Factory function for creating WebSocket stream manager
export function createWebSocketStreamManager(config: Partial<WebSocketConfig> = {}): WebSocketStreamManager {
  // Get WebSocket URL from environment - NO hardcoded fallbacks allowed
  const defaultUrl = process.env.NEXT_PUBLIC_WS_URL;
  
  if (!defaultUrl || !defaultUrl.trim()) {
    throw new Error(
      'CONFIGURATION ERROR: WebSocket URL not configured. ' +
      'Please set NEXT_PUBLIC_WS_URL environment variable to the backend WebSocket URL. ' +
      'Example: NEXT_PUBLIC_WS_URL=ws://your-backend-host:8080/api/v2/ws ' +
      'This prevents accidental connections to localhost or misconfigured backends.'
    );
  }
  
  return new WebSocketStreamManagerImpl({
    url: defaultUrl,
    ...config,
  });
}

// Global instance for reuse
let globalStreamManager: WebSocketStreamManager | null = null;

export function getWebSocketStreamManager(): WebSocketStreamManager {
  if (!globalStreamManager) {
    globalStreamManager = createWebSocketStreamManager();
  }
  return globalStreamManager;
}

export function destroyWebSocketStreamManager(): void {
  if (globalStreamManager) {
    (globalStreamManager as WebSocketStreamManagerImpl).destroy();
    globalStreamManager = null;
  }
}