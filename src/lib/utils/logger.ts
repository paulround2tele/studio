// src/lib/utils/logger.ts
// Configuration-driven logging utilities for DomainFlow
// NO HARDCODING - All logging behavior configurable via environment

/**
 * Serialize Error, Event, and generic objects for meaningful logging
 * Handles non-enumerable properties and circular references safely
 */
function serializeError(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  // Handle Error instances - extract non-enumerable properties
  if (obj instanceof Error) {
    const errorData: Record<string, unknown> = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    
    // Include cause if available (modern Error objects)
    if ('cause' in obj && obj.cause !== undefined) {
      errorData.cause = obj.cause;
    }
    
    // Include any custom enumerable properties
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in errorData)) {
        errorData[key] = value;
      }
    }
    
    return JSON.stringify(errorData, null, 2);
  }

  // Handle Event instances - extract relevant non-enumerable properties
  if (obj instanceof Event) {
    const eventData: Record<string, unknown> = {
      type: obj.type,
      isTrusted: obj.isTrusted,
      timeStamp: obj.timeStamp,
    };
    
    // Add target information if available
    if (obj.target) {
      eventData.target = obj.target.constructor?.name || 'Unknown';
    }
    
    // Add currentTarget information if available
    if (obj.currentTarget) {
      eventData.currentTarget = obj.currentTarget.constructor?.name || 'Unknown';
    }
    
    // Include any custom enumerable properties
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in eventData)) {
        eventData[key] = value;
      }
    }
    
    return JSON.stringify(eventData, null, 2);
  }

  // Handle WebSocket-specific events
  if (typeof obj === 'object' && obj !== null && 'type' in obj) {
    const eventObj = obj as Record<string, unknown>;
    if (eventObj.type === 'error' || eventObj.type === 'close') {
      const wsEventData: Record<string, unknown> = {
        type: eventObj.type,
        isTrusted: eventObj.isTrusted,
        timeStamp: eventObj.timeStamp,
      };
      
      // For close events, include code and reason
      if (eventObj.type === 'close') {
        wsEventData.code = eventObj.code;
        wsEventData.reason = eventObj.reason;
        wsEventData.wasClean = eventObj.wasClean;
      }
      
      return JSON.stringify(wsEventData, null, 2);
    }
  }

  // Handle generic objects with circular reference protection
  try {
    const seen = new WeakSet();
    const result = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    // If JSON.stringify returns '{}' for an object, try to extract some properties manually
    if (result === '{}' && typeof obj === 'object' && obj !== null) {
      const keys = Object.getOwnPropertyNames(obj);
      if (keys.length > 0) {
        const extractedProps: Record<string, unknown> = {};
        keys.slice(0, 10).forEach(key => { // Limit to first 10 properties
          try {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);
            if (descriptor) {
              extractedProps[key] = descriptor.value;
            }
          } catch {
            extractedProps[key] = '[Unable to access]';
          }
        });
        return JSON.stringify(extractedProps, null, 2);
      }
    }
    
    return result;
  } catch (_error) {
    // Fallback for objects that can't be serialized
    return `[Object: ${obj.constructor?.name || 'Unknown'}]`;
  }
}

/**
 * Environment-aware logging configuration
 * Adapts logging behavior based on environment settings
 */
interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  enableConsole: boolean;
  enableRemote: boolean;
  enableDebugMode: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
  maxLogEntries: number;
  bufferSize: number;
}

/**
 * Default configuration from environment variables
 * Uses sensible defaults with environment overrides
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: (process.env.NEXT_PUBLIC_LOG_LEVEL as LoggerConfig['level']) || 
         (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  enableConsole: process.env.NODE_ENV !== 'test',
  enableRemote: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
  enableDebugMode: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_LOGGING_API_KEY,
  maxLogEntries: parseInt(process.env.NEXT_PUBLIC_MAX_LOG_ENTRIES || '1000'),
  bufferSize: parseInt(process.env.NEXT_PUBLIC_LOG_BUFFER_SIZE || '100'),
};

/**
 * Log entry interface for structured logging
 */
interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: unknown;
  stack?: string;
  sessionId?: string;
  userId?: string;
  requestId?: string;
}

/**
 * In-memory log buffer for batching and offline support
 */
class LogBuffer {
  private entries: LogEntry[] = [];
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  add(entry: LogEntry): void {
    this.entries.push(entry);
    
    // Prevent memory leaks by limiting buffer size
    if (this.entries.length > this.config.maxLogEntries) {
      this.entries = this.entries.slice(-this.config.maxLogEntries);
    }

    // Auto-flush when buffer is full
    if (this.entries.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  flush(): void {
    if (!this.config.enableRemote || !this.config.remoteEndpoint || this.entries.length === 0) {
      return;
    }

    const entriesToSend = [...this.entries];
    this.entries = [];

    // Send logs to remote endpoint (fire and forget)
    this.sendToRemote(entriesToSend).catch(error => {
      // If remote logging fails, fall back to console in development
      if (this.config.enableDebugMode) {
        console.warn('[Logger] Failed to send logs to remote endpoint:', error);
      }
    });
  }

  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ logs: entries }),
    });
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

/**
 * Core logger class with environment-aware configuration
 */
class Logger {
  private config: LoggerConfig;
  private buffer: LogBuffer;
  private sessionId?: string;
  private userId?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buffer = new LogBuffer(this.config);
    
    // Generate session ID for tracking
    this.sessionId = this.generateSessionId();

    // Auto-flush buffer periodically
    if (typeof window !== 'undefined' && this.config.enableRemote) {
      setInterval(() => this.buffer.flush(), 30000); // Flush every 30 seconds
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.buffer.flush());
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, category: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const sessionPart = this.sessionId ? ` [${this.sessionId.slice(-8)}]` : '';
    const userPart = this.userId ? ` [user:${this.userId}]` : '';
    const dataPart = data ? ` ${serializeError(data)}` : '';
    
