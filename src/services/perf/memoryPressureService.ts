/**
 * Memory Pressure Service (Phase 10)
 * Memory monitoring and cache management
 */

// Types for memory monitoring
export interface MemoryStats {
  usedMB: number;
  totalMB: number;
  percentage: number;
  isHigh: boolean;
  isCritical: boolean;
  timestamp: string;
}

export interface MemoryPressureConfig {
  highThreshold: number; // Percentage
  criticalThreshold: number; // Percentage
  checkInterval: number; // Milliseconds
  enableVisibilityHandling: boolean;
  enablePerformanceAPI: boolean;
}

// Telemetry events
export interface MemoryPressureEvent {
  usedMB: number;
}

/**
 * Memory Pressure Service Class
 */
type CachePriority = 'low' | 'medium' | 'high';

type CacheStore =
  | Map<string, unknown>
  | WeakMap<object, unknown>
  | Set<unknown>
  | { clear: () => void }
  | unknown[];

interface CacheEntry {
  cache: CacheStore;
  priority: CachePriority;
  clearMethod?: () => void;
}

const hasClearMethod = (value: CacheStore): value is { clear: () => void } =>
  typeof (value as { clear?: unknown }).clear === 'function';
// Ignore memory warnings until at least 1 GB is actually in use; small heaps frequently hit
// the percentage-based thresholds even when the absolute usage is tiny.
const MIN_ALERT_MB = 1024;

class MemoryPressureService {
  private config: MemoryPressureConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private cacheRegistry = new Map<string, CacheEntry>();

  constructor(config: Partial<MemoryPressureConfig> = {}) {
    this.config = {
      highThreshold: config.highThreshold || 75,
      criticalThreshold: config.criticalThreshold || 90,
      checkInterval: config.checkInterval || 30000, // 30 seconds
      enableVisibilityHandling: config.enableVisibilityHandling ?? true,
      enablePerformanceAPI: config.enablePerformanceAPI ?? true
    };

    this.initialize();
  }

  /**
   * Get current memory statistics
   */
  getCurrentMemoryUsage(): MemoryStats | null {
    if (!this.isMemoryAPISupported()) {
      return null;
    }

    try {
      // Narrow performance.memory without using 'any'
      const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } };
      const memInfo = perfWithMemory.memory;
      if (!memInfo) return null;

      const usedBytes = memInfo.usedJSHeapSize || 0;
      const totalBytes = memInfo.totalJSHeapSize || memInfo.jsHeapSizeLimit || 0;
      
      const usedMB = Math.round(usedBytes / (1024 * 1024));
      const totalMB = Math.round(totalBytes / (1024 * 1024));
      const percentage = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

