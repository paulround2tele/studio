/**
 * Observability Tracing Service (Phase 10)
 * Client-side task tracing & exportable trace segments
 */

// Feature flag check
const isExtendedTracingEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_EXTENDED_TRACING === 'true';
};

// Types for tracing
export interface TraceSpan {
  id: string;
  parentId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'error';
  attributes: Record<string, unknown>;
  tags: string[];
  logs: TraceLog[];
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface TraceLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

export interface TraceExport {
  spans: TraceSpan[];
  exportedAt: string;
  sessionId: string;
  version: string;
  metadata: {
    totalSpans: number;
    completedSpans: number;
    errorSpans: number;
    timeRange: { start: number; end: number };
  };
}

// Telemetry events
export interface TraceSpanStatsEvent {
  windowMs: number;
  count: number;
  avgDuration: number;
}

/**
 * Tracing Service Class
 */
class TracingService {
  private spans = new Map<string, TraceSpan>();
  private activeSpans = new Set<string>();
  private sessionId: string;
  private maxSpans = 1000;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    if (this.isAvailable()) {
      this.startStatsCollection();
    }
  }

  /**
   * Check if extended tracing is available
   */
  isAvailable(): boolean {
    return isExtendedTracingEnabled();
  }

  /**
   * Start a new trace span
   */
  startSpan(name: string, attributes: Record<string, unknown> = {}, parentId?: string): string {
    if (!this.isAvailable()) {
      return 'noop-span';
    }

    const spanId = this.generateSpanId();
    const span: TraceSpan = {
      id: spanId,
      parentId,
      operation: name,
      startTime: performance.now(),
      status: 'started',
      attributes: { ...attributes },
      tags: [],
      logs: []
    };

    this.spans.set(spanId, span);
    this.activeSpans.add(spanId);

    // Add trace context to attributes
    span.attributes._traceContext = {
      sessionId: this.sessionId,
      spanId,
      parentId
    };

    // Cleanup old spans if we're at the limit
    if (this.spans.size > this.maxSpans) {
      this.cleanupOldSpans();
    }

    return spanId;
  }

  /**
   * End a trace span
   */
  endSpan(spanId: string, status: 'completed' | 'error' = 'completed', error?: { message: string; stack?: string; code?: string }): void {
    if (!this.isAvailable() || spanId === 'noop-span') return;

    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (error) {
      span.error = error;
    }

    this.activeSpans.delete(spanId);
    this.spans.set(spanId, span);
  }

  /**
   * Add attributes to a span
   */
  addSpanAttributes(spanId: string, attributes: Record<string, unknown>): void {
    if (!this.isAvailable() || spanId === 'noop-span') return;

    const span = this.spans.get(spanId);
    if (span) {
      span.attributes = { ...span.attributes, ...attributes };
      this.spans.set(spanId, span);
    }
  }

  /**
   * Add tags to a span
   */
  addSpanTags(spanId: string, tags: string[]): void {
    if (!this.isAvailable() || spanId === 'noop-span') return;

    const span = this.spans.get(spanId);
    if (span) {
      span.tags = [...span.tags, ...tags];
      this.spans.set(spanId, span);
    }
  }

