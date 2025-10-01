/**
 * Performance & Memory Guardrails Service (Phase 9)
 * Incremental GC-friendly retention policies, memory monitoring, and performance optimization
 */

import { telemetryService } from './telemetryService';

// Declare process and global for Node.js environment
declare const process: any;

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  usedJSHeapSize: number; // bytes
  totalJSHeapSize: number; // bytes
  jsHeapSizeLimit: number; // bytes
  timestamp: number;
  usagePercentage: number; // 0-100
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  id: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: MemoryStats;
  memoryAfter: MemoryStats;
  resourcesAllocated: number;
  resourcesFreed: number;
  gcTriggered: boolean;
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  id: string;
  dataType: 'timeline' | 'forecast' | 'anomalies' | 'recommendations' | 'signals' | 'general';
  maxAge: number; // milliseconds
  maxCount: number; // maximum number of items
  compressionEnabled: boolean;
  gcFriendlyCleanup: boolean; // use incremental cleanup
  cleanupBatchSize: number; // items to clean per batch
  cleanupIntervalMs: number; // time between cleanup batches
}

/**
 * Memory pressure levels
 */
export type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * GC-friendly data structure for large collections
 */
export class GCFriendlyCollection<T> {
  private data = new Map<string, T>();
  private accessOrder = new Map<string, number>();
  private readonly maxSize: number;
  private readonly cleanupBatchSize: number;
  private cleanupInProgress = false;

  constructor(maxSize: number = 10000, cleanupBatchSize: number = 100) {
    this.maxSize = maxSize;
    this.cleanupBatchSize = cleanupBatchSize;
  }

  set(key: string, value: T): void {
    this.data.set(key, value);
    this.accessOrder.set(key, Date.now());
    
    if (this.data.size > this.maxSize && !this.cleanupInProgress) {
      this.scheduleIncrementalCleanup();
    }
  }

  get(key: string): T | undefined {
    const value = this.data.get(key);
    if (value !== undefined) {
      this.accessOrder.set(key, Date.now());
    }
    return value;
  }

  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.data.delete(key);
  }

  size(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
    this.accessOrder.clear();
  }

  private scheduleIncrementalCleanup(): void {
    if (this.cleanupInProgress) return;
    
    this.cleanupInProgress = true;
    
    // Schedule cleanup on next tick to avoid blocking
    setTimeout(() => {
      this.performIncrementalCleanup();
    }, 0);
  }

  private performIncrementalCleanup(): void {
    try {
      // Sort by access time (oldest first)
      const sortedEntries = Array.from(this.accessOrder.entries())
        .sort((a, b) => a[1] - b[1]);

      // Remove oldest items in batches
      const itemsToRemove = Math.min(
        this.cleanupBatchSize,
        this.data.size - Math.floor(this.maxSize * 0.8) // Target 80% of max size
      );

      for (let i = 0; i < itemsToRemove; i++) {
        const [key] = sortedEntries[i];
        this.data.delete(key);
        this.accessOrder.delete(key);
      }

      this.cleanupInProgress = false;

      // Schedule next batch if still over size
      if (this.data.size > this.maxSize) {
        setTimeout(() => {
          this.scheduleIncrementalCleanup();
        }, 10); // Small delay between batches
      }

    } catch (error) {
      console.error('[GCFriendlyCollection] Cleanup error:', error);
      this.cleanupInProgress = false;
    }
  }

  // Get memory usage estimate
  getMemoryUsage(): number {
    // Rough estimate based on data size
    return this.data.size * 1000; // Assume ~1KB per entry
  }
}

/**
 * Performance & memory guardrails service
 */