      return {
        usedMB,
        totalMB,
        percentage,
        isHigh: percentage >= this.config.highThreshold,
        isCritical: percentage >= this.config.criticalThreshold,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to get memory usage:', error);
      return null;
    }
  }

  /**
   * Register a cache for management
   */
  registerCache(
    name: string,
    cache: CacheStore,
    priority: CachePriority = 'medium',
    clearMethod?: () => void
  ): void {
    this.cacheRegistry.set(name, {
      cache,
      priority,
      clearMethod
    });
  }

  /**
   * Unregister a cache
   */
  unregisterCache(name: string): void {
    this.cacheRegistry.delete(name);
  }

  /**
   * Clear caches based on priority
   */
  clearCaches(priority?: CachePriority): number {
    let clearedCount = 0;

    this.cacheRegistry.forEach((cacheInfo, name) => {
      if (!priority || cacheInfo.priority === priority) {
        try {
          if (cacheInfo.clearMethod) {
            cacheInfo.clearMethod();
          } else if (hasClearMethod(cacheInfo.cache)) {
            cacheInfo.cache.clear();
          } else if (Array.isArray(cacheInfo.cache)) {
            cacheInfo.cache.splice(0, cacheInfo.cache.length);
          }
          clearedCount++;
        } catch (error) {
          console.warn(`Failed to clear cache ${name}:`, error);
        }
      }
    });

    return clearedCount;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { gc?: () => void };
      if (w.gc) {
      try {
          w.gc();
        return true;
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
      }
    }
    return false;
  }

  /**
   * Handle memory pressure
   */
  handleMemoryPressure(stats: MemoryStats): void {
    if (stats.usedMB < MIN_ALERT_MB) {
      return;
    }
    if (stats.isCritical) {
      // Critical: Clear all caches
      this.clearCaches();
      this.forceGarbageCollection();
      console.warn(`Critical memory pressure: ${stats.percentage}% used (${stats.usedMB}MB)`);
    } else if (stats.isHigh) {
      // High: Clear low priority caches only
      this.clearCaches('low');
      console.warn(`High memory pressure: ${stats.percentage}% used (${stats.usedMB}MB)`);
    }

    // Emit telemetry
    this.emitMemoryPressureEvent({
      usedMB: stats.usedMB
    });
  }

  /**
   * Get registered caches info
   */
  getCacheInfo(): Array<{ name: string; priority: CachePriority; hasCustomClear: boolean }> {
    return Array.from(this.cacheRegistry.entries()).map(([name, info]) => ({
      name,
      priority: info.priority,
      hasCustomClear: !!info.clearMethod
    }));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MemoryPressureConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new config
    this.stop();
    this.start();
  }

  /**
   * Start memory monitoring
   */
  start(): void {
    if (!this.config.enablePerformanceAPI || !this.isMemoryAPISupported()) {
      return;
    }

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      const stats = this.getCurrentMemoryUsage();
      if (stats && (stats.isHigh || stats.isCritical)) {
        this.handleMemoryPressure(stats);
      }
    }, this.config.checkInterval);

    // Set up visibility change handler
    if (this.config.enableVisibilityHandling && typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          // Clear low priority caches when tab becomes hidden
          this.clearCaches('low');
        }
      };
      
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    this.stop();
    this.cacheRegistry.clear();
  }

  /**
   * Check if Performance Memory API is supported
   */
  private isMemoryAPISupported(): boolean {
    if (typeof performance === 'undefined') return false;
    const perfWithMemory = performance as unknown as { memory?: unknown };
    return perfWithMemory.memory !== undefined;
  }

  /**
   * Initialize the service
   */
  private initialize(): void {
    if (typeof window !== 'undefined') {
      this.start();

      // Register some default caches from the global scope
      this.registerDefaultCaches();
    }
  }

  /**
   * Register default caches that we know about
   */
  private registerDefaultCaches(): void {
    // Register telemetry service cache
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __telemetryService?: { eventQueue?: unknown[] } };
      const telemetryService = w.__telemetryService;
      if (telemetryService && Array.isArray(telemetryService.eventQueue)) {
        this.registerCache('telemetry_events', telemetryService.eventQueue, 'low', () => {
          telemetryService.eventQueue?.splice(0, Math.floor(telemetryService.eventQueue.length * 0.5));
        });
      }
    }

    // Register any other global caches
    if (typeof window !== 'undefined') {
      // Phase 9 service caches
      const globalCaches = [
        'forecastBlendCache',
        'rootCauseCache',
        'offlineCache',
        'healthFabricCache'
      ];

      globalCaches.forEach(cacheName => {
        const w = window as unknown as Record<string, unknown>;
        const cache = w[cacheName];
        if (cache instanceof Map || cache instanceof WeakMap || cache instanceof Set) {
          this.registerCache(cacheName, cache, 'medium');
        } else if (Array.isArray(cache)) {
          this.registerCache(cacheName, cache, 'medium', () => cache.splice(0, cache.length));
        } else if (
          cache &&
          typeof cache === 'object' &&
          'clear' in cache &&
          typeof (cache as { clear?: unknown }).clear === 'function'
        ) {
          this.registerCache(cacheName, cache as { clear: () => void }, 'medium');
        }
      });
    }
  }

  /**
   * Emit memory pressure telemetry
   */
  private emitMemoryPressureEvent(data: MemoryPressureEvent): void {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __telemetryService?: { emit?: (event: string, payload: unknown) => void } };
      const telemetryService = w.__telemetryService;
      if (telemetryService && typeof telemetryService.emit === 'function') {
        telemetryService.emit('memory_pressure', data);
      }
    }
  }
}

// Export singleton instance
export const memoryPressureService = new MemoryPressureService();

// Availability check function
export const isMemoryMonitoringAvailable = (): boolean => {
  if (typeof performance === 'undefined') return false;
  const perfWithMemory = performance as unknown as { memory?: unknown };
  return perfWithMemory.memory !== undefined;
};