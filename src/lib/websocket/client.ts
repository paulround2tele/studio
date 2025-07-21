// src/lib/websocket/client.ts
// Session-based WebSocket Client - removes token authentication, uses cookies only
import {
  getWebSocketSessionConfig,
  webSocketAuthUtils,
  getWebSocketPerformanceConfig,
  webSocketReconnectionConfig
} from '@/lib/config/websocket';

// BACKEND-DRIVEN: Runtime auto-detection (matches backend's empty servers design)
const getApiBaseUrl = async (): Promise<string> => {
  // First try configured URL from environment
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return configured.trim();
  }

  // BACKEND-DRIVEN AUTO-DETECTION: Never throw errors, always detect at runtime
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Development: Use current hostname with backend port :8080
      const apiUrl = `${protocol}//${hostname}:8080/api/v2`;
      console.log(`🔗 [WebSocket Client] Auto-detected development API URL: ${apiUrl}`);
      return apiUrl;
    } else {
      // Production: Use same origin as frontend (same hostname, same protocol)
      const apiUrl = `${protocol}//${hostname}/api/v2`;
      console.log(`🔗 [WebSocket Client] Auto-detected production API URL: ${apiUrl}`);
      return apiUrl;
    }
  }

  // SSR fallback: Use relative URL (backend serves frontend)
  const fallbackUrl = '/api/v2';
  console.log(`🔗 [WebSocket Client] Using SSR fallback URL: ${fallbackUrl}`);
  return fallbackUrl;
};

export interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export interface WebSocketConfig {
  url?: string;
  protocols?: string[];
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  enableAutoReconnect?: boolean;
  enableSessionValidation?: boolean;
  onSessionExpired?: () => void;
}

export type WebSocketEventType = 
  | 'open' 
  | 'close' 
  | 'error' 
  | 'message' 
  | 'sessionExpired'
  | 'reconnecting'
  | 'reconnected';

export type WebSocketEventHandler = (event?: unknown) => void;

class SessionWebSocketClient {
  private static instance: SessionWebSocketClient;
  private ws: WebSocket | null = null;
  private url: string = '';
  private config: WebSocketConfig;
  private sessionConfig = getWebSocketSessionConfig();
  private performanceConfig = getWebSocketPerformanceConfig();
  
  // Connection state
  private isConnecting = false;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private sessionValidationTimer: NodeJS.Timeout | null = null;
  
  // Event handling
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  
  // Session management
  private lastSessionValidation = 0;
  private sessionValidationInterval: number;
  
  // Data integrity and sequence tracking
  private lastSequenceNumbers: Map<string, number> = new Map(); // campaignId -> last sequence
  private eventHistory: Map<string, Set<string>> = new Map(); // campaignId -> Set of eventHashes
  private pendingRecovery: Set<string> = new Set(); // campaignIds pending recovery
  private maxEventHistorySize = 1000;