class PerformanceGuardrailsService {
  private memoryStats: MemoryStats[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private retentionPolicies = new Map<string, RetentionPolicy>();
  private gcFriendlyCollections = new Map<string, GCFriendlyCollection<any>>();
  private monitoringEnabled = true;
  private cleanupTimers = new Map<string, number>();

  // Performance monitoring
  private performanceObserver?: PerformanceObserver;
  private memoryMonitorTimer?: number;

  // Configuration
  private readonly config = {
    memoryThresholds: {
      low: 50, // < 50% memory usage
      medium: 70, // 50-70% memory usage
      high: 85, // 70-85% memory usage
      critical: 95, // > 95% memory usage
    },
    monitoringInterval: 30000, // 30 seconds
    maxPerformanceMetrics: 1000,
    maxMemoryStats: 500,
    gcTriggerThreshold: 0.9, // Trigger cleanup at 90% memory
    enableIncrementalCleanup: typeof process === 'undefined' || process.env?.NEXT_PUBLIC_ENABLE_INCREMENTAL_CLEANUP !== 'false',
  };

  constructor() {
    this.initializeDefaultPolicies();
    if (this.monitoringEnabled) {
      this.startMonitoring();
    }
  }

  /**
   * Create or get GC-friendly collection
   */
  getGCFriendlyCollection<T>(
    name: string,
    maxSize: number = 10000,
    cleanupBatchSize: number = 100
  ): GCFriendlyCollection<T> {
    let collection = this.gcFriendlyCollections.get(name);
    
    if (!collection) {
      collection = new GCFriendlyCollection<T>(maxSize, cleanupBatchSize);
      this.gcFriendlyCollections.set(name, collection);
    }
    
    return collection as GCFriendlyCollection<T>;
  }

  /**
   * Add retention policy
   */
  addRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.id, policy);
    
    if (policy.gcFriendlyCleanup) {
      this.scheduleIncrementalCleanup(policy);
    }

