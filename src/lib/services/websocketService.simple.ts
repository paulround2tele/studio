// src/lib/services/websocketService.simple.ts
// Configuration-driven WebSocket service for DomainFlow
// NO HARDCODING - All connection details from environment/config

import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * Environment-aware WebSocket configuration
 * Adapts connection behavior based on environment settings
 */
interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  enableHeartbeat: boolean;
  enableDebugMode: boolean;
  protocols?: string[];
  headers?: Record<string, string>;
}

/**
 * Default configuration from environment variables
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/v2/ws',
  reconnectInterval: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || '5000'),
  maxReconnectAttempts: parseInt(process.env.NEXT_PUBLIC_WS_MAX_RECONNECTS || '10'),
  connectionTimeout: parseInt(process.env.NEXT_PUBLIC_WS_CONNECTION_TIMEOUT || '30000'),
  heartbeatInterval: parseInt(process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || '30000'),
  enableHeartbeat: process.env.NEXT_PUBLIC_WS_ENABLE_HEARTBEAT !== 'false',
  enableDebugMode: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true',
  protocols: process.env.NEXT_PUBLIC_WS_PROTOCOLS?.split(',') || [],
};

/**
 * WebSocket message types
 */
interface WebSocketMessage {
  type: string;
  data?: unknown;
  timestamp: number;
  id?: string;
}

/**
 * Connection status interface
 */
interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  lastError?: string;
  reconnectAttempts: number;
}

/**
 * Event handlers interface
 */
interface WebSocketEventHandlers {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event | Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: (attempt: number) => void;
}

/**
 * Configuration-driven WebSocket service
 * Handles connections, reconnection, and message routing
 */
