/**
 * Professional Health Service - Proper wrapper around generated OpenAPI client
 * Unlike amateur hand-rolled services, this uses generated types and includes caching
 */

import { HealthApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';

export interface CachedHealthData {
  version?: string;
  status?: string;
  isCached: boolean;
  cacheAge?: number; // seconds since cached
  cachedAt?: Date;
  message?: string; // Optional override message for cached/error states
}

class HealthService {
  private api: HealthApi;
  private cache: CachedHealthData | null = null;
  private cacheTimeout = 60 * 60 * 1000; // 1 hour cache - because we're not savages

  constructor() {
    this.api = new HealthApi(apiConfiguration);
  }

  /**
   * Get health status with intelligent caching
   * @param forceRefresh - Force a fresh API call, bypassing cache
   */
  async getHealth(forceRefresh = false): Promise<CachedHealthData> {
    const now = new Date();

    // Return cached data if available and not forcing refresh
    if (!forceRefresh && this.cache && this.cache.cachedAt) {
      const cacheAge = Math.floor((now.getTime() - this.cache.cachedAt.getTime()) / 1000);
      
      if (cacheAge < this.cacheTimeout / 1000) {
        return {
          ...this.cache,
          isCached: true,
          cacheAge
        };
      }
    }

    try {
      // Make fresh API call using the generated client
      // Health endpoints return a SuccessEnvelope with no data field; treat success=true as ok
  const response = await this.api.healthCheck();
  interface HealthEnvelope { success?: boolean; metadata?: { version?: string } }
  const envelope: HealthEnvelope | undefined = (response as unknown as { data?: HealthEnvelope }).data;
  const isOk = envelope?.success === true;

      const normalized: CachedHealthData = {
  version: envelope?.metadata?.version || undefined,
        status: isOk ? 'ok' : 'unhealthy',
        isCached: false,
        cachedAt: now,
      };

      // Cache the fresh data
      this.cache = normalized;
      return this.cache as CachedHealthData;
    } catch (error) {
      // If we have stale cache and API fails, return stale data with warning
      if (this.cache) {
  const cacheAge = Math.floor((now.getTime() - (this.cache.cachedAt as Date).getTime()) / 1000);
        return {
          ...this.cache,
          isCached: true,
          cacheAge,
          status: 'warning' as const,
          message: 'Using cached data due to API failure'
        };
      }

      // No cache available, return error state
      throw error;
    }
  }

  /**
   * Get time until next automatic refresh
   */
  getTimeUntilNextRefresh(): number {
    if (!this.cache || !this.cache.cachedAt) {
      return 0;
    }

    const now = new Date();
    const cacheAge = now.getTime() - this.cache.cachedAt.getTime();
    const timeUntilRefresh = this.cacheTimeout - cacheAge;

    return Math.max(0, timeUntilRefresh);
  }

  /**
   * Clear the cache - useful for testing or forced refreshes
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Check if health data is currently cached
   */
  isCached(): boolean {
    if (!this.cache || !this.cache.cachedAt) {
      return false;
    }

    const now = new Date();
    const cacheAge = now.getTime() - this.cache.cachedAt.getTime();
    return cacheAge < this.cacheTimeout;
  }

  /**
   * Get cache age in seconds
   */
  getCacheAge(): number {
    if (!this.cache || !this.cache.cachedAt) {
      return 0;
    }

    const now = new Date();
    return Math.floor((now.getTime() - this.cache.cachedAt.getTime()) / 1000);
  }
}

// Export a singleton instance like a civilized developer
const healthService = new HealthService();
export default healthService;
