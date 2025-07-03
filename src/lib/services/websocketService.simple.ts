// src/lib/services/websocketService.simple.ts
// Configuration-driven WebSocket service for DomainFlow
// NO HARDCODING - All connection details from environment/config

import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// Dynamic WebSocket URL detection (same backend detection logic as API client)
const detectBackendUrlForWs = async (): Promise<string> => {
  // In production, backend is same origin
  if (process.env.NODE_ENV === 'production') {
    return '';  // Use relative URLs
  }
  
  // In development, try common backend ports (same as API client)
  if (typeof window !== 'undefined') {
    const commonPorts = [8080, 3001, 5000, 8000, 4000];
    const host = window.location.hostname; // Just hostname, not host:port
    
    for (const port of commonPorts) {
      try {
        const testUrl = `http://${host}:${port}/health`;
        const response = await fetch(testUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(1000) // 1 second timeout
        });
        
        if (response.ok) {
          console.log(`✅ [WebSocketService] Backend detected at http://${host}:${port}`);
          return `http://${host}:${port}`;
        }
      } catch (_error) {
        // Continue to next port
        console.log(`❌ [WebSocketService] No backend found at http://${host}:${port}`);
        continue;
      }
    }
  }
  
  // Fallback: assume same origin (for SSR or if detection fails)
  console.log('⚠️ [WebSocketService] Backend auto-detection failed, using same origin');
  return '';
};

const getBackendUrlForWs = async (): Promise<string> => {
  // If explicitly configured, use it
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    console.log(`🔧 [WebSocketService] Using configured backend URL: ${configured}`);
    return configured;
  }
  
  // Otherwise, auto-detect
  console.log('🔍 [WebSocketService] Auto-detecting backend URL...');
  return await detectBackendUrlForWs();
};

