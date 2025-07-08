/**
 * Centralized Backend Detection Service
 * Prevents 429 rate limiting by consolidating all backend URL detection into a single cached service
 */

interface DetectionResult {
  url: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class BackendDetectionService {
  private cache: DetectionResult | null = null;
  private detectionPromise: Promise<string> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  private readonly REQUEST_TIMEOUT = 1000; // 1 second timeout per port
  private readonly COMMON_PORTS = [8080, 3001, 5000, 8000, 4000];

  /**
   * Get backend URL with smart caching to prevent request flooding
   */
  async getBackendUrl(): Promise<string> {
    // If explicitly configured, use it (highest priority)
    const configured = process.env.NEXT_PUBLIC_API_URL;
    if (configured && configured.trim()) {
      console.log(`🔧 [BackendDetection] Using configured URL: ${configured}`);
      return configured;
    }

    // Check cache first
    if (this.cache && this.isCacheValid()) {
      console.log(`💾 [BackendDetection] Using cached URL: ${this.cache.url} (age: ${Math.round((Date.now() - this.cache.timestamp) / 1000)}s)`);
      return this.cache.url;
    }

    // If detection is already in progress, wait for it
    if (this.detectionPromise) {
      console.log(`⏳ [BackendDetection] Detection in progress, waiting...`);
      return await this.detectionPromise;
    }

    // Start new detection
    this.detectionPromise = this.performDetection();
    
    try {
      const result = await this.detectionPromise;
      this.cacheResult(result);
      return result;
    } finally {
      this.detectionPromise = null;
    }
  }

  /**
   * Perform actual backend detection with rate limiting protection
   */
  private async performDetection(): Promise<string> {
    console.log(`🔍 [BackendDetection] Starting backend auto-detection...`);

    // In production, backend is same origin
    if (process.env.NODE_ENV === 'production') {
      console.log(`🏭 [BackendDetection] Production mode - using same origin`);
      return '';
    }

    // In development, try common backend ports
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      console.log(`🔍 [BackendDetection] Testing ports on ${host}: ${this.COMMON_PORTS.join(', ')}`);
      
      for (const port of this.COMMON_PORTS) {
        try {
          const testUrl = `http://${host}:${port}/health`;
          console.log(`  🔄 Testing: ${testUrl}`);
          
          const response = await fetch(testUrl, { 
            method: 'GET',
            signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const backendUrl = `http://${host}:${port}`;
            console.log(`✅ [BackendDetection] Backend detected: ${backendUrl}`);
            return backendUrl;
          }
        } catch (error) {
          console.log(`  ❌ Port ${port} failed: ${error instanceof Error ? error.message : 'unknown'}`);
          continue;
        }
      }
    }
    
    // Fallback: assume same origin (for SSR or if detection fails)
    console.log(`⚠️ [BackendDetection] Detection failed, using same origin fallback`);
    return '';
  }

  /**
   * Cache the detection result
   */
  private cacheResult(url: string): void {
    this.cache = {
      url,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    };
    console.log(`💾 [BackendDetection] Cached result: ${url} (TTL: ${this.CACHE_TTL / 1000}s)`);
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    const age = Date.now() - this.cache.timestamp;
    return age < this.cache.ttl;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.detectionPromise = null;
    console.log(`🗑️ [BackendDetection] Cache cleared`);
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { cached: boolean; age?: number; url?: string } {
    if (!this.cache) return { cached: false };
    
    const age = Math.round((Date.now() - this.cache.timestamp) / 1000);
    return {
      cached: true,
      age,
      url: this.cache.url
    };
  }

  /**
   * Check if a backend is available at the given URL
   */
  async pingBackend(baseUrl: string): Promise<boolean> {
    try {
      const healthUrl = `${baseUrl}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
        headers: { 'Accept': 'application/json' }
      });
      
      return response.ok;
    } catch (_error) {
      return false;
    }
  }
}

// Export singleton instance
export const backendDetection = new BackendDetectionService();

// Export convenience function
export const getBackendUrl = () => backendDetection.getBackendUrl();

// Export for testing
export const clearBackendCache = () => backendDetection.clearCache();
export const getBackendCacheStatus = () => backendDetection.getCacheStatus();