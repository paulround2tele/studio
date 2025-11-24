/**
 * Unified Fetch Wrapper with Standardized Policies (Phase 7)
 * Centralized fetch behavior with retry, timeout, validation, and telemetry
 */

import { telemetryService } from '../../services/campaignMetrics/telemetryService';

/**
 * Fetch policy configuration
 */
export interface FetchPolicyConfig {
  retries?: number;
  timeoutMs?: number;
  validateSchema?: boolean;
  enableETag?: boolean;
  category?: 'api' | 'meta' | 'data';
}

/**
 * Fetch error categories for telemetry
 */
export type FetchErrorCategory = 'network' | 'server' | 'validation' | 'timeout';

/**
 * Fetch result with metadata
 */
export interface FetchResult<T> {
  data: T;
  status: number;
  etag?: string;
  fromCache?: boolean;
}

// Supported response body kinds for overload resolution
type BodyKind = 'json' | 'text' | 'arrayBuffer';

// Overloads for execute
export class FetchWithPolicy {
  private static defaultConfig: FetchPolicyConfig = {
    retries: 2,
    timeoutMs: 10000, // 10 seconds
    validateSchema: true,
    enableETag: true,
    category: 'api',
  };

  static async execute<T = unknown>(
    url: string,
    options?: RequestInit,
    config?: FetchPolicyConfig & { bodyKind?: 'json' }
  ): Promise<FetchResult<T>>;
  static async execute(
    url: string,
    options: RequestInit | undefined,
    config: FetchPolicyConfig & { bodyKind: 'text' }
  ): Promise<FetchResult<string>>;
  static async execute(
    url: string,
    options: RequestInit | undefined,
    config: FetchPolicyConfig & { bodyKind: 'arrayBuffer' }
  ): Promise<FetchResult<ArrayBuffer>>;
  static async execute<T = unknown>(
    url: string,
    options: RequestInit = {},
    config: FetchPolicyConfig & { bodyKind?: BodyKind } = {}
  ): Promise<FetchResult<T | string | ArrayBuffer>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const endpoint = this.extractEndpoint(url);
    const bodyKind: BodyKind = config.bodyKind || 'json';

/**
 * Enhanced fetch wrapper with comprehensive error handling and telemetry
 */
    let lastError: Error | null = null;
    let attempt = 0;
    
