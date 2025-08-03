/**
 * Simplified WebSocket Configuration - TASK-WS-009
 * Remove complex performance and session configurations
 * Use simple connection timeout and retry settings
 */

// Simple WebSocket configuration
interface WebSocketConfig {
  connectionTimeout: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

// Basic configuration - no environment-specific complexity
export const webSocketConfig: WebSocketConfig = {
  connectionTimeout: 10000,    // 10 seconds
  maxReconnectAttempts: 3,     // Maximum 3 retry attempts
  reconnectDelay: 30000,       // Fixed 30s delay between attempts
};

// Simplified exports for backward compatibility
export function getWebSocketPerformanceConfig(): WebSocketConfig {
  return webSocketConfig;
}

export function getWebSocketSessionConfig() {
  return {
    sessionValidationInterval: 300000, // 5 minutes (not used anymore)
  };
}

// Simplified reconnection config
export const webSocketReconnectionConfig = {
  maxAttempts: 3,
  baseDelay: 30000,
  maxDelay: 30000,
  jitterFactor: 0,
};

// Simplified auth utils
export const webSocketAuthUtils = {
  isSessionValidForWebSocket: () => {
    // Session validation simplified - just check if we're in browser
    return typeof window !== 'undefined';
  }
};

export default webSocketConfig;