    telemetryService.emitTelemetry('performance_guardrails', {
      action: 'retention_policy_added',
      policyId: policy.id,
      dataType: policy.dataType,
      maxAge: policy.maxAge,
      maxCount: policy.maxCount,
    });
  }

  /**
   * Apply retention policy to data
   */
  applyRetentionPolicy<T extends { timestamp?: string; id?: string }>(
    policyId: string,
    data: T[]
  ): { retained: T[]; removed: T[] } {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) {
      return { retained: data, removed: [] };
    }

    const now = Date.now();
    const retained: T[] = [];
    const removed: T[] = [];

    // Sort by timestamp if available (newest first)
    const sortedData = data.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      let shouldRetain = true;

      // Check age limit
      if (item.timestamp) {
        const age = now - new Date(item.timestamp).getTime();
        if (age > policy.maxAge) {
          shouldRetain = false;
        }
      }

      // Check count limit
      if (retained.length >= policy.maxCount) {
        shouldRetain = false;
      }

      if (shouldRetain) {
        retained.push(item);
      } else {
        removed.push(item);
      }
    }

    telemetryService.emitTelemetry('performance_guardrails', {
      action: 'retention_applied',
      policyId,
      originalCount: data.length,
      retainedCount: retained.length,
      removedCount: removed.length,
    });

    return { retained, removed };
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryStats | null {
    try {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        
        const stats: MemoryStats = {
          usedJSHeapSize: memory.usedJSHeapSize || 0,
          totalJSHeapSize: memory.totalJSHeapSize || 0,
          jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
          timestamp: Date.now(),
          usagePercentage: memory.jsHeapSizeLimit > 0 
            ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 
            : 0,
        };

        return stats;
      }
    } catch (error) {
      console.warn('[PerformanceGuardrailsService] Memory stats unavailable:', error);
    }

    return null;
  }

  /**
   * Get memory pressure level
   */
  getMemoryPressureLevel(): MemoryPressureLevel {
    const stats = this.getCurrentMemoryUsage();
    if (!stats) return 'low';

    const usage = stats.usagePercentage;

    if (usage >= this.config.memoryThresholds.critical) return 'critical';
    if (usage >= this.config.memoryThresholds.high) return 'high';
    if (usage >= this.config.memoryThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Track operation performance
   */
  trackOperation<T>(
    operation: string,
    fn: () => T | Promise<T>
  ): T | Promise<T> {
    const startTime = performance.now();
    const memoryBefore = this.getCurrentMemoryUsage();
    const metricId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const finalize = (result: T, error?: Error): T => {
      const endTime = performance.now();
      const memoryAfter = this.getCurrentMemoryUsage();

      const metric: PerformanceMetrics = {
        id: metricId,
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore: memoryBefore || { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0, timestamp: startTime, usagePercentage: 0 },
        memoryAfter: memoryAfter || { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0, timestamp: endTime, usagePercentage: 0 },
        resourcesAllocated: 0, // Would be calculated from actual resource tracking
        resourcesFreed: 0,
        gcTriggered: false, // Would be detected from memory patterns
      };

      this.addPerformanceMetric(metric);

      if (error) {
        telemetryService.emitTelemetry('performance_guardrails', {
          action: 'operation_failed',
          operation,
          duration: metric.duration,
          error: error.message,
        });
        throw error;
      }

      return result;
    };

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then(res => finalize(res))
          .catch(err => finalize(null as any, err)) as Promise<T>;
      } else {
        return finalize(result);
      }
    } catch (error) {
      return finalize(null as any, error as Error);
    }
  }

  /**
   * Trigger garbage collection hints
   */
  triggerGCHints(): void {
    try {
      // In environments that support it, request garbage collection
      if (typeof global !== 'undefined' && (global as any).gc) {
        (global as any).gc();
      }

      // Clear internal caches if memory pressure is high
      const pressureLevel = this.getMemoryPressureLevel();
      if (pressureLevel === 'high' || pressureLevel === 'critical') {
        this.clearCaches();
      }

      telemetryService.emitTelemetry('performance_guardrails', {
        action: 'gc_hints_triggered',
        memoryPressure: pressureLevel,
      });

    } catch (error) {
      console.warn('[PerformanceGuardrailsService] GC hints failed:', error);
    }
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    averageDuration: number;
    memoryTrend: 'stable' | 'increasing' | 'decreasing';
    slowestOperations: Array<{ operation: string; avgDuration: number }>;
    memoryPressureHistory: MemoryPressureLevel[];
    gcRecommendations: string[];
  } {
    const recentMetrics = this.performanceMetrics.slice(-100); // Last 100 operations
    
    // Average duration
    const averageDuration = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    // Memory trend
    const recentMemoryStats = this.memoryStats.slice(-10);
    let memoryTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    
    if (recentMemoryStats.length >= 3) {
      const first = recentMemoryStats[0].usagePercentage;
      const last = recentMemoryStats[recentMemoryStats.length - 1].usagePercentage;
      const diff = last - first;
      
      if (diff > 5) memoryTrend = 'increasing';
      else if (diff < -5) memoryTrend = 'decreasing';
    }

    // Slowest operations
    const operationStats = new Map<string, { totalDuration: number; count: number }>();
    for (const metric of recentMetrics) {
      const stats = operationStats.get(metric.operation) || { totalDuration: 0, count: 0 };
      stats.totalDuration += metric.duration;
      stats.count++;
      operationStats.set(metric.operation, stats);
    }

    const slowestOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        avgDuration: stats.totalDuration / stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    // Memory pressure history
    const memoryPressureHistory = this.memoryStats.slice(-20).map(stats => {
      const usage = stats.usagePercentage;
      if (usage >= this.config.memoryThresholds.critical) return 'critical';
      if (usage >= this.config.memoryThresholds.high) return 'high';
      if (usage >= this.config.memoryThresholds.medium) return 'medium';
      return 'low';
    }) as MemoryPressureLevel[];

    // GC recommendations
    const gcRecommendations: string[] = [];
    const currentPressure = this.getMemoryPressureLevel();
    
    if (currentPressure === 'critical') {
      gcRecommendations.push('Immediate cleanup required - clear unnecessary caches');
      gcRecommendations.push('Consider reducing data retention periods');
    } else if (currentPressure === 'high') {
      gcRecommendations.push('Schedule incremental cleanup');
      gcRecommendations.push('Monitor memory usage more frequently');
    }

    if (memoryTrend === 'increasing') {
      gcRecommendations.push('Memory usage trending upward - investigate memory leaks');
    }

    return {
      averageDuration,
      memoryTrend,
      slowestOperations,
      memoryPressureHistory,
      gcRecommendations,
    };
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: RetentionPolicy[] = [
      {
        id: 'timeline_data',
        dataType: 'timeline',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxCount: 10000,
        compressionEnabled: true,
        gcFriendlyCleanup: true,
        cleanupBatchSize: 100,
        cleanupIntervalMs: 60000, // 1 minute
      },
      {
        id: 'forecast_history',
        dataType: 'forecast',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        maxCount: 1000,
        compressionEnabled: false,
        gcFriendlyCleanup: true,
        cleanupBatchSize: 50,
        cleanupIntervalMs: 300000, // 5 minutes
      },
      {
        id: 'performance_metrics',
        dataType: 'general',
        maxAge: 60 * 60 * 1000, // 1 hour
        maxCount: 500,
        compressionEnabled: false,
        gcFriendlyCleanup: true,
        cleanupBatchSize: 25,
        cleanupIntervalMs: 600000, // 10 minutes
      },
    ];

    for (const policy of defaultPolicies) {
      this.addRetentionPolicy(policy);
    }
  }

  /**
   * Schedule incremental cleanup for a policy
   */
  private scheduleIncrementalCleanup(policy: RetentionPolicy): void {
    // Clear existing timer if any
    const existingTimer = this.cleanupTimers.get(policy.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Schedule new cleanup timer
    const timer = window.setInterval(() => {
      this.performPolicyCleanup(policy);
    }, policy.cleanupIntervalMs);

    this.cleanupTimers.set(policy.id, timer);
  }

  /**
   * Perform cleanup for a specific policy
   */
  private performPolicyCleanup(policy: RetentionPolicy): void {
    try {
      // Apply retention to internal data based on policy type
      switch (policy.dataType) {
        case 'general':
          if (policy.id === 'performance_metrics') {
            const result = this.applyRetentionPolicy(policy.id, this.performanceMetrics);
            this.performanceMetrics = result.retained;
          }
          break;

        // Add other data type cleanups as needed
      }

      telemetryService.emitTelemetry('performance_guardrails', {
        action: 'policy_cleanup_completed',
        policyId: policy.id,
      });

    } catch (error) {
      console.error('[PerformanceGuardrailsService] Policy cleanup error:', error);
    }
  }

  /**
   * Start performance and memory monitoring
   */
  private startMonitoring(): void {
    // Memory monitoring
    this.memoryMonitorTimer = window.setInterval(() => {
      const stats = this.getCurrentMemoryUsage();
      if (stats) {
        this.addMemoryStats(stats);
        
        // Trigger GC hints if memory pressure is high
        if (stats.usagePercentage > this.config.gcTriggerThreshold * 100) {
          this.triggerGCHints();
        }
      }
    }, this.config.monitoringInterval);

    // Performance observer for navigation and resource timing
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              telemetryService.emitTelemetry('performance_guardrails', {
                action: 'performance_entry',
                entryType: entry.entryType,
                name: entry.name,
                duration: entry.duration,
              });
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('[PerformanceGuardrailsService] Performance observer setup failed:', error);
      }
    }
  }

  /**
   * Add performance metric to tracking
   */
  private addPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceMetrics.push(metric);
    
    // Apply retention policy
    if (this.performanceMetrics.length > this.config.maxPerformanceMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.config.maxPerformanceMetrics);
    }
  }

  /**
   * Add memory stats to tracking
   */
  private addMemoryStats(stats: MemoryStats): void {
    this.memoryStats.push(stats);
    
    // Apply retention policy
    if (this.memoryStats.length > this.config.maxMemoryStats) {
      this.memoryStats = this.memoryStats.slice(-this.config.maxMemoryStats);
    }
  }

  /**
   * Clear internal caches to free memory
   */
  private clearCaches(): void {
    // Clear GC-friendly collections
    const collectionEntries = Array.from(this.gcFriendlyCollections.entries());
    for (const [name, collection] of collectionEntries) {
      const beforeSize = collection.size();
      collection.clear();
      
      telemetryService.emitTelemetry('performance_guardrails', {
        action: 'cache_cleared',
        collectionName: name,
        itemsCleared: beforeSize,
      });
    }

    // Trim internal arrays
    this.performanceMetrics = this.performanceMetrics.slice(-100);
    this.memoryStats = this.memoryStats.slice(-50);
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    // Clear all timers
    const timerValues = Array.from(this.cleanupTimers.values());
    for (const timer of timerValues) {
      clearInterval(timer);
    }
    this.cleanupTimers.clear();

    // Clear monitoring timer
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer);
    }

    // Disconnect performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // Clear all data
    this.clearCaches();
    this.performanceMetrics = [];
    this.memoryStats = [];
  }
}

// Export singleton instance
export const performanceGuardrailsService = new PerformanceGuardrailsService();