    // Add default headers
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && bodyKind === 'json') {
      headers.set('Content-Type', 'application/json');
    }

    // Accept header based on expected body kind
    if (!headers.has('Accept')) {
      headers.set('Accept', bodyKind === 'json' ? 'application/json' : bodyKind === 'text' ? 'text/plain' : '*/*');
    }

    // ETag support for caching
    if (finalConfig.enableETag) {
      const cachedETag = this.getCachedETag(url);
      if (cachedETag) {
        headers.set('If-None-Match', cachedETag);
      }
    }

    const finalOptions: RequestInit = {
      ...options,
      headers,
    };

    while (attempt <= finalConfig.retries!) {
      attempt++;

      try {
        const result = await this.fetchWithTimeout(url, finalOptions, finalConfig.timeoutMs!);
        
        // Handle 304 Not Modified
        if (result.status === 304) {
          const cachedData = this.getCachedResponse<T>(url);
          if (cachedData) {
            return {
              data: cachedData,
              status: 200,
              fromCache: true,
            };
          }
        }

        // Handle successful response
        if (result.ok) {
          const data = await this.parseResponse(result, finalConfig.validateSchema!, bodyKind) as T | string | ArrayBuffer;
          
          // Cache response with ETag
          if (finalConfig.enableETag && result.headers.has('ETag')) {
            const etag = result.headers.get('ETag')!;
            this.setCachedResponse(url, data, etag);
          }

          return {
            data,
            status: result.status,
            etag: result.headers.get('ETag') || undefined,
            fromCache: false,
          };
        }

        // Handle server errors
        const category = this.categorizeError(result.status);
        lastError = new Error(`HTTP ${result.status}: ${result.statusText}`);
        
        this.emitFetchError(endpoint, category, result.status, attempt);

        // Don't retry on client errors (4xx)
        if (result.status >= 400 && result.status < 500) {
          break;
        }

      } catch (error) {
        lastError = error as Error;
        
        const category = this.categorizeNetworkError(error);
        this.emitFetchError(endpoint, category, undefined, attempt);

        // Don't retry on timeout or validation errors
        if (category === 'timeout' || category === 'validation') {
          break;
        }
      }

      // Exponential backoff delay before retry
      if (attempt <= finalConfig.retries!) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Fetch failed after all retries');
  }

  /**
   * Fetch with timeout using AbortController
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, timeoutMs);

      fetch(url, {
        ...options,
        signal: controller.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === 'AbortError') {
            reject(new Error('Request timeout'));
            return;
          }
          reject(error);
        });
    });
  }

  /**
   * Parse response with optional schema validation
   */
  private static async parseResponse(
    response: Response,
    validateSchema: boolean,
    bodyKind: BodyKind
  ): Promise<unknown> {
    switch (bodyKind) {
      case 'text':
        return response.text();
      case 'arrayBuffer':
        return response.arrayBuffer();
      case 'json':
      default: {
        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          // Attempt JSON parse anyway; if fails, surface error
          try {
            return await response.json();
          } catch (_e) {
            throw new Error('Expected JSON response but received incompatible content-type');
          }
        }
        try {
          const data = await response.json();
          if (validateSchema) {
            this.validateResponseSchema(data);
          }
          return data;
        } catch (error) {
          throw new Error(`JSON parse error: ${error}`);
        }
      }
    }
  }

  /**
   * Basic schema validation for common response patterns
   */
  private static validateResponseSchema(data: unknown): void {
    // Check for common malformed patterns
    if (data === null || data === undefined) {
      throw new Error('Response data is null or undefined');
    }

    // Check for array responses with non-monotonic timestamps
    if (Array.isArray(data)) {
      this.validateTimestampOrder(data as unknown[]);
    }

    // Check for object responses with arrays
    if (typeof data === 'object' && !Array.isArray(data)) {
      for (const value of Object.values(data as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          this.validateTimestampOrder(value as unknown[]);
        }
      }
    }
  }

  /**
   * Validate timestamp ordering in arrays
   */
  private static validateTimestampOrder(array: unknown[]): void {
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      
      // Skip non-objects
      if (!item || typeof item !== 'object') continue;
      
      // Check for timestamp fields
      const timestampFields = ['timestamp', 'createdAt', 'updatedAt', 'time'];
      const timestamp = timestampFields.find(field => (item as Record<string, unknown>)[field]);
      
      if (timestamp && i > 0) {
        const prevItem = array[i - 1];
        const prevTimestamp = timestampFields.find(field => (prevItem as Record<string, unknown>)[field]);
        
        if (prevTimestamp) {
          const currentTime = new Date((item as Record<string, unknown>)[timestamp] as string).getTime();
          const prevTime = new Date((prevItem as Record<string, unknown>)[prevTimestamp] as string).getTime();
          
          // Allow for small variations but catch major ordering issues
          if (currentTime < prevTime - 60000) { // 1 minute tolerance
            throw new Error(`Timestamp ordering violation detected`);
          }
        }
      }

      // Check for negative counts/values
      for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
        if (typeof value === 'number' && key.includes('count') && value < 0) {
          throw new Error(`Negative count detected: ${key} = ${value}`);
        }
      }
    }
  }

  /**
   * Categorize HTTP status errors
   */
  private static categorizeError(status: number): FetchErrorCategory {
    if (status >= 500) return 'server';
    if (status >= 400) return 'network';
    return 'server';
  }

  /**
   * Categorize network errors
   */
  private static categorizeNetworkError(error: unknown): FetchErrorCategory {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    
    if (message.includes('timeout') || message.includes('abort')) {
      return 'timeout';
    }
    
    if (message.includes('json') || message.includes('parse')) {
      return 'validation';
    }
    
    return 'network';
  }

  /**
   * Emit fetch error telemetry
   */
  private static emitFetchError(
    endpoint: string,
    category: FetchErrorCategory,
    status?: number,
    attempt: number = 1
  ): void {
    telemetryService.emitTelemetry('fetch_error', {
      endpoint,
      category,
      status,
      attempt,
    });
  }

  /**
   * Extract endpoint from URL for telemetry
   */
  private static extractEndpoint(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url.split('?')[0] || 'unknown';
    }
  }

  /**
   * Get cached ETag for URL
   */
  private static getCachedETag(url: string): string | null {
    try {
      const key = `etag:${url}`;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Get cached response for URL
   */
  private static getCachedResponse<T>(url: string): T | null {
    try {
      const key = `response:${url}`;
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  /**
   * Cache response with ETag
   */
  private static setCachedResponse<T>(url: string, data: T, etag: string): void {
    try {
      localStorage.setItem(`etag:${url}`, etag);
      localStorage.setItem(`response:${url}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  /**
   * Delay utility for backoff
   */
  private static delay(ms: number): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function for common API calls
 */
export async function fetchWithPolicy<T>(
  url: string,
  options?: RequestInit,
  config?: FetchPolicyConfig
): Promise<T> {
  const result = await FetchWithPolicy.execute<T>(url, options, config);
  return result.data;
}