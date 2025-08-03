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
  data?: Record<string, unknown>; // FIXED: Backend expects 'data', not 'payload'
  payload?: Record<string, unknown>; // Keep for backward compatibility
  timestamp?: string;
  // Backend message fields
  id?: string;
  campaignId?: string;
  phase?: string;
  status?: string;
  progress?: number;
  message?: string;
  errorMessage?: string;
}

export interface WebSocketConfig {
  url?: string;
  protocols?: string[];
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  enableAutoReconnect?: boolean;
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
  
  // Connection state (simplified)
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastReconnectTime = 0; // For connection debouncing
  
  // Event handling
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private messageQueue: WebSocketMessage[] = [];

  static getInstance(): SessionWebSocketClient {
    if (!SessionWebSocketClient.instance) {
      SessionWebSocketClient.instance = new SessionWebSocketClient();
    }
    return SessionWebSocketClient.instance;
  }

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      maxReconnectAttempts: 3, // Reduced from 10
      reconnectDelay: 30000, // Fixed 30s minimum between reconnects (no exponential backoff)
      enableAutoReconnect: true,
      ...config
    };
    
    this.maxReconnectAttempts = this.config.maxReconnectAttempts || 3;
    
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

  // Simplified connection management - no thrashing, no complex session validation
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    // Connection debouncing - minimum 30s between reconnect attempts
    const now = Date.now();
    if (this.lastReconnectTime > 0 && (now - this.lastReconnectTime) < 30000) {
      console.log('WebSocket connection debounced - too soon since last attempt');
      return;
    }

    try {
      this.isConnecting = true;
      this.lastReconnectTime = now;
      
      // Get WebSocket URL
      const wsUrl = await this.getWebSocketUrl();
      this.url = wsUrl;
      
      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl, this.config.protocols);
      
      // Setup simple event handlers
      this.setupWebSocketHandlers();
      
    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket connection failed:', error);
      this.emit('error', error);
      
      if (this.config.enableAutoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
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
    
    // Extract just the host:port part, removing any existing path
    const urlParts = baseUrl.replace(/^https?:\/\//, '').split('/');
    const host = urlParts[0]; // Just hostname:port
    
    // CRITICAL FIX: Use correct backend WebSocket endpoint /api/v2/ws
    return `${wsProtocol}${host}/api/v2/ws`;
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      console.log('WebSocket connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Process any queued messages
      this.processMessageQueue();
      
      this.emit('open', event);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      
      this.emit('close', event);
      
      // Simple auto-reconnect for unexpected closures only
      if (this.config.enableAutoReconnect && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.emit('error', event);
    };

    this.ws.onmessage = (event) => {
      try {
        console.log('Raw WebSocket message received:', event.data);
        
        // Handle different data types
        let rawData = event.data;
        if (rawData instanceof Blob) {
          // Handle blob data
          rawData.text().then(text => {
            this.parseAndEmitMessage(text);
          }).catch(error => {
            console.error('Error reading blob data:', error);
          });
          return;
        }
        
        this.parseAndEmitMessage(rawData);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        this.emit('message', { error: 'handler_failed', raw: event.data });
      }
    };
  }
  
  private parseAndEmitMessage(rawData: string): void {
    try {
      // Trim whitespace and check for empty data
      const cleanData = rawData.trim();
      if (!cleanData) {
        console.warn('Empty WebSocket message received');
        return;
      }
      
      // Try to parse as JSON
      const data = JSON.parse(cleanData);
      console.log('Parsed WebSocket message:', data);
      this.emit('message', data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      console.error('Raw message data:', rawData);
      console.error('Data type:', typeof rawData);
      console.error('Data length:', rawData?.length);
      
      // Log first 200 characters for debugging
      if (rawData && rawData.length > 200) {
        console.error('First 200 chars:', rawData.substring(0, 200));
        console.error('Last 200 chars:', rawData.substring(rawData.length - 200));
      }
      
      // Check if it might be multiple JSON objects concatenated
      if (rawData && (rawData.includes('}{') || rawData.split('\n').length > 1)) {
        console.log('Concatenated or multi-line JSON detected, splitting and parsing...');
        // Try to split and parse individual messages
        this.handleConcatenatedJSON(rawData);
        return; // Don't continue with normal parsing
      } else {
        // Emit error for debugging
        this.emit('message', { error: 'parse_failed', raw: rawData });
      }
    }
  }
  
  private handleConcatenatedJSON(rawData: string): void {
    try {
      console.log('Splitting concatenated JSON, original length:', rawData.length);
      
      // First try splitting by newlines for line-separated JSON
      let messages: string[] = [];
      if (rawData.includes('\n')) {
        messages = rawData.split('\n').filter(line => line.trim() !== '');
        console.log('Split by newlines into', messages.length, 'messages');
      } else {
        // Fall back to splitting on }{ pattern and reconstructing valid JSON objects
        const parts = rawData.split('}{');
        console.log('Split by }{ into', parts.length, 'parts');
        
        if (parts.length > 1) {
          for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if (!part || part.trim() === '') continue; // Skip empty parts
            
            // Reconstruct the JSON object
            if (i > 0) part = '{' + part;           // Add opening brace for middle/end parts
            if (i < parts.length - 1) part = part + '}'; // Add closing brace for start/middle parts
            
            messages.push(part);
          }
        } else {
          messages = [rawData]; // Single message
        }
      }
      
      // Parse each message individually
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]?.trim();
        if (!message) continue;
        
        console.log(`Processing message ${i + 1}/${messages.length}:`, message.substring(0, 100) + '...');
          
        try {
          const data = JSON.parse(message);
          console.log('✅ Successfully parsed message:', data.type);
          this.emit('message', data);
        } catch (partError) {
          console.error(`❌ Error parsing message ${i + 1}:`, partError);
          console.error('Failed message content:', message);
        }
      }
    } catch (error) {
      console.error('Error handling concatenated JSON:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Simple fixed delay - no exponential backoff complexity
    const delay = this.config.reconnectDelay || 30000; // Fixed 30s delay
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

  // Simplified message handling - no authentication checks
  send(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, queueing message');
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
    // Simple queue size limit
    if (this.messageQueue.length >= 100) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    this.messageQueue.push(message);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
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
      data: { channels: [topic] }  // Backend expects 'channels' array, not 'topic'
    });
  }

  unsubscribe(topic: string): void {
    // Check if it's a campaign topic and use the appropriate message format
    if (topic.startsWith('campaign-')) {
      const campaignId = topic.replace('campaign-', '');
      this.send({
        type: 'unsubscribe_campaign',
        campaignId: campaignId
      });
    } else {
      // For other topics, try the channels format (though backend may not support it)
      this.send({
        type: 'unsubscribe', 
        data: { channels: [topic] }
      });
    }
  }

  // Connection state
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }

  // Simple cleanup
  disconnect(): void {
    this.config.enableAutoReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.messageQueue = [];
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