// Dynamic WebSocket URL construction using backend detection
const getWebSocketUrl = async (): Promise<string> => {
  // DIAGNOSTIC: Log WebSocket URL construction
  console.log('🔍 [WebSocketService] URL_CONSTRUCTION:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  NEXT_PUBLIC_WS_URL: ${process.env.NEXT_PUBLIC_WS_URL}`);
  console.log(`  window available: ${typeof window !== 'undefined'}`);

  // If explicitly configured, use it
  if (process.env.NEXT_PUBLIC_WS_URL) {
    console.log(`  ✅ Using configured WebSocket URL: ${process.env.NEXT_PUBLIC_WS_URL}`);
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Get backend URL using same detection as API client
  const backendUrl = await getBackendUrlForWs();
  console.log(`  Detected backend URL: ${backendUrl}`);

  // Construct WebSocket URL from backend URL
  if (backendUrl) {
    // Convert HTTP backend URL to WebSocket URL
    const protocol = backendUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const wsUrl = backendUrl.replace(/^https?:/, protocol) + '/api/v2/ws';
    console.log(`  ✅ Constructed WebSocket URL from backend: ${wsUrl}`);
    return wsUrl;
  }

  // Fallback to relative URL (same origin)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/v2/ws`;
    console.log(`  ✅ Fallback WebSocket URL: ${url}`);
    return url;
  }

  // SSR fallback
  const fallbackUrl = '/api/v2/ws';
  console.log(`  ✅ SSR fallback WebSocket URL: ${fallbackUrl}`);
  return fallbackUrl;
};

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
  url: '', // Will be resolved dynamically when connecting
  // RATE LIMIT FIX: Increased base reconnect interval from 5s to 10s
  reconnectInterval: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || '10000'),
  maxReconnectAttempts: parseInt(process.env.NEXT_PUBLIC_WS_MAX_RECONNECTS || '5'),
  connectionTimeout: parseInt(process.env.NEXT_PUBLIC_WS_CONNECTION_TIMEOUT || '30000'),
  // RATE LIMIT FIX: Increased heartbeat interval from 30s to 60s
  heartbeatInterval: parseInt(process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || '60000'),
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
    logger.info('WEBSOCKET', `Starting connection setup for ${connectionKey}`);

    // Store handlers for this connection
    this.eventHandlers.set(connectionKey, handlers);

    // Initialize connection status
    this.connectionStatuses.set(connectionKey, {
      isConnected: false,
      reconnectAttempts: 0,
    });

    // Resolve URL dynamically and start connection
    if (customUrl) {
      logger.info('WEBSOCKET', `Using custom URL for ${connectionKey}`, { url: customUrl });
      this.establishConnection(connectionKey, customUrl);
    } else {
      // Resolve URL dynamically
      getWebSocketUrl().then(url => {
        logger.info('WEBSOCKET', `Resolved dynamic URL for ${connectionKey}`, { url });
        this.establishConnection(connectionKey, url);
      }).catch(error => {
        logger.error('WEBSOCKET', `Failed to resolve URL for ${connectionKey}`, error);
        this.handleConnectionFailure(connectionKey, error);
      });
    }

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
    
    console.log('[WebSocketService] connectToAllCampaigns called');
    
    return this.connect(connectionKey, {
      onMessage: (message) => {
        console.log('[WebSocketService] Message received on all-campaigns connection:', message);
        onMessage?.(message);
      },
      onError: (error) => {
        console.log('[WebSocketService] Error on all-campaigns connection:', error);
        onError?.(error);
      },
      onConnect: () => {
        console.log('[WebSocketService] Successfully connected to all campaigns');
        logger.websocket.success('Connected to all campaigns');
        // Initialize connection first, then subscribe to campaign updates
        this.sendMessage(connectionKey, {
          type: 'connection_init',
          data: { lastSequenceNumber: 0 },
          timestamp: Date.now(),
        });
        
        // Send subscription after a brief delay to allow connection_ack
        setTimeout(() => {
          console.log('[WebSocketService] Sending subscription message');
          this.sendMessage(connectionKey, {
            type: 'subscribe',
            data: { channels: ['campaigns', 'campaign-updates'] },
            timestamp: Date.now(),
          });
        }, 100);
      },
      onDisconnect: () => {
        console.log('[WebSocketService] Disconnected from all campaigns');
        logger.info('WEBSOCKET', 'Disconnected from all campaigns');
      },
    });
  }

  /**
   * Establish WebSocket connection
   */
  private establishConnection(connectionKey: string, url: string): void {
    try {
      console.log(`[WebSocketService] Establishing connection for ${connectionKey} to ${url}`);
      
      // Close existing connection if any
      this.closeConnection(connectionKey);

      // Create new WebSocket connection
      const ws = new WebSocket(url, this.config.protocols);
      this.connections.set(connectionKey, ws);
      
      console.log(`[WebSocketService] WebSocket created for ${connectionKey}, readyState: ${ws.readyState}`);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log(`[WebSocketService] Connection timeout for ${connectionKey} after ${this.config.connectionTimeout}ms`);
          logger.warn('WEBSOCKET', `Connection timeout for ${connectionKey}`);
          ws.close();
          this.handleConnectionFailure(connectionKey, new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      // Setup event handlers
      ws.onopen = () => {
        console.log(`[WebSocketService] WebSocket onopen triggered for ${connectionKey}`);
        clearTimeout(connectionTimeout);
        this.handleConnectionOpen(connectionKey);
      };

      ws.onmessage = (event) => {
        console.log(`[WebSocketService] WebSocket onmessage triggered for ${connectionKey}:`, event.data);
        this.handleMessage(connectionKey, event);
      };

      ws.onerror = (error) => {
        console.log(`[WebSocketService] WebSocket onerror triggered for ${connectionKey}:`, error);
        clearTimeout(connectionTimeout);
        this.handleError(connectionKey, error);
      };

      ws.onclose = (event) => {
        console.log(`[WebSocketService] WebSocket onclose triggered for ${connectionKey}:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        clearTimeout(connectionTimeout);
        this.handleConnectionClose(connectionKey, event);
      };

    } catch (error) {
      console.log(`[WebSocketService] Exception while establishing connection for ${connectionKey}:`, error);
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
   * Handle connection error - distinguish between retryable connection issues and true errors
   */
  private handleError(connectionKey: string, error: Event): void {
    // More graceful error logging - don't log full error objects for common WebSocket issues
    const errorDetails = {
      type: error.type,
      target: error.target?.constructor?.name || 'WebSocket',
      timeStamp: error.timeStamp
    };
    
    // Classify error types - only escalate true application errors
    const isConnectionError = error.type === 'error' && error.target?.constructor?.name === 'WebSocket';
    
    if (isConnectionError) {
      // This is a normal connection failure (network issues, server down, etc.)
      // Log at debug level and don't escalate to application layer
      logger.debug('WEBSOCKET', `Connection attempt failed: ${connectionKey} (will retry)`, errorDetails);
      
      // Update status but don't call error handler for connection attempts
      const status = this.connectionStatuses.get(connectionKey);
      if (status) {
        status.lastError = `Connection attempt failed: ${error.type}`;
      }
      
      // Don't call onError handler for normal connection failures - they will be retried
      // The application should only be notified of true errors, not connection attempts
      
    } else {
      // This is an actual application error that should be escalated
      logger.warn('WEBSOCKET', `Application error: ${connectionKey}`, errorDetails);
      
      // Update status
      const status = this.connectionStatuses.get(connectionKey);
      if (status) {
        status.lastError = `Application error: ${error.type}`;
      }
      
      // Call error handler for true application errors
      const handlers = this.eventHandlers.get(connectionKey);
      handlers?.onError?.(error);
    }
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(connectionKey: string, error: Error): void {
    // Use warn level for connection failures as they're often temporary network issues
    logger.warn('WEBSOCKET', `Connection failed: ${connectionKey}`, {
      message: error.message,
      name: error.name
    });

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

    // RATE LIMIT FIX: Implement exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, status.reconnectAttempts - 1), 300000); // Max 5 minutes
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    const finalDelay = exponentialDelay + jitter;
    
    logger.info('WEBSOCKET', `Scheduling reconnect attempt ${status.reconnectAttempts}/${this.config.maxReconnectAttempts} for ${connectionKey} in ${Math.round(finalDelay/1000)}s`);

    const timer = setTimeout(() => {
      logger.info('WEBSOCKET', `Reconnect attempt ${status.reconnectAttempts} for ${connectionKey}`);
      
      const handlers = this.eventHandlers.get(connectionKey);
      handlers?.onReconnect?.(status.reconnectAttempts);
      
      // Resolve URL dynamically for reconnection (same as initial connection)
      getWebSocketUrl().then(url => {
        logger.info('WEBSOCKET', `Resolved dynamic URL for reconnection ${connectionKey}`, { url });
        this.establishConnection(connectionKey, url);
      }).catch(error => {
        logger.error('WEBSOCKET', `Failed to resolve URL for reconnection ${connectionKey}`, error);
        this.handleConnectionFailure(connectionKey, error);
      });
    }, finalDelay);

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
    
    console.log('[WebSocketService] getConnectionStatus returning:', status);
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