  /**
   * Add log to a span
   */
  addSpanLog(spanId: string, level: TraceLog['level'], message: string, fields?: Record<string, unknown>): void {
    if (!this.isAvailable() || spanId === 'noop-span') return;

    const span = this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: performance.now(),
        level,
        message,
        fields
      });
      this.spans.set(spanId, span);
    }
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): TraceSpan | undefined {
    if (!this.isAvailable()) return undefined;
    return this.spans.get(spanId);
  }

  /**
   * Get all spans
   */
  getAllSpans(): TraceSpan[] {
    if (!this.isAvailable()) return [];
    return Array.from(this.spans.values());
  }

  /**
   * Get recent spans
   */
  getRecentSpans(limit: number = 50): TraceSpan[] {
    if (!this.isAvailable()) return [];

    return Array.from(this.spans.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Export recent trace data
   */
  exportRecent(limit: number = 100): TraceExport {
    if (!this.isAvailable()) {
      return this.getEmptyExport();
    }

    const spans = this.getRecentSpans(limit);
    const completedSpans = spans.filter(s => s.status === 'completed');
    const errorSpans = spans.filter(s => s.status === 'error');
    
    const timeRange = spans.length > 0 ? {
      start: Math.min(...spans.map(s => s.startTime)),
      end: Math.max(...spans.map(s => s.endTime || s.startTime))
    } : { start: 0, end: 0 };

    return {
      spans,
      exportedAt: new Date().toISOString(),
      sessionId: this.sessionId,
      version: '1.0.0',
      metadata: {
        totalSpans: spans.length,
        completedSpans: completedSpans.length,
        errorSpans: errorSpans.length,
        timeRange
      }
    };
  }

  /**
   * Get trace statistics
   */
  getStats(): {
    totalSpans: number;
    activeSpans: number;
    completedSpans: number;
    errorSpans: number;
    averageDuration: number;
    sessionId: string;
  } {
    if (!this.isAvailable()) {
      return {
        totalSpans: 0,
        activeSpans: 0,
        completedSpans: 0,
        errorSpans: 0,
        averageDuration: 0,
        sessionId: this.sessionId
      };
    }

    const spans = Array.from(this.spans.values());
    const completedSpans = spans.filter(s => s.status === 'completed');
    const errorSpans = spans.filter(s => s.status === 'error');
    const spansWithDuration = spans.filter(s => s.duration !== undefined);
    
    const averageDuration = spansWithDuration.length > 0
      ? spansWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / spansWithDuration.length
      : 0;

    return {
      totalSpans: spans.length,
      activeSpans: this.activeSpans.size,
      completedSpans: completedSpans.length,
      errorSpans: errorSpans.length,
      averageDuration,
      sessionId: this.sessionId
    };
  }

  /**
   * Clear all trace data
   */
  clear(): void {
    this.spans.clear();
    this.activeSpans.clear();
  }

  /**
   * Create a trace wrapper for async operations
   */
  traceAsync<T>(name: string, operation: () => Promise<T>, attributes?: Record<string, unknown>): Promise<T> {
    if (!this.isAvailable()) {
      return operation();
    }

    const spanId = this.startSpan(name, attributes);
    
    return operation()
      .then(result => {
        this.endSpan(spanId, 'completed');
        return result;
      })
      .catch(error => {
        this.endSpan(spanId, 'error', {
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          code: error?.code
        });
        throw error;
      });
  }

  /**
   * Create a trace wrapper for sync operations
   */
  traceSync<T>(name: string, operation: () => T, attributes?: Record<string, unknown>): T {
    if (!this.isAvailable()) {
      return operation();
    }

    const spanId = this.startSpan(name, attributes);
    
    try {
      const result = operation();
      this.endSpan(spanId, 'completed');
      return result;
    } catch (error: unknown) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
      
      this.endSpan(spanId, 'error', {
        ...errorDetails,
        code: error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
      });
      throw error;
    }
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.clear();
  }

  /**
   * Generate unique span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup old spans to maintain memory limits
   */
  private cleanupOldSpans(): void {
    const spans = Array.from(this.spans.values());
    
    // Sort by start time and keep only the most recent spans
    const sortedSpans = spans.sort((a, b) => b.startTime - a.startTime);
    const toKeep = sortedSpans.slice(0, Math.floor(this.maxSpans * 0.8));
    
    // Clear and rebuild the spans map
    this.spans.clear();
    toKeep.forEach(span => this.spans.set(span.id, span));
    
    // Update active spans set
    const activeIds = new Set(toKeep.filter(s => s.status === 'started').map(s => s.id));
    this.activeSpans = activeIds;
  }

  /**
   * Start periodic statistics collection
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      this.emitStatsEvent();
    }, 60000); // Every minute
  }

  /**
   * Emit statistics telemetry
   */
  private emitStatsEvent(): void {
    const _stats = this.getStats();
    const recentSpans = this.getRecentSpans(100);
    
    // Calculate stats for the last minute
    const oneMinuteAgo = performance.now() - 60000;
    const recentSpansInWindow = recentSpans.filter(s => s.startTime > oneMinuteAgo);
    
    const avgDuration = recentSpansInWindow.length > 0
      ? recentSpansInWindow.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSpansInWindow.length
      : 0;

    const event: TraceSpanStatsEvent = {
      windowMs: 60000,
      count: recentSpansInWindow.length,
      avgDuration
    };

    if (typeof window !== 'undefined' && window.__telemetryService) {
      const telemetryService = window.__telemetryService;
      telemetryService.emit('trace_span_stats', event);
    }
  }

  /**
   * Get empty export for disabled state
   */
  private getEmptyExport(): TraceExport {
    return {
      spans: [],
      exportedAt: new Date().toISOString(),
      sessionId: this.sessionId,
      version: '1.0.0',
      metadata: {
        totalSpans: 0,
        completedSpans: 0,
        errorSpans: 0,
        timeRange: { start: 0, end: 0 }
      }
    };
  }
}

// Export singleton instance
export const tracingService = new TracingService();

// Availability check function
export const isTracingAvailable = (): boolean => {
  return tracingService.isAvailable();
};

// Convenience functions for common tracing patterns
export const trace = {
  /**
   * Trace a forecast blend operation
   */
  forecastBlend: <T>(operation: () => Promise<T>, attributes?: Record<string, unknown>) => {
    return tracingService.traceAsync('forecast_blend', operation, {
      component: 'forecastBlendService',
      ...attributes
    });
  },

  /**
   * Trace a root cause analysis
   */
  rootCauseAnalysis: <T>(operation: () => Promise<T>, attributes?: Record<string, unknown>) => {
    return tracingService.traceAsync('root_cause_analysis', operation, {
      component: 'rootCauseAnalyticsService',
      ...attributes
    });
  },

  /**
   * Trace a capability diff operation
   */
  capabilityDiff: <T>(operation: () => T, attributes?: Record<string, unknown>) => {
    return tracingService.traceSync('capability_diff', operation, {
      component: 'capabilitiesService',
      ...attributes
    });
  },

  /**
   * Trace a bandit arm selection
   */
  banditSelect: <T>(operation: () => T, attributes?: Record<string, unknown>) => {
    return tracingService.traceSync('bandit_select', operation, {
      component: 'banditService',
      ...attributes
    });
  }
};