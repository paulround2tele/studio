/**
 * Metrics Performance Instrumentation (Phase 4)
 * Performance tracking and monitoring for metrics computation
 */

// Feature flags
const ENABLE_PERF_TRACKING = process.env.NODE_ENV === 'development' || 
                            process.env.NEXT_PUBLIC_ENABLE_PERF_TRACKING === 'true';
const MAX_MARKS = 50;
const MAX_MEASURES = 50;

interface PerformanceMark {
  name: string;
  timestamp: number;
  detail?: any;
}

interface PerformanceMeasure {
  name: string;
  startMark: string;
  endMark: string;
  duration: number;
  timestamp: number;
}

interface PerformanceStats {
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  counters: Record<string, number>;
  timings: Record<string, number[]>;
}

// Global performance store
const perfStore: PerformanceStats = {
  marks: [],
  measures: [],
  counters: {},
  timings: {}
};

/**
 * Create a performance mark
 */
export function mark(name: string, detail?: any): void {
  if (!ENABLE_PERF_TRACKING) return;

  const timestamp = performance.now();
  
  const perfMark: PerformanceMark = {
    name,
    timestamp,
    detail
  };

  perfStore.marks.push(perfMark);

  // Trim to max size
  if (perfStore.marks.length > MAX_MARKS) {
    perfStore.marks = perfStore.marks.slice(-MAX_MARKS);
  }

  // Use browser performance API if available
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(name);
    } catch (error) {
      // Ignore errors from duplicate marks
    }
  }
}

/**
 * Create a performance measure between two marks
 */
export function measure(label: string, startMark: string, endMark?: string): number {
  if (!ENABLE_PERF_TRACKING) return 0;

  const now = performance.now();
  const start = perfStore.marks.find(m => m.name === startMark);
  
  let duration = 0;
  let actualEndMark = endMark;

  if (!start) {
    console.warn(`Start mark "${startMark}" not found`);
    return 0;
  }

  if (endMark) {
    const end = perfStore.marks.find(m => m.name === endMark);
    if (!end) {
      console.warn(`End mark "${endMark}" not found`);
      return 0;
    }
    duration = end.timestamp - start.timestamp;
  } else {
    // Use current time as end
    duration = now - start.timestamp;
    actualEndMark = `${label}_auto_end`;
    mark(actualEndMark);
  }

  const measure: PerformanceMeasure = {
    name: label,
    startMark,
    endMark: actualEndMark!,
    duration,
    timestamp: now
  };

  perfStore.measures.push(measure);

  // Trim to max size
  if (perfStore.measures.length > MAX_MEASURES) {
    perfStore.measures = perfStore.measures.slice(-MAX_MEASURES);
  }

  // Store in timing buckets for analysis
  if (!perfStore.timings[label]) {
    perfStore.timings[label] = [];
  }
  perfStore.timings[label].push(duration);

  // Keep only recent timings
  if (perfStore.timings[label].length > 20) {
    perfStore.timings[label] = perfStore.timings[label].slice(-20);
  }

  // Use browser performance API if available
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(label, startMark, actualEndMark);
    } catch (error) {
      // Ignore measurement errors
    }
  }

  return duration;
}

/**
 * Increment a counter
 */
export function incrementCounter(name: string, amount: number = 1): void {
  if (!ENABLE_PERF_TRACKING) return;

  perfStore.counters[name] = (perfStore.counters[name] || 0) + amount;
}

/**
 * Set a counter value
 */
export function setCounter(name: string, value: number): void {
  if (!ENABLE_PERF_TRACKING) return;

  perfStore.counters[name] = value;
}

/**
 * Get counter value
 */
export function getCounter(name: string): number {
  return perfStore.counters[name] || 0;
}

/**
 * Time a function execution
 */
