/**
 * Professional Health Service - Proper wrapper around generated OpenAPI client
 * Unlike amateur hand-rolled services, this uses generated types and includes caching
 */

import { HealthApi, Configuration } from '@/lib/api-client';
import type { ApiHealthStatus } from '@/lib/api-client';

interface CachedHealthData extends ApiHealthStatus {
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
    const config = new Configuration({
      basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    });
    this.api = new HealthApi(config);
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
      // Make fresh API call using the generated client like a professional
      const response = await this.api.healthCheck();
      const healthData = response.data;

      // Cache the fresh data
      this.cache = {
        ...healthData,
        isCached: false,
        cachedAt: now
      };

      return this.cache;
    } catch (error) {
      // If we have stale cache and API fails, return stale data with warning
      if (this.cache) {
        const cacheAge = Math.floor((now.getTime() - this.cache.cachedAt!.getTime()) / 1000);
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