  static getInstance(): SessionWebSocketClient {
    if (!SessionWebSocketClient.instance) {
      SessionWebSocketClient.instance = new SessionWebSocketClient();
    }
    return SessionWebSocketClient.instance;
  }

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      maxReconnectAttempts: webSocketReconnectionConfig.maxAttempts,
      reconnectDelay: webSocketReconnectionConfig.baseDelay,
      pingInterval: 30000, // 30 seconds
      enableAutoReconnect: true,
      enableSessionValidation: true,
      ...config
    };
    
    this.maxReconnectAttempts = this.config.maxReconnectAttempts || 10;
    this.sessionValidationInterval = this.sessionConfig.sessionValidationInterval;
    
    // Initialize event handler sets
    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    const eventTypes: WebSocketEventType[] = [
      'open', 'close', 'error', 'message', 'sessionExpired', 'reconnecting', 'reconnected'
    ];
    
    eventTypes.forEach(type => {
      this.eventHandlers.set(type, new Set());
    });
  }

  // Event subscription methods
  on(event: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
    
    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  private emit(event: WebSocketEventType, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    try {
      // Check session validity before connecting
      if (!this.validateSessionForConnection()) {
        throw new Error('No valid session for WebSocket connection');
      }

      this.isConnecting = true;
      
      // Get WebSocket URL
      const wsUrl = await this.getWebSocketUrl();
      this.url = wsUrl;
      
      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl, this.config.protocols);
      
      // Setup event handlers
      this.setupWebSocketHandlers();
      
    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket connection failed:', error);
      this.emit('error', error);
      
      if (this.config.enableAutoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private async getWebSocketUrl(): Promise<string> {
    if (this.config.url) {
      return this.config.url;
    }

    const baseUrl = await getApiBaseUrl();
    const wsProtocol = baseUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const host = baseUrl.replace(/^https?:\/\//, '');
    
    return `${wsProtocol}${host}/ws`;
  }

  private validateSessionForConnection(): boolean {
    // Check if session cookie exists - session authentication is handled by cookies
    return webSocketAuthUtils.isSessionValidForWebSocket();
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.isAuthenticated = true;
      this.reconnectAttempts = 0;
      
      // Start session validation
      this.startSessionValidation();
      
      // Start ping/pong mechanism
      this.startPing();
      
      // Process queued messages
      this.processMessageQueue();
      
      this.emit('open', event);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      this.isAuthenticated = false;
      this.stopTimers();
      
      this.emit('close', event);
      
      // Auto-reconnect if enabled and not a normal closure
      if (this.config.enableAutoReconnect && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.emit('error', event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle session expiration messages
        if (message.type === 'session_expired') {
          this.handleSessionExpired();
          return;
        }
        
        // Process message with data integrity checks
        this.processMessageWithIntegrity(message);
        
        this.emit('message', message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  private startSessionValidation(): void {
    if (!this.config.enableSessionValidation) return;
    
    this.sessionValidationTimer = setInterval(() => {
      this.validateSession();
    }, this.sessionValidationInterval);
  }

  private async validateSession(): Promise<void> {
    try {
      // For session-based auth, validation is handled by the server via cookies
      // We just check if the websocket connection is still valid
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.handleSessionExpired();
        return;
      }
      
      this.lastSessionValidation = Date.now();
    } catch (error) {
      console.error('Session validation failed:', error);
      this.handleSessionExpired();
    }
  }

  private handleSessionExpired(): void {
    console.warn('WebSocket session expired');
    this.isAuthenticated = false;
    
    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Session expired');
    }
    
    // Clear timers
    this.stopTimers();
    
    // Emit session expired event
    this.emit('sessionExpired');
    
    // Redirect to login if handler provided
    if (this.config.onSessionExpired) {
      this.config.onSessionExpired();
    } else if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  private startPing(): void {
    if (!this.config.pingInterval) return;
    
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          payload: { timestamp: Date.now() }
        });
      }
    }, this.config.pingInterval);
  }

  private stopTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.sessionValidationTimer) {
      clearInterval(this.sessionValidationTimer);
      this.sessionValidationTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.calculateReconnectDelay();
    console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts + 1, 
      maxAttempts: this.maxReconnectAttempts,
      delay 
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().then(() => {
        if (this.isConnected()) {
          this.emit('reconnected');
        }
      });
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelay || webSocketReconnectionConfig.baseDelay;
    const maxDelay = webSocketReconnectionConfig.maxDelay;
    const jitterFactor = webSocketReconnectionConfig.jitterFactor;
    
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts),
      maxDelay
    );
    
    const jitter = exponentialDelay * jitterFactor * Math.random();
    return exponentialDelay + jitter;
  }

  // Message handling
  send(message: WebSocketMessage): void {
    if (!this.isConnected() || !this.isAuthenticated) {
      console.warn('WebSocket not connected or not authenticated, queueing message');
      this.queueMessage(message);
      return;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString()
      };
      
      this.ws!.send(JSON.stringify(messageWithTimestamp));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.queueMessage(message);
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length >= this.performanceConfig.maxMessageBufferSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    this.messageQueue.push(message);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected() && this.isAuthenticated) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Subscription management
  subscribe(topic: string): void {
    this.send({
      type: 'subscribe',
      payload: { topic }
    });
  }

  unsubscribe(topic: string): void {
    this.send({
      type: 'unsubscribe',
      payload: { topic }
    });
  }

  // Connection state
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed' as any;
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting' as any;
      case WebSocket.OPEN: return 'open' as any;
      case WebSocket.CLOSING: return 'closing' as any;
      case WebSocket.CLOSED: return 'closed' as any;
      default: return 'closed' as any;
    }
  }

  // Cleanup
  disconnect(): void {
    this.config.enableAutoReconnect = false;
    this.stopTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isAuthenticated = false;
    this.messageQueue = [];
  }

  // Data integrity processing
  private processMessageWithIntegrity(message: WebSocketMessage): void {
    // Check if message has sequence information
    const messageData = message.payload as any;
    if (messageData && messageData.sequence) {
      const sequence = messageData.sequence;
      const campaignId = sequence.campaignId;
      
      // Validate sequence order
      const lastSequence = this.lastSequenceNumbers.get(campaignId) || 0;
      if (sequence.sequenceNumber <= lastSequence) {
        console.warn(`[DATA INTEGRITY] Out-of-order message detected for campaign ${campaignId}: ${sequence.sequenceNumber} <= ${lastSequence}`);
        return; // Skip out-of-order messages
      }
      
      // Check for duplicate events
      let eventHistory = this.eventHistory.get(campaignId);
      if (!eventHistory) {
        eventHistory = new Set();
        this.eventHistory.set(campaignId, eventHistory);
      }
      
      if (eventHistory.has(sequence.eventHash)) {
        console.warn(`[DATA INTEGRITY] Duplicate event detected and skipped: ${sequence.eventId}`);
        return; // Skip duplicate events
      }
      
      // Record event
      eventHistory.add(sequence.eventHash);
      this.lastSequenceNumbers.set(campaignId, sequence.sequenceNumber);
      
      // Prune old events to prevent memory leaks
      if (eventHistory.size > this.maxEventHistorySize) {
        const eventsArray = Array.from(eventHistory);
        eventHistory.clear();
        eventsArray.slice(-this.maxEventHistorySize / 2).forEach(hash => eventHistory!.add(hash));
      }
      
      console.log(`[DATA INTEGRITY] Message processed: campaign=${campaignId}, seq=${sequence.sequenceNumber}, event=${sequence.eventId}`);
    }
  }

  // Request event recovery for a campaign
  requestEventRecovery(campaignId: string): void {
    if (this.pendingRecovery.has(campaignId)) {
      console.log(`[DATA RECOVERY] Recovery already pending for campaign ${campaignId}`);
      return;
    }
    
    const lastSequence = this.lastSequenceNumbers.get(campaignId) || 0;
    this.pendingRecovery.add(campaignId);
    
    this.send({
      type: 'request_event_recovery',
      payload: {
        campaignId,
        lastSequenceNumber: lastSequence
      }
    });
    
    console.log(`[DATA RECOVERY] Requested event recovery for campaign ${campaignId} from sequence ${lastSequence}`);
    
    // Clear pending status after timeout
    setTimeout(() => {
      this.pendingRecovery.delete(campaignId);
    }, 30000); // 30 second timeout
  }

  // Clear data integrity tracking for a campaign
  clearCampaignTracking(campaignId: string): void {
    this.lastSequenceNumbers.delete(campaignId);
    this.eventHistory.delete(campaignId);
    this.pendingRecovery.delete(campaignId);
    console.log(`[DATA INTEGRITY] Cleared tracking for campaign ${campaignId}`);
  }

  // Statistics
  getStats(): {
    isConnected: boolean;
    isAuthenticated: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    lastSessionValidation: number;
    trackedCampaigns: string[];
    eventHistorySize: number;
  } {
    return {
      isConnected: this.isConnected(),
      isAuthenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastSessionValidation: this.lastSessionValidation,
      trackedCampaigns: Array.from(this.lastSequenceNumbers.keys()),
      eventHistorySize: Array.from(this.eventHistory.values()).reduce((total, set) => total + set.size, 0),
    };
  }
}

// Export singleton instance
export const sessionWebSocketClient = SessionWebSocketClient.getInstance();

// Convenience methods
export function connectWebSocket(config?: WebSocketConfig): Promise<void> {
  const client = SessionWebSocketClient.getInstance();
  if (config) {
    Object.assign(client['config'], config);
  }
  return client.connect();
}

export function disconnectWebSocket(): void {
  sessionWebSocketClient.disconnect();
}

export function sendWebSocketMessage(message: WebSocketMessage): void {
  sessionWebSocketClient.send(message);
}

export function subscribeToWebSocketTopic(topic: string): void {
  sessionWebSocketClient.subscribe(topic);
}

export function unsubscribeFromWebSocketTopic(topic: string): void {
  sessionWebSocketClient.unsubscribe(topic);
}

export default sessionWebSocketClient;