    return `[${timestamp}]${sessionPart}${userPart} [${level.toUpperCase()}] [${category}] ${message}${dataPart}`;
  }

  private log(level: string, category: string, message: string, data?: unknown, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      category,
      message,
      data,
      stack: error?.stack,
      sessionId: this.sessionId,
      userId: this.userId,
      requestId: this.generateRequestId(),
    };

    // Add to buffer for potential remote logging
    this.buffer.add(entry);

    // Console logging if enabled
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, category, message, data);
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          // Use serialized error for meaningful logging
          if (error) {
            const serializedError = serializeError(error);
            console.error(formattedMessage, '\n' + serializedError);
          } else {
            console.error(formattedMessage);
          }
          break;
        default:
          console.log(formattedMessage);
      }
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Public API methods
  setUserId(userId: string): void {
    this.userId = userId;
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, errorOrData?: Error | unknown): void {
    if (errorOrData instanceof Error) {
      this.log('error', category, message, undefined, errorOrData);
    } else {
      this.log('error', category, message, errorOrData);
    }
  }

  // Category-specific loggers
  auth = {
    success: (message: string, data?: unknown) => this.info('AUTH', message, data),
    error: (message: string, error?: Error | unknown) => this.error('AUTH', message, error),
    warn: (message: string, data?: unknown) => this.warn('AUTH', message, data),
    debug: (message: string, data?: unknown) => this.debug('AUTH', message, data),
  };

  api = {
    request: (message: string, data?: unknown) => this.debug('API', `Request: ${message}`, data),
    response: (message: string, data?: unknown) => this.debug('API', `Response: ${message}`, data),
    error: (message: string, error?: Error | unknown) => this.error('API', message, error),
    warn: (message: string, data?: unknown) => this.warn('API', message, data),
  };

  websocket = {
    connect: (message: string, data?: unknown) => this.info('WEBSOCKET', `Connect: ${message}`, data),
    disconnect: (message: string, data?: unknown) => this.info('WEBSOCKET', `Disconnect: ${message}`, data),
    message: (message: string, data?: unknown) => this.debug('WEBSOCKET', `Message: ${message}`, data),
    error: (message: string, error?: Error | unknown) => this.error('WEBSOCKET', message, error),
    warn: (message: string, data?: unknown) => this.warn('WEBSOCKET', message, data),
    success: (message: string, data?: unknown) => this.info('WEBSOCKET', message, data),
  };

  campaign = {
    created: (message: string, data?: unknown) => this.info('CAMPAIGN', `Created: ${message}`, data),
    started: (message: string, data?: unknown) => this.info('CAMPAIGN', `Started: ${message}`, data),
    completed: (message: string, data?: unknown) => this.info('CAMPAIGN', `Completed: ${message}`, data),
    error: (message: string, error?: Error | unknown) => this.error('CAMPAIGN', message, error),
    progress: (message: string, data?: unknown) => this.debug('CAMPAIGN', `Progress: ${message}`, data),
  };

  ui = {
    interaction: (message: string, data?: unknown) => this.debug('UI', `Interaction: ${message}`, data),
    navigation: (message: string, data?: unknown) => this.debug('UI', `Navigation: ${message}`, data),
    error: (message: string, error?: Error | unknown) => this.error('UI', message, error),
    performance: (message: string, data?: unknown) => this.debug('UI', `Performance: ${message}`, data),
  };

  // Utility methods
  flush(): void {
    this.buffer.flush();
  }

  getLogs(): LogEntry[] {
    return this.buffer.getEntries();
  }

  clearLogs(): void {
    this.buffer.clear();
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.buffer = new LogBuffer(this.config);
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Create singleton logger instance
let loggerInstance: Logger | null = null;

/**
 * Get or create the singleton logger instance
 */
export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  } else if (config) {
    loggerInstance.updateConfig(config);
  }
  return loggerInstance;
}

// Export default logger instance with common categories
const logger = getLogger();

// Legacy exports for backward compatibility (used by existing code)
export const logAuth = logger.auth;
export const logAPI = logger.api;
export const logWebSocket = logger.websocket;
export const logCampaign = logger.campaign;
export const logUI = logger.ui;

// Export the main logger
export default logger;

// Export types for external use
export type { LoggerConfig, LogEntry };

// Export logger class for testing
export { Logger };

// Export error serialization utility for use in other modules
export { serializeError };

// Performance monitoring helpers
export const performance = {
  mark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
    logger.debug('PERFORMANCE', `Mark: ${name}`);
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
        const entry = window.performance.getEntriesByName(name)[0];
        if (entry) {
          logger.debug('PERFORMANCE', `Measure: ${name}`, { 
            duration: entry.duration,
            startTime: entry.startTime 
          });
          return entry.duration;
        }
      } catch (error) {
        logger.warn('PERFORMANCE', `Failed to measure ${name}`, error);
      }
    }
    return 0;
  },
  
  time: (label: string) => {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        logger.debug('PERFORMANCE', `Timer: ${label}`, { duration });
        return duration;
      }
    };
  }
};

// Error boundary integration
export const errorBoundaryLogger = {
  componentDidCatch: (error: Error, errorInfo: { componentStack?: string }) => {
    logger.error('ERROR_BOUNDARY', 'Component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  },
  
  handleGlobalError: (event: ErrorEvent) => {
    logger.error('GLOBAL_ERROR', 'Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  },
  
  handleUnhandledRejection: (event: PromiseRejectionEvent) => {
    logger.error('UNHANDLED_REJECTION', 'Unhandled promise rejection', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
  },
};

// Initialize global error handlers in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('error', errorBoundaryLogger.handleGlobalError);
  window.addEventListener('unhandledrejection', errorBoundaryLogger.handleUnhandledRejection);
}