export function timeFunction<T>(
  name: string, 
  fn: () => T, 
  detail?: any
): T {
  if (!ENABLE_PERF_TRACKING) {
    return fn();
  }

  const startMark = `${name}_start`;
  const endMark = `${name}_end`;

  mark(startMark, detail);
  
  try {
    const result = fn();
    mark(endMark);
    measure(name, startMark, endMark);
    return result;
  } catch (error) {
    mark(`${name}_error`);
    measure(`${name}_error`, startMark, `${name}_error`);
    throw error;
  }
}

/**
 * Time an async function execution
 */
export async function timeAsyncFunction<T>(
  name: string, 
  fn: () => Promise<T>, 
  detail?: any
): Promise<T> {
  if (!ENABLE_PERF_TRACKING) {
    return fn();
  }

  const startMark = `${name}_start`;
  const endMark = `${name}_end`;

  mark(startMark, detail);
  
  try {
    const result = await fn();
    mark(endMark);
    measure(name, startMark, endMark);
    return result;
  } catch (error) {
    mark(`${name}_error`);
    measure(`${name}_error`, startMark, `${name}_error`);
    throw error;
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(): PerformanceStats {
  return {
    marks: [...perfStore.marks],
    measures: [...perfStore.measures],
    counters: { ...perfStore.counters },
    timings: { ...perfStore.timings }
  };
}

/**
 * Get timing statistics for a specific operation
 */
export function getTimingStats(operation: string): {
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
} | null {
  const timings = perfStore.timings[operation];
  if (!timings || timings.length === 0) {
    return null;
  }

  const sorted = [...timings].sort((a, b) => a - b);
  const count = timings.length;
  const sum = timings.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const min = sorted[0] ?? 0;
  const max = sorted[count - 1] ?? 0;
  const p95Index = Math.floor(count * 0.95);
  const p95 = sorted[p95Index] ?? max;

  return {
    count,
    average,
    min,
    max,
    p95
  };
}

/**
 * Clear all performance data
 */
export function clearPerformanceData(): void {
  perfStore.marks = [];
  perfStore.measures = [];
  perfStore.counters = {};
  perfStore.timings = {};

  // Clear browser performance entries if available
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      // Ignore errors
    }
  }
}

/**
 * Export performance data for external analysis
 */
export function exportPerformanceData(): string {
  const data = {
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...getPerformanceStats()
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Emit performance event for external monitoring
 */
export function emitPerformanceEvent(eventName: string, detail: any): void {
  if (!ENABLE_PERF_TRACKING || typeof window === 'undefined') return;

  try {
    const event = new CustomEvent('metrics:perf', {
      detail: {
        eventName,
        timestamp: Date.now(),
        ...detail
      }
    });

    window.dispatchEvent(event);
  } catch (error) {
    console.warn('Failed to emit performance event:', error);
  }
}

/**
 * Get memory usage statistics (if available)
 */
export function getMemoryStats(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if (typeof performance === 'undefined' || !('memory' in performance)) {
    return null;
  }

  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
  if (!memory) return null;

  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
  };
}

// Pre-defined performance markers for common operations
export const PerfMarkers = {
  // Metrics computation
  METRICS_COMPUTE_START: 'metrics_compute_start',
  METRICS_COMPUTE_END: 'metrics_compute_end',
  
  // Classification
  CLASSIFICATION_START: 'classification_start',
  CLASSIFICATION_END: 'classification_end',
  
  // Aggregation
  AGGREGATION_START: 'aggregation_start',
  AGGREGATION_END: 'aggregation_end',
  
  // Delta calculation
  DELTA_COMPUTE_START: 'delta_compute_start',
  DELTA_COMPUTE_END: 'delta_compute_end',
  
  // Worker operations
  WORKER_MESSAGE_SENT: 'worker_message_sent',
  WORKER_RESULT_RECEIVED: 'worker_result_received',
  
  // History operations
  HISTORY_SAVE_START: 'history_save_start',
  HISTORY_SAVE_END: 'history_save_end',
  
  // Progress stream
  PROGRESS_CONNECT_START: 'progress_connect_start',
  PROGRESS_CONNECT_END: 'progress_connect_end'
} as const;