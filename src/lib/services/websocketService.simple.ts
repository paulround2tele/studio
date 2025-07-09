// WebSocket Service - Single, unified WebSocket solution
// Supports multiple simultaneous connections with proper error handling and reconnection

// Legacy message format
export interface WebSocketMessage {
  type: string;
  data?: unknown;
  campaignId?: string;
  timestamp?: string;
  sequenceNumber?: number;
}

// Handler types
export type MessageHandler = (message: WebSocketMessage) => void;
export type ErrorHandler = (error: Event | Error) => void;

// Dashboard activity payload type for compatibility
export interface DashboardActivityPayload {
  campaignId: string;
  domainName: string;
  activity: string;
  status: string;
  phase: string;
  timestamp: string;
}

// Connection options
export interface ConnectionOptions {
  onMessage: MessageHandler;
  onError?: ErrorHandler;
  onOpen?: () => void;
  onClose?: () => void;
  onConnect?: () => void; // Legacy alias for onOpen
  onDisconnect?: () => void; // Legacy alias for onClose
}

// WebSocket connection management
interface WebSocketConnection {
  ws: WebSocket | null;
  options: ConnectionOptions;
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
  isConnected: boolean;
  maxReconnectAttempts: number;
  reconnectInterval: number;
}

class WebSocketServiceImpl {
  private connections: Map<string, WebSocketConnection> = new Map();
  private baseUrl: string;

  constructor() {
    // Get WebSocket URL from environment
    this.baseUrl = process.env.NEXT_PUBLIC_WS_URL || '';
    
    if (!this.baseUrl || !this.baseUrl.trim()) {
      console.warn('⚠️ [WebSocketService] NEXT_PUBLIC_WS_URL not configured. WebSocket connections will fail.');
    }
  }

  /**
   * Connect to a specific channel
   */
  connect(channel: string, options: ConnectionOptions): () => void {
    console.log(`🔗 [WebSocketService] Connecting to channel: ${channel}`);
    
    // Clean up existing connection if any
    this.disconnect(channel);
    
    // Create new connection
    const connection: WebSocketConnection = {
      ws: null,
      options,
      reconnectAttempts: 0,
      reconnectTimer: null,
      isConnected: false,
      maxReconnectAttempts: 10,
      reconnectInterval: 1000
    };
    
    this.connections.set(channel, connection);
    
    // Start connection
    this.connectChannel(channel);
    
    // Return cleanup function
    return () => this.disconnect(channel);
  }

  /**
   * Connect to all campaigns for real-time updates
   */
  connectToAllCampaigns(
    messageHandler: MessageHandler,
    errorHandler?: ErrorHandler
  ): () => void {
    console.log(`🔗 [WebSocketService] Connecting to all campaigns`);
    
    return this.connect('all-campaigns', {
      onMessage: messageHandler,
      onError: errorHandler,
      onOpen: () => console.log(`✅ [WebSocketService] Connected to all campaigns`),
      onClose: () => console.log(`🔌 [WebSocketService] Disconnected from all campaigns`)
    });
  }

  /**
   * Disconnect from a specific channel
   */
  private disconnect(channel: string): void {
    const connection = this.connections.get(channel);
    if (!connection) return;

    console.log(`🔌 [WebSocketService] Disconnecting from channel: ${channel}`);
    
    // Clear reconnect timer
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
      connection.reconnectTimer = null;
    }
    
    // Close WebSocket
    if (connection.ws) {
      connection.ws.close(1000, 'Normal closure');
      connection.ws = null;
    }
    
