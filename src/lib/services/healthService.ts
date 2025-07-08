/**
 * Professional Health Service Implementation
 * Uses centralized backend detection with circuit breaker pattern and intelligent caching
 * Eliminates 429 rate limiting through request consolidation and proper rate limiting
 */

import { getBackendUrl } from '@/lib/services/backendDetection';

/**
 * Normalize various health status formats to standardized values
 */
function normalizeHealthStatus(status: string | undefined): string {
  if (!status) return 'unknown';
  
  const normalized = status.toLowerCase().trim();
  
  // Map common health status responses to 'ok'
  const healthyStatuses = ['ok', 'healthy', 'up', 'online', 'running', 'good', 'success'];
  
  if (healthyStatuses.includes(normalized)) {
    return 'ok';
  }
  
  // Map common unhealthy statuses
  const unhealthyStatuses = ['down', 'offline', 'error', 'failed', 'unhealthy', 'bad'];
  
  if (unhealthyStatuses.includes(normalized)) {
    return 'error';
  }
  
  // Return original status if not recognized
  return normalized;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  message?: string;
  checks?: Record<string, unknown>;
  isCached?: boolean;
  cacheAge?: number;
}

/**
 * Circuit breaker to prevent repeated failed requests and 429 rate limiting
 */
class HealthCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 3;
  private readonly resetTimeout = 60000; // 1 minute
  private readonly requestTimeout = 10000; // 10 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - too many recent failures');
      }
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), this.requestTimeout);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Intelligent health check cache to prevent request flooding
 */
class HealthCache {
  private cache: HealthResponse | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheExpiryMs = 3600000; // 1 hour

  isValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cacheTimestamp < this.cacheExpiryMs;
  }

  get(): HealthResponse | null {
    if (this.isValid() && this.cache) {
      const cacheAge = Date.now() - this.cacheTimestamp;
      return {
        ...this.cache,
        isCached: true,
        cacheAge: Math.floor(cacheAge / 1000)
      };
    }
    return null;
  }

  set(response: HealthResponse): void {
    this.cache = { ...response };
    this.cacheTimestamp = Date.now();
  }

  clear(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  getNextRefreshTime(): number {
    if (!this.cache) return 0;
    return this.cacheTimestamp + this.cacheExpiryMs;
  }
}

// Singleton instances
const circuitBreaker = new HealthCircuitBreaker();
const healthCache = new HealthCache();

/**
 * Professional health check implementation with intelligent caching and rate limiting protection
 */
export async function getHealth(forceRefresh: boolean = false): Promise<HealthResponse> {
  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cachedResult = healthCache.get();
    if (cachedResult) {
      console.log(`💾 [HealthService] Returning cached health check (age: ${cachedResult.cacheAge}s)`);
      return cachedResult;
    }
  }

  console.log(`🔍 [HealthService] ${forceRefresh ? 'Force refreshing' : 'Cache miss, fetching'} health status...`);

  try {
    const result = await circuitBreaker.execute(async () => {
      // Use centralized backend detection (no more duplicate port scanning)
      const backendUrl = await getBackendUrl();
      const healthUrl = `${backendUrl}/health`;

      console.log(`🔗 [HealthService] Checking health at: ${healthUrl}`);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize status to 'ok' for consistency (backend may return 'healthy', 'OK', 'up', etc.)
      const normalizedStatus = normalizeHealthStatus(data.status);
      
      console.log(`🔍 [HealthService] Raw backend response:`, data);
      console.log(`🔍 [HealthService] Normalized status: ${data.status} → ${normalizedStatus}`);
      
      return {
        status: normalizedStatus,
        timestamp: data.timestamp || new Date().toISOString(),
        version: data.version,
        message: data.message,
        checks: data.checks,
        isCached: false,
        cacheAge: 0
      } as HealthResponse;
    });

    // Cache successful result
    healthCache.set(result);
    console.log(`✅ [HealthService] Health check successful, cached for 1 hour`);
    return result;

  } catch (error) {
    console.error(`❌ [HealthService] Health check failed:`, error);
    throw error;
  }
}

/**
 * Get cached health status without making a request
 */
export function getCachedHealth(): HealthResponse | null {
  return healthCache.get();
}

/**
 * Clear health cache (useful for testing or forced refresh)
 */
export function clearHealthCache(): void {
  healthCache.clear();
  console.log(`🗑️ [HealthService] Health cache cleared`);
}

/**
 * Get time until next automatic refresh (in milliseconds)
 */
export function getTimeUntilNextRefresh(): number {
  const nextRefresh = healthCache.getNextRefreshTime();
  if (nextRefresh === 0) return 0;
  return Math.max(0, nextRefresh - Date.now());
}

/**
 * Get circuit breaker status for debugging
 */
export function getCircuitBreakerStatus(): string {
  return circuitBreaker.getState();
}

// Export default service object
const healthService = {
  getHealth,
  getCachedHealth,
  clearHealthCache,
  getTimeUntilNextRefresh,
  getCircuitBreakerStatus
};

export default healthService;
