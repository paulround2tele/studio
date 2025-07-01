/**
 * Enhanced API Service with Network Recovery and Error Handling
 * Addresses Phase 3 network and API failures with configurable retry logic
 */

import { getApiConfig } from '@/lib/config/environment';
import { getLogger } from '@/lib/utils/logger';
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';

const logger = getLogger();

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableStatuses: number[];
}

interface NetworkError extends Error {
  status?: number;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  loadingOperation?: string;
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

class EnhancedApiService {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetryConfig: RetryConfig;

  constructor() {
    const config = getApiConfig();
    this.baseUrl = `${config.baseUrl}/api/v2`;
    this.defaultTimeout = config.timeout;
    
    this.defaultRetryConfig = {
      maxAttempts: config.retryAttempts,
      baseDelay: config.retryDelay,
      maxDelay: 30000,
      backoffFactor: 2,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    };

    logger.debug('ENHANCED_API_SERVICE', 'Initialized', {
      baseUrl: this.baseUrl,
      timeout: this.defaultTimeout,
      retryConfig: this.defaultRetryConfig,
    });
  }

  /**
   * Make an API request with retry logic and error recovery
   */
  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const retryConfig = { ...this.defaultRetryConfig, ...config.retryConfig };
    const timeout = config.timeout || this.defaultTimeout;
    
    // Start loading operation if specified
    if (config.loadingOperation) {
      useLoadingStore.getState().startLoading(config.loadingOperation);
    }

    let lastError: NetworkError | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        logger.debug('ENHANCED_API_SERVICE', `Request attempt ${attempt}/${retryConfig.maxAttempts}`, {
          method: config.method,
          url,
          timeout,
        });

        const response = await this.makeRequest(url, config, timeout);
        
        // Success - stop loading operation
        if (config.loadingOperation) {
          useLoadingStore.getState().stopLoading(config.loadingOperation, 'succeeded');
        }

        return {
          data: response.data as T,
          status: response.status,
          headers: response.headers,
        };

      } catch (error) {
        lastError = this.normalizeError(error);
        
        logger.warn('ENHANCED_API_SERVICE', `Request attempt ${attempt} failed`, {
          error: lastError.message,
          status: lastError.status,
          isRetryable: this.isRetryableError(lastError, retryConfig),
        });

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(lastError, retryConfig)) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateRetryDelay(attempt, retryConfig);
        logger.debug('ENHANCED_API_SERVICE', `Retrying in ${delay}ms`);
        
        await this.sleep(delay);
      }
    }

    // All attempts failed - stop loading operation with error
    if (config.loadingOperation) {
      useLoadingStore.getState().stopLoading(
        config.loadingOperation, 
        'failed', 
        lastError?.message || 'Request failed'
      );
    }

    // Throw the last error
    throw lastError || new Error('Request failed without specific error');
  }

  /**
   * Make the actual HTTP request with timeout
   */
  private async makeRequest(
    url: string,
    config: RequestConfig,
    timeout: number
  ): Promise<{ data: unknown; status: number; headers: Headers }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const _errorData = await response.text();
        const error: NetworkError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        throw error;
      }

      let data;
      try {
        data = await response.json();
      } catch (_parseError) {
        // Handle non-JSON responses
        data = await response.text();
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: NetworkError = new Error('Request timeout');
        timeoutError.isTimeoutError = true;
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      
      throw error;
    }
  }

  /**
   * Normalize different types of errors
   */
  private normalizeError(error: unknown): NetworkError {
    if (error instanceof Error) {
      const networkError = error as NetworkError;
      
      // Check if it's a network error
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('Network request failed')) {
        networkError.isNetworkError = true;
        networkError.code = 'NETWORK_ERROR';
      }
      
      // Extract status code if available
      const statusMatch = error.message.match(/HTTP (\d+):/);
      if (statusMatch && statusMatch[1]) {
        networkError.status = parseInt(statusMatch[1], 10);
      }
      
      return networkError;
    }
    
    const unknownError: NetworkError = new Error('Unknown error occurred');
    unknownError.code = 'UNKNOWN_ERROR';
    return unknownError;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: NetworkError, retryConfig: RetryConfig): boolean {
    // Always retry network errors and timeouts
    if (error.isNetworkError || error.isTimeoutError) {
      return true;
    }
    
    // Retry specific HTTP status codes
    if (error.status && retryConfig.retryableStatuses.includes(error.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, retryConfig: RetryConfig): number {
    const exponentialDelay = retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, retryConfig.maxDelay);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T = unknown>(endpoint: string, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, body?: unknown, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = unknown>(endpoint: string, body?: unknown, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T = unknown>(endpoint: string, config: Partial<RequestConfig> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Health check method to test connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', {
        timeout: 5000,
        retryConfig: { maxAttempts: 1 },
        loadingOperation: LOADING_OPERATIONS.API_REQUEST,
      });
      return true;
    } catch (error) {
      logger.error('ENHANCED_API_SERVICE', 'Health check failed', error);
      return false;
    }
  }

  /**
   * Test network connectivity
   */
  async testConnectivity(): Promise<{
    isConnected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.healthCheck();
      const latency = Date.now() - startTime;
      
      return {
        isConnected: true,
        latency,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const enhancedApiService = new EnhancedApiService();

// Export class for testing
export { EnhancedApiService };

// Export types
export type { RequestConfig, ApiResponse, NetworkError, RetryConfig };