    connection.isConnected = false;
    this.connections.delete(channel);
  }

  /**
   * Disconnect all channels
   */
  disconnectAll(): void {
    console.log(`🔌 [WebSocketService] Disconnecting all channels`);
    
    for (const channel of this.connections.keys()) {
      this.disconnect(channel);
    }
  }

  /**
   * Check if a specific channel is connected
   */
  isConnected(channel: string): boolean {
    const connection = this.connections.get(channel);
    return connection?.isConnected || false;
  }

  /**
   * Get connection status for all channels
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [channel, connection] of this.connections.entries()) {
      status[channel] = connection.isConnected;
    }
    return status;
  }

  /**
   * Send a message to a specific channel
   */
  sendMessage(channel: string, message: WebSocketMessage): void {
    const connection = this.connections.get(channel);
    if (connection?.ws && connection.isConnected) {
      try {
        console.log(`📤 [WebSocketService] Sending message to channel ${channel}:`, message);
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ [WebSocketService] Failed to send message to ${channel}:`, error);
        this.handleError(channel, error);
      }
    } else {
      console.warn(`⚠️ [WebSocketService] Cannot send message to disconnected channel: ${channel}`);
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return Array.from(this.connections.values()).filter(conn => conn.isConnected).length;
  }

  /**
   * Internal method to establish WebSocket connection for a channel
   */
  private connectChannel(channel: string): void {
    const connection = this.connections.get(channel);
    if (!connection || !this.baseUrl) return;

    try {
      console.log(`🔗 [WebSocketService] Establishing WebSocket connection for ${channel}:`, this.baseUrl);
      
      connection.ws = new WebSocket(this.baseUrl);
      
      connection.ws.onopen = () => {
        console.log(`✅ [WebSocketService] Connected to channel: ${channel}`);
        connection.isConnected = true;
        connection.reconnectAttempts = 0;
        
        // Send connection initialization
        this.sendMessage(channel, {
          type: 'connection_init',
          timestamp: new Date().toISOString()
        });
        
        // Subscribe to channel-specific events
        if (channel.startsWith('campaign-')) {
          // Individual campaign subscription
          const campaignId = channel.replace('campaign-', '');
          this.sendMessage(channel, {
            type: 'subscribe_campaign',
            campaignId,
            timestamp: new Date().toISOString()
          });
        } else if (channel === 'all-campaigns') {
          // All campaigns subscription
          this.sendMessage(channel, {
            type: 'subscribe_all_campaigns',
            timestamp: new Date().toISOString()
          });
        } else if (channel === 'dashboard-activity') {
          // Dashboard activity subscription
          this.sendMessage(channel, {
            type: 'subscribe_dashboard_activity',
            timestamp: new Date().toISOString()
          });
        } else {
          // Other channel subscriptions (proxies, keyword-sets, etc.)
          this.sendMessage(channel, {
            type: 'subscribe_channel',
            data: { channel },
            timestamp: new Date().toISOString()
          });
        }
        
        // Notify handlers
        if (connection.options.onOpen) {
          connection.options.onOpen();
        }
        if (connection.options.onConnect) {
          connection.options.onConnect();
        }
      };
      
      connection.ws.onmessage = (event) => {
        this.handleMessage(channel, event);
      };
      
      connection.ws.onerror = (error) => {
        console.error(`❌ [WebSocketService] Connection error for ${channel}:`, error);
        this.handleError(channel, error);
      };
      
      connection.ws.onclose = (event) => {
        console.log(`🔌 [WebSocketService] Connection closed for ${channel}:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        connection.isConnected = false;
        
        if (connection.options.onClose) {
          connection.options.onClose();
        }
        if (connection.options.onDisconnect) {
          connection.options.onDisconnect();
        }
        
        // Determine if we should reconnect
        const shouldReconnect = 
          event.code !== 1000 && // Not normal closure
          event.code !== 1001 && // Not going away
          connection.reconnectAttempts < connection.maxReconnectAttempts;
          
        if (shouldReconnect) {
          this.scheduleReconnect(channel);
        } else if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
          console.error(`❌ [WebSocketService] Max reconnection attempts reached for ${channel}`);
        }
      };
      
    } catch (error) {
      console.error(`❌ [WebSocketService] Failed to create WebSocket for ${channel}:`, error);
      this.handleError(channel, error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(channel: string, event: MessageEvent): void {
    const connection = this.connections.get(channel);
    if (!connection) return;

    try {
      // Handle concatenated JSON messages
      const rawData = event.data.trim();
      let messages: string[] = [];
      
      // Split by newlines and filter empty lines
      const jsonLines = rawData.split('\n').filter((line: string) => line.trim());
      
      if (jsonLines.length === 1 && jsonLines[0].includes('}{')) {
        // Handle concatenated JSON objects
        const parts = jsonLines[0].split('}{');
        messages = parts.map((part: string, index: number) => {
          if (index === 0) return part + '}';
          if (index === parts.length - 1) return '{' + part;
          return '{' + part + '}';
        });
      } else {
        messages = jsonLines;
      }
      
      // Process each message
      for (const messageData of messages) {
        if (!messageData.trim()) continue;
        
        try {
          const message: WebSocketMessage = JSON.parse(messageData);
          
          console.log(`📥 [WebSocketService] Received message on ${channel}:`, {
            type: message.type,
            campaignId: message.campaignId,
            timestamp: message.timestamp
          });
          
          // Handle special message types
          if (message.type === 'heartbeat') {
            this.sendMessage(channel, {
              type: 'heartbeat_response',
              timestamp: new Date().toISOString()
            });
            continue;
          }
          
          if (message.type === 'ping') {
            this.sendMessage(channel, {
              type: 'pong',
              timestamp: new Date().toISOString()
            });
            continue;
          }
          
          // Forward to message handler
          connection.options.onMessage(message);
          
        } catch (parseError) {
          console.error(`❌ [WebSocketService] Failed to parse message on ${channel}:`, parseError, messageData);
        }
      }
      
    } catch (error) {
      console.error(`❌ [WebSocketService] Error handling message on ${channel}:`, error);
      this.handleError(channel, error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(channel: string, error: unknown): void {
    const connection = this.connections.get(channel);
    if (!connection) return;

    console.error(`❌ [WebSocketService] Error on channel ${channel}:`, error);
    
    if (connection.options.onError) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      connection.options.onError(errorObj);
    }
  }

  /**
   * Schedule reconnection for a channel
   */
  private scheduleReconnect(channel: string): void {
    const connection = this.connections.get(channel);
    if (!connection || connection.reconnectTimer) return;

    connection.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = connection.reconnectInterval;
    const exponentialDelay = baseDelay * Math.pow(2, connection.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    
    console.log(`🔄 [WebSocketService] Scheduling reconnect for ${channel} in ${Math.round(delay)}ms (attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`);
    
    connection.reconnectTimer = setTimeout(() => {
      connection.reconnectTimer = null;
      this.connectChannel(channel);
    }, delay);
  }
}

// Global instance
const websocketServiceInstance = new WebSocketServiceImpl();

// Export the service instance
export { websocketServiceInstance as websocketService };

// Default export for backward compatibility
export default websocketServiceInstance;