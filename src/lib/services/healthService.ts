// Health service for direct API calls with circuit breaker pattern and hourly caching

export interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  message?: string;
  checks?: Record<string, unknown>;
  isCached?: boolean;
  cacheAge?: number;
}

// RATE LIMIT FIX: Circuit breaker to prevent repeated failed requests
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
      // Add timeout to prevent hanging requests
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

// CRITICAL FIX: Health check cache to limit requests to once per hour
class HealthCache {
  private cache: HealthResponse | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheExpiryMs = 3600000; // 1 hour (3600 seconds)

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
        cacheAge: Math.floor(cacheAge / 1000) // Age in seconds
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

const circuitBreaker = new HealthCircuitBreaker();
const healthCache = new HealthCache();

export async function getHealth(forceRefresh = false): Promise<HealthResponse> {
  // CRITICAL FIX: Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cachedResult = healthCache.get();
    if (cachedResult) {
      console.log(`[HealthService] Returning cached health check (age: ${cachedResult.cacheAge}s)`);
      return cachedResult;
    }
  }

  console.log(`[HealthService] ${forceRefresh ? 'Force refreshing' : 'Cache miss, fetching'} health status...`);

  try {
    const result = await circuitBreaker.execute(async () => {
      // Use the backend API URL instead of frontend API route
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        // RATE LIMIT FIX: Don't retry on 429 errors immediately
        if (response.status === 429) {
          throw new Error(`Rate limited: ${response.statusText}`);
        }
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Backend returns wrapped response: { success: true, data: { status: "ok", ... } }
      // Extract the inner data object to match expected HealthResponse interface
      return responseData.data || responseData;
    });

    // Cache the successful result
    healthCache.set(result);
    console.log(`[HealthService] Health check cached for 1 hour`);
    return result;

  } catch (error) {
    // Don't cache error responses - they should be retryable
    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      message: `${errorMessage} (Circuit: ${circuitBreaker.getState()})`,
    };
    
    console.log(`[HealthService] Health check failed: ${errorMessage}`);
    return errorResponse;
  }
}

// Get cached health status without making a request
export function getCachedHealth(): HealthResponse | null {
  return healthCache.get();
}

// Clear health cache (useful for testing)
export function clearHealthCache(): void {
  healthCache.clear();
  console.log(`[HealthService] Health cache cleared`);
}

// Get time until next allowed refresh
export function getTimeUntilNextRefresh(): number {
  const nextRefresh = healthCache.getNextRefreshTime();
  if (nextRefresh === 0) return 0;
  return Math.max(0, nextRefresh - Date.now());
}

const healthService = {
  getHealth,
  getCachedHealth,
  clearHealthCache,
  getTimeUntilNextRefresh
};
export default healthService;
