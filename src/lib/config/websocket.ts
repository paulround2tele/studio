// WebSocket Configuration
// Performance-optimized settings for the DomainFlow WebSocket service

interface WebSocketConfig {
  maxConnections: number;
  maxMessageBufferSize: number;
  maxSequenceGap: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  cleanupInterval: number;
  memoryWarningThreshold: number;
  memoryCleanupThreshold: number;
}

/**
 * Development WebSocket configuration
 * More lenient settings for development and debugging
 */
export const developmentWebSocketConfig: WebSocketConfig = {
  maxConnections: 5,
  maxMessageBufferSize: 50,
  maxSequenceGap: 25,
  connectionTimeout: 15000,
  heartbeatInterval: 45000,
  cleanupInterval: 120000, // 2 minutes
  memoryWarningThreshold: 5 * 1024 * 1024, // 5MB
  memoryCleanupThreshold: 10 * 1024 * 1024, // 10MB
};

/**
 * Production WebSocket configuration
 * Optimized for performance and memory efficiency
 */
export const productionWebSocketConfig: WebSocketConfig = {
  maxConnections: 15,
  maxMessageBufferSize: 200,
  maxSequenceGap: 100,
  connectionTimeout: 30000,
  heartbeatInterval: 30000,
  cleanupInterval: 45000, // 45 seconds
  memoryWarningThreshold: 15 * 1024 * 1024, // 15MB
  memoryCleanupThreshold: 30 * 1024 * 1024, // 30MB
};

/**
 * High-performance WebSocket configuration
 * For environments with high message throughput
 */
export const highPerformanceWebSocketConfig: WebSocketConfig = {
  maxConnections: 25,
  maxMessageBufferSize: 500,
  maxSequenceGap: 200,
  connectionTimeout: 45000,
  heartbeatInterval: 25000,
  cleanupInterval: 30000, // 30 seconds
  memoryWarningThreshold: 25 * 1024 * 1024, // 25MB
  memoryCleanupThreshold: 50 * 1024 * 1024, // 50MB
};

/**
 * Get WebSocket configuration based on environment
 */
export function getWebSocketPerformanceConfig(): WebSocketConfig {
  const env = process.env.NODE_ENV;
  const performanceMode = process.env.WEBSOCKET_PERFORMANCE_MODE;
  
  if (performanceMode === 'high') {
    return highPerformanceWebSocketConfig;
  }
  
  if (env === 'production') {
    return productionWebSocketConfig;
  }
  
  return developmentWebSocketConfig;
}


/**
 * WebSocket reconnection configuration
 */
export const webSocketReconnectionConfig = {
  // Base delay for exponential backoff (milliseconds)
  baseDelay: 1000,
  
  // Maximum delay between reconnection attempts
  maxDelay: 60000,
  
  // Maximum number of reconnection attempts
  maxAttempts: 10,
  
  // Jitter factor for randomizing delays
  jitterFactor: 0.3,
  
  // Reset reconnection state after successful connection (milliseconds)
  resetTimeout: 300000, // 5 minutes
};

/**
 * WebSocket memory management configuration
 */
export const webSocketMemoryConfig = {
  // Enable aggressive cleanup when memory threshold is exceeded
  enableAggressiveCleanup: true,
  
  // Message age threshold for cleanup (milliseconds)
  messageMaxAge: 5 * 60 * 1000, // 5 minutes
  
  // Aggressive cleanup message age threshold
  aggressiveCleanupMaxAge: 2 * 60 * 1000, // 2 minutes
  
  // Buffer optimization interval
  bufferOptimizationInterval: 120000, // 2 minutes
  
  // Enable garbage collection hints
  enableGCHints: process.env.NODE_ENV === 'production',
  
  // Connection stale threshold
  connectionStaleThreshold: 30 * 60 * 1000, // 30 minutes
};

/**
 * Session-based WebSocket authentication configuration
 * Removes token-based authentication in favor of cookie-only approach
 */
export const webSocketSessionConfig = {
  // Session validation settings
  enableSessionValidation: true,
  sessionValidationInterval: 30 * 1000, // 30 seconds
  
  // Cookie-based authentication
  requireSessionCookie: true,
  sessionCookieName: 'domainflow_session',
  
  // CSRF protection headers
  requiredHeaders: {
    'X-Requested-With': 'XMLHttpRequest',
  },
  
  // Session expiration handling
  handleSessionExpiration: true,
  redirectOnSessionExpiry: '/login',
  
  // Origin validation for security
  validateOrigin: true,
  allowedOrigins: (() => {
    const origins: string[] = [];
    
    // Only add configured origins - no hardcoded fallbacks
    if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
      origins.push(process.env.NEXT_PUBLIC_APP_URL);
    }
    
    // Add production domain if configured
    if (process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN?.trim()) {
      origins.push(process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN);
    }
    
    // If no origins configured, throw error to enforce proper configuration
    if (origins.length === 0) {
      throw new Error(
        'CONFIGURATION ERROR: No WebSocket origins configured. ' +
        'Please set NEXT_PUBLIC_APP_URL and/or NEXT_PUBLIC_PRODUCTION_DOMAIN environment variables. ' +
        'Example: NEXT_PUBLIC_APP_URL=http://your-frontend-host:3000'
      );
    }
    
    return origins;
  })(),
  
  // Connection upgrade requirements
  requireSecureConnection: process.env.NODE_ENV === 'production',
  
  // Session renewal
  enableSessionRenewal: true,
  sessionRenewalThreshold: 5 * 60 * 1000, // 5 minutes before expiry
};

/**
 * Get WebSocket session configuration
 */
export function getWebSocketSessionConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    ...webSocketSessionConfig,
    // Override for development
    requireSecureConnection: isProduction,
    validateOrigin: isProduction, // Relaxed for development
    allowedOrigins: isProduction
      ? webSocketSessionConfig.allowedOrigins.filter(origin => origin.includes('https'))
      : webSocketSessionConfig.allowedOrigins,
  };
}

/**
 * WebSocket authentication utilities
 */
export const webSocketAuthUtils = {
  // Get session cookie value
  getSessionCookie(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find(cookie =>
      cookie.startsWith(`${webSocketSessionConfig.sessionCookieName}=`)
    );
    
    return sessionCookie ? (sessionCookie.split('=')[1] || null) : null;
  },
  
  // Check if session is valid for WebSocket connection
  isSessionValidForWebSocket(): boolean {
    const sessionCookie = this.getSessionCookie();
    return !!sessionCookie;
  },
  
  // Get required headers for WebSocket connection
  getWebSocketHeaders(): Record<string, string> {
    return {
      ...webSocketSessionConfig.requiredHeaders,
    };
  },
  
  // Validate origin for WebSocket connection
  validateWebSocketOrigin(origin: string): boolean {
    const config = getWebSocketSessionConfig();
    if (!config.validateOrigin) return true;
    
    return config.allowedOrigins.includes(origin);
  }
};