class WebSocketService {
  private config: WebSocketConfig;
  private connections: Map<string, WebSocket> = new Map();
  private connectionStatuses: Map<string, ConnectionStatus> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventHandlers: Map<string, WebSocketEventHandlers> = new Map();

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.debug('WEBSOCKET', 'Service initialized', {
      url: this.config.url,
      reconnectInterval: this.config.reconnectInterval,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
    });
  }

  /**
   * Connect to WebSocket with specified key and handlers
   */
  connect(
    connectionKey: string, 
    handlers: WebSocketEventHandlers = {},
    customUrl?: string
  ): () => void {
    const url = customUrl || this.config.url;
    
    logger.info('WEBSOCKET', `Connecting to ${connectionKey}`, { url });

    // Store handlers for this connection
    this.eventHandlers.set(connectionKey, handlers);

    // Initialize connection status
    this.connectionStatuses.set(connectionKey, {
      isConnected: false,
      reconnectAttempts: 0,
    });

    // Start connection
    this.establishConnection(connectionKey, url);

    // Return cleanup function
    return () => this.disconnect(connectionKey);
  }

  /**
   * Connect to all campaigns (specific method used by existing code)
   */
  connectToAllCampaigns(
    onMessage?: (message: WebSocketMessage) => void,
    onError?: (error: Event | Error) => void
  ): () => void {
    const connectionKey = 'all-campaigns';
    
    return this.connect(connectionKey, {
      onMessage,
      onError,
      onConnect: () => {
        logger.websocket.success('Connected to all campaigns');
        // Subscribe to campaign updates
        this.sendMessage(connectionKey, {
          type: 'subscribe',
          data: { channels: ['campaigns', 'campaign-updates'] },
          timestamp: Date.now(),
        });
      },
      onDisconnect: () => {
        logger.info('WEBSOCKET', 'Disconnected from all campaigns');
      },
    });
  }

  /**
   * Establish WebSocket connection
   */
  private establishConnection(connectionKey: string, url: string): void {
    try {
      // Close existing connection if any
      this.closeConnection(connectionKey);

      // Create new WebSocket connection
      const ws = new WebSocket(url, this.config.protocols);
      this.connections.set(connectionKey, ws);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          logger.warn('WEBSOCKET', `Connection timeout for ${connectionKey}`);
          ws.close();
          this.handleConnectionFailure(connectionKey, new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      // Setup event handlers
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.handleConnectionOpen(connectionKey);
      };

      ws.onmessage = (event) => {
        this.handleMessage(connectionKey, event);
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        this.handleError(connectionKey, error);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.handleConnectionClose(connectionKey, event);
      };

    } catch (error) {
      logger.error('WEBSOCKET', `Failed to create connection ${connectionKey}`, error);
      this.handleConnectionFailure(connectionKey, error as Error);
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnectionOpen(connectionKey: string): void {
    logger.websocket.success(`Connected: ${connectionKey}`);

    // Update status
    const status = this.connectionStatuses.get(connectionKey);
    if (status) {
      status.isConnected = true;
      status.lastConnected = new Date();
      status.reconnectAttempts = 0;
      status.lastError = undefined;
    }

    // Clear reconnect timer
    const reconnectTimer = this.reconnectTimers.get(connectionKey);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(connectionKey);
    }

    // Start heartbeat if enabled
    if (this.config.enableHeartbeat) {
      this.startHeartbeat(connectionKey);
    }

    // Call connect handler
    const handlers = this.eventHandlers.get(connectionKey);
    handlers?.onConnect?.();
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(connectionKey: string, event: CloseEvent): void {
    logger.info('WEBSOCKET', `Connection closed: ${connectionKey}`, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // Update status
    const status = this.connectionStatuses.get(connectionKey);
    if (status) {
      status.isConnected = false;
    }

    // Stop heartbeat
    this.stopHeartbeat(connectionKey);

    // Remove connection
    this.connections.delete(connectionKey);

    // Call disconnect handler
    const handlers = this.eventHandlers.get(connectionKey);
    handlers?.onDisconnect?.();

    // Attempt reconnection if not a clean close
    if (!event.wasClean && status && status.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect(connectionKey);
    }
  }

  /**
   * Handle connection error
   */
  private handleError(connectionKey: string, error: Event): void {
    logger.error('WEBSOCKET', `Connection error: ${connectionKey}`, error);

    // Update status
    const status = this.connectionStatuses.get(connectionKey);
    if (status) {
      status.lastError = `Connection error: ${error.type}`;
    }

    // Call error handler
    const handlers = this.eventHandlers.get(connectionKey);
    handlers?.onError?.(error);
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(connectionKey: string, error: Error): void {
    logger.error('WEBSOCKET', `Connection failed: ${connectionKey}`, error);

    // Update status
    const status = this.connectionStatuses.get(connectionKey);
    if (status) {
      status.isConnected = false;
      status.lastError = error.message;
    }

    // Call error handler
    const handlers = this.eventHandlers.get(connectionKey);
    handlers?.onError?.(error);

    // Schedule reconnect
    if (status && status.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect(connectionKey);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(connectionKey: string): void {
    const status = this.connectionStatuses.get(connectionKey);
    if (!status) return;

    status.reconnectAttempts++;
    
    logger.info('WEBSOCKET', `Scheduling reconnect attempt ${status.reconnectAttempts}/${this.config.maxReconnectAttempts} for ${connectionKey}`);

    const timer = setTimeout(() => {
      logger.info('WEBSOCKET', `Reconnect attempt ${status.reconnectAttempts} for ${connectionKey}`);
      
      const handlers = this.eventHandlers.get(connectionKey);
      handlers?.onReconnect?.(status.reconnectAttempts);
      
      this.establishConnection(connectionKey, this.config.url);
    }, this.config.reconnectInterval);

    this.reconnectTimers.set(connectionKey, timer);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(connectionKey: string, event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (this.config.enableDebugMode) {
        logger.websocket.message(`Message received on ${connectionKey}`, message);
      }

      // Handle heartbeat response
      if (message.type === 'pong') {
        return; // Heartbeat handled, no need to forward
      }

      // Call message handler
      const handlers = this.eventHandlers.get(connectionKey);
      handlers?.onMessage?.(message);

    } catch (error) {
      logger.error('WEBSOCKET', `Failed to parse message for ${connectionKey}`, error);
    }
  }

  /**
   * Send message to connection
   */
  sendMessage(connectionKey: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionKey);
    const status = this.connectionStatuses.get(connectionKey);

    if (!connection || !status?.isConnected || connection.readyState !== WebSocket.OPEN) {
      logger.warn('WEBSOCKET', `Cannot send message - connection ${connectionKey} not ready`);
      return false;
    }

    try {
      connection.send(JSON.stringify(message));
      
      if (this.config.enableDebugMode) {
        logger.websocket.message(`Message sent on ${connectionKey}`, message);
      }
      
      return true;
    } catch (error) {
      logger.error('WEBSOCKET', `Failed to send message on ${connectionKey}`, error);
      return false;
    }
  }

  /**
   * Start heartbeat for connection
   */
  private startHeartbeat(connectionKey: string): void {
    const timer = setInterval(() => {
      this.sendMessage(connectionKey, {
        type: 'ping',
        timestamp: Date.now(),
      });
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(connectionKey, timer);
  }

  /**
   * Stop heartbeat for connection
   */
  private stopHeartbeat(connectionKey: string): void {
    const timer = this.heartbeatTimers.get(connectionKey);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionKey);
    }
  }

  /**
   * Close specific connection
   */
  private closeConnection(connectionKey: string): void {
    const connection = this.connections.get(connectionKey);
    if (connection) {
      connection.close();
      this.connections.delete(connectionKey);
    }

    // Clear timers
    const reconnectTimer = this.reconnectTimers.get(connectionKey);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(connectionKey);
    }

    this.stopHeartbeat(connectionKey);
  }

  /**
   * Disconnect specific connection
   */
  disconnect(connectionKey: string): void {
    logger.info('WEBSOCKET', `Disconnecting: ${connectionKey}`);

    this.closeConnection(connectionKey);
    
    // Update status
    const status = this.connectionStatuses.get(connectionKey);
    if (status) {
      status.isConnected = false;
    }

    // Remove handlers
    this.eventHandlers.delete(connectionKey);
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    logger.info('WEBSOCKET', 'Disconnecting all connections');

    for (const connectionKey of this.connections.keys()) {
      this.disconnect(connectionKey);
    }

    this.connections.clear();
    this.connectionStatuses.clear();
    this.eventHandlers.clear();
    this.reconnectTimers.clear();
    this.heartbeatTimers.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [key, connectionStatus] of this.connectionStatuses.entries()) {
      status[key] = connectionStatus.isConnected;
    }
    
    return status;
  }

  /**
   * Get detailed connection info
   */
  getConnectionInfo(connectionKey: string): ConnectionStatus | null {
    return this.connectionStatuses.get(connectionKey) || null;
  }

  /**
   * Check if specific connection is connected
   */
  isConnected(connectionKey: string): boolean {
    const status = this.connectionStatuses.get(connectionKey);
    return status?.isConnected || false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug('WEBSOCKET', 'Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): WebSocketConfig {
    return { ...this.config };
  }

  /**
   * Force reconnect for specific connection
   */
  forceReconnect(connectionKey: string): void {
    logger.info('WEBSOCKET', `Force reconnecting: ${connectionKey}`);

    const handlers = this.eventHandlers.get(connectionKey);
    this.disconnect(connectionKey);
    
    if (handlers) {
      setTimeout(() => {
        this.connect(connectionKey, handlers);
      }, 1000);
    }
  }

  /**
   * Force reconnect for all connections
   */
  forceReconnectAll(): void {
    logger.info('WEBSOCKET', 'Force reconnecting all connections');

    const handlersSnapshot = new Map(this.eventHandlers);
    this.disconnectAll();

    setTimeout(() => {
      for (const [connectionKey, handlers] of handlersSnapshot.entries()) {
        this.connect(connectionKey, handlers);
      }
    }, 1000);
  }
}

// Create singleton service instance
let serviceInstance: WebSocketService | null = null;

/**
 * Get or create the singleton WebSocket service instance
 */
export function getWebSocketService(config?: Partial<WebSocketConfig>): WebSocketService {
  if (!serviceInstance) {
    serviceInstance = new WebSocketService(config);
  } else if (config) {
    serviceInstance.updateConfig(config);
  }
  return serviceInstance;
}

// Export default service instance
export const websocketService = getWebSocketService();

// Export service class for testing
export { WebSocketService };

// Export types
export type { WebSocketConfig, WebSocketMessage, ConnectionStatus, WebSocketEventHandlers };

// Export default
export default websocketService;
