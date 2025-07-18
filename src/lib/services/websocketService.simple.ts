// WebSocket Service - Single, unified WebSocket solution
// Supports multiple simultaneous connections with proper error handling and reconnection

// BACKEND-DRIVEN: Direct environment variable approach
const getApiBaseUrlSync = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured || !configured.trim()) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
  }
  return configured.trim();
};

// Legacy message format - Updated to match backend WebSocketMessage struct
export interface WebSocketMessage {
  type: string;
  data?: unknown;
  campaignId?: string;
  timestamp?: string;
  sequenceNumber?: number;
  // CRITICAL: Added missing fields from backend WebSocketMessage struct
  phase?: string;
  status?: string;
  progress?: number;
  id?: string;
  message?: string;
  errorMessage?: string;
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

// WebSocket connection management with subscription tracking
interface WebSocketConnection {
  ws: WebSocket | null;
  subscribers: Map<string, ConnectionOptions>; // Track multiple subscribers per channel
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
    this.baseUrl = this.getWebSocketUrl();
  }

  /**
   * Get WebSocket URL with auto-detection fallback (synchronous)
   */
  private getWebSocketUrl(): string {
    // First try configured URL
    const configured = process.env.NEXT_PUBLIC_WS_URL;
    if (configured && configured.trim()) {
      return configured;
    }
    
    // Auto-detection: Use same centralized logic as API client
    if (typeof window !== 'undefined') {
      try {
        // Use the same auto-detection logic as the API client
        const apiUrl = getApiBaseUrlSync();
        const wsUrl = apiUrl.replace(/^http/, 'ws') + '/api/v2/ws';
        console.log(`🔗 [WebSocketService] Auto-detected WebSocket URL from API: ${wsUrl}`);
        return wsUrl;
      } catch (error) {
        console.error('Failed to get API base URL for WebSocket auto-detection:', error);
      }
    }
    
    // Fallback warning
    console.warn('⚠️ [WebSocketService] NEXT_PUBLIC_WS_URL not configured and auto-detection failed. WebSocket connections will fail.');
    return '';
  }

  /**
   * Connect to a specific channel
   */
  connect(channel: string, options: ConnectionOptions): () => void {
    console.log(`🔗 [WebSocketService] Connecting to channel: ${channel}`);
    
    // Generate unique subscriber ID
    const subscriberId = Math.random().toString(36).substring(2, 15);
    
    // Get or create connection
    let connection = this.connections.get(channel);
    if (!connection) {
      // Create new connection
      connection = {
        ws: null,
        subscribers: new Map(),
        reconnectAttempts: 0,
        reconnectTimer: null,
        isConnected: false,
        maxReconnectAttempts: 10,
        reconnectInterval: 1000
      };
      this.connections.set(channel, connection);
      
      // Start connection only if this is the first subscriber
      this.connectChannel(channel);
    }
    
    // Add subscriber to existing connection
    connection.subscribers.set(subscriberId, options);
    console.log(`📝 [WebSocketService] Added subscriber ${subscriberId} to channel ${channel}. Total subscribers: ${connection.subscribers.size}`);
    
    // Return cleanup function that removes only this subscriber
    return () => this.removeSubscriber(channel, subscriberId);
  }

  /**
   * Remove a subscriber from a channel
   */
  private removeSubscriber(channel: string, subscriberId: string): void {
    const connection = this.connections.get(channel);
    if (!connection) return;

    console.log(`🗑️ [WebSocketService] Removing subscriber ${subscriberId} from channel ${channel}`);
    connection.subscribers.delete(subscriberId);
    
    // If no more subscribers, disconnect the channel
    if (connection.subscribers.size === 0) {
      console.log(`📭 [WebSocketService] No more subscribers for ${channel}, disconnecting...`);
      this.disconnect(channel);
    } else {
      console.log(`📝 [WebSocketService] Channel ${channel} still has ${connection.subscribers.size} subscribers`);
    }
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
        
        // Wait for WebSocket to be fully ready before sending messages
        // This prevents "Still in CONNECTING state" errors
        setTimeout(() => {
          // Double-check connection is still valid and ready
          if (connection.ws && connection.ws.readyState === WebSocket.OPEN && connection.isConnected) {
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
                timestamp: new Date().toISOString(),
                // Backend expects uppercase CampaignID field
                ...({ CampaignID: campaignId } as { CampaignID: string })
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
          } else {
            console.warn(`⚠️ [WebSocketService] Connection no longer valid for subscription on ${channel}`);
          }
        }, 10); // Small delay to ensure WebSocket is fully ready
        
        // Notify all subscribers
        connection.subscribers.forEach((options) => {
          if (options.onOpen) {
            options.onOpen();
          }
          if (options.onConnect) {
            options.onConnect();
          }
        });
      };
      
      connection.ws.onmessage = (event) => {
        this.handleMessage(channel, event);
      };
      
      connection.ws.onerror = (event) => {
        console.error(`❌ [WebSocketService] Connection error for ${channel}:`, {
          type: event.type,
          timeStamp: event.timeStamp,
          readyState: (event.target as WebSocket)?.readyState
        });
        // Create a meaningful error for WebSocket connection failures
        const error = new Error(`WebSocket connection failed for channel ${channel}`);
        this.handleError(channel, error);
      };
      
      connection.ws.onclose = (event) => {
        console.log(`🔌 [WebSocketService] Connection closed for ${channel}:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        connection.isConnected = false;
        
        // Notify all subscribers about disconnection
        connection.subscribers.forEach((options) => {
          if (options.onClose) {
            options.onClose();
          }
          if (options.onDisconnect) {
            options.onDisconnect();
          }
        });
        
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
          // Broadcast message to all subscribers
          connection.subscribers.forEach((options) => {
            if (options.onMessage) {
              options.onMessage(message);
            }
          });
          
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
    
    // Notify all subscribers about the error
    const errorObj = error instanceof Error ? error : new Error(String(error));
    connection.subscribers.forEach((options) => {
      if (options.onError) {
        options.onError(errorObj);
      }
    });
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