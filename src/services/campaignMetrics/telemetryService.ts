/**
 * Telemetry Service (Phase 5)
 * Sampling-based metrics collection for Phase 5 features
 */

// Declare process for Node.js environment variables
declare const process: any;

// Feature flag for telemetry
const isTelemetryEnabled = () => {
  const sampling = parseFloat(process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING || '0');
  return sampling > 0;
};

const getTelemetrySampling = (): number => {
  return parseFloat(process.env.NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING || '0.25');
};

/**
 * Telemetry event schema (metrics-v1 + Phase 8 + Phase 9)
 */
export interface TelemetryEvent {
  type: 'timeline_hydrate' | 'anomaly_detect' | 'worker_task' | 'stream_pool_state' | 'export_generated' | 
        'domain_resolution' | 'domain_validation_fail' | 'capability_version_change' | 'forecast_request' | 'fetch_error' |
        'session_start' | 
        // Phase 8 event types
        'stream_quality_update' | 'governance_action' | 'recommendation_mix' | 'degradation_tier' | 'data_quality_flag' |
        'forecast_arbitration' | 'multi_model_comparison' | 'cohort_segmentation' | 'optimistic_reconciliation' |
        'snapshot_compaction' | 'quantile_synthesis' |
        // Phase 9 event types
        'model_registered' | 'model_performance_updated' | 'forecast_blended' | 'forecast_blend_fallback' |
        'root_cause_analysis_completed' | 'action_queued' | 'action_queue_processed' | 'connection_restored' |
        'connection_lost' | 'governance_event_recorded' | 'offline_cache_set' | 'offline_data_cleared' |
        'sse_capability_connected' | 'sse_capability_error' | 'sse_capability_disconnected' |
        'capability_update_applied' | 'capability_update_rejected' | 'capability_rollback_applied' |
        'manual_capability_rollback' | 'domain_health_updated' | 'propagation_rule_added' |
        'propagation_rule_removed' | 'health_propagated' | 'health_event_emitted' | 'critical_cache_refresh';
  timestamp: string;
  sessionId: string;
  data: Record<string, any>;
}

/**
 * Specific telemetry event data types
 */
export interface TimelineHydrateEvent {
  campaignId: string;
  serverCount: number;
  mergedCount: number;
  durationMs: number;
}

export interface AnomalyDetectEvent {
  campaignId: string;
  anomalies: number;
}

export interface WorkerTaskEvent {
  taskType: string;
  queueTimeMs: number;
  execTimeMs: number;
  domains: number;
  hadPrevious: boolean;
}

export interface StreamPoolStateEvent {
  url: string;
  refCount: number;
  missedHeartbeats?: number;
  status?: string;
}

export interface ExportGeneratedEvent {
  type: 'json' | 'csv' | 'bundle';
  snapshots: number;
  sizeMB: number;
  version?: number; // Phase 7: Track export schema version
}

/**
 * Phase 7 telemetry event types
 */
export interface DomainResolutionEvent {
  domain: 'forecast' | 'anomalies' | 'recommendations' | 'timeline' | 'benchmarks';
  mode: 'server' | 'client-fallback' | 'skip';
}

export interface DomainValidationFailEvent {
  domain: string;
  reason: string;
}

export interface CapabilityVersionChangeEvent {
  key: string;
  oldVersion: string;
  newVersion: string;
}

export interface ForecastRequestEvent {
  requested: number;
  clamped: number;
}

export interface FetchErrorEvent {
  endpoint: string;
  category: 'network' | 'server' | 'validation' | 'timeout';
  status?: number;
  attempt: number;
}

/**
 * Phase 8 telemetry event types
 */
export interface StreamQualityUpdateEvent {
  streamId: string;
  qualityScore: number; // 0-100
  metricsCount: number;
  latencyMs?: number;
  errorRate?: number;
}

export interface GovernanceActionEvent {
  action: 'normalization_toggle' | 'horizon_override' | 'cohort_mode_change' | 'metric_intervention';
  context: {
    campaignId?: string;
    metricKey?: string;
    oldValue?: any;
    newValue?: any;
    userId?: string;
  };
}

export interface RecommendationMixEvent {
  counts: {
    server: number;
    experimental: number;
    anomalyAugmented: number;
  };
  totalRecommendations: number;
}

export interface DegradationTierEvent {
  tier: 0 | 1 | 2; // 0=full, 1=partial, 2=minimal
  missingDomains: string[];
  availableDomains: string[];
}

export interface DataQualityFlagEvent {
  campaignId: string;
  flags: ('out_of_order' | 'negative_derivative' | 'stagnation' | 'low_variance')[];
  affectedMetrics: string[];
}

export interface ForecastArbitrationEvent {
  selectedModel: 'server' | 'client_holt_winters' | 'client_exp_smoothing';
  modelScores: {
    model: string;
    mae: number;
    mape: number;
    confidence: number;
  }[];
  horizon: number;
}

export interface MultiModelComparisonEvent {
  models: {
    name: string;
    method: 'server' | 'client';
    mae: number;
    mape: number;
    executionTimeMs: number;
  }[];
  primaryModel: string;
  secondaryModel?: string;
}

export interface CohortSegmentationEvent {
  mode: 'launchWindow' | 'performanceTier';
  cohortCount: number;
  totalCampaigns: number;
  segmentationTimeMs: number;
}

export interface OptimisticReconciliationEvent {
  provisionalUpdates: number;
  reconciledUpdates: number;
  conflicts: number;
  reconciliationTimeMs: number;
}

export interface SnapshotCompactionEvent {
  originalPoints: number;
  compactedPoints: number;
  compressionRatio: number;
  compactionTimeMs: number;
  strategy: 'lttb' | 'rolling_average';
}

export interface QuantileSynthesisEvent {
  synthesizedBands: number;
  baseVariance: number;
  synthesisTimeMs: number;
  method: 'residual_variance' | 'bootstrap';
}

/**
 * Telemetry service class
 */
class TelemetryService {
  private sessionId: string;
  private isInSample: boolean;
  private eventQueue: TelemetryEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private maxQueueSize = 100;
  private flushIntervalMs = 30000; // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isInSample = this.checkSampling();
    
    if (this.isInSample) {
      this.startFlushInterval();
      // Expose to global for other services
      if (typeof window !== 'undefined') {
        (window as any).__telemetryService = this;
      }
    }
  }

  /**
   * Initialize telemetry service
   */
  public initTelemetry(): void {
    if (!isTelemetryEnabled()) {
      return;
    }

    console.log(`[Telemetry] Initialized with sampling rate: ${getTelemetrySampling()}, in sample: ${this.isInSample}`);
    
    if (this.isInSample) {
      this.emitTelemetry('session_start', {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit a telemetry event
   */
  public emitTelemetry(
    type: TelemetryEvent['type'],
    data: Record<string, any>
  ): void {
    if (!isTelemetryEnabled() || !this.isInSample) {
      return;
    }

    const event: TelemetryEvent = {
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data
    };

    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Emit timeline hydration event
   */
  public emitTimelineHydrate(data: TimelineHydrateEvent): void {
    this.emitTelemetry('timeline_hydrate', data);
  }

  /**
   * Emit anomaly detection event
   */
  public emitAnomalyDetect(data: AnomalyDetectEvent): void {
    this.emitTelemetry('anomaly_detect', data);
  }

  /**
   * Emit worker task event
   */
  public emitWorkerTask(data: WorkerTaskEvent): void {
    this.emitTelemetry('worker_task', data);
  }

  /**
   * Emit stream pool state event
   */
  public emitStreamPoolState(data: StreamPoolStateEvent): void {
    this.emitTelemetry('stream_pool_state', data);
  }

  /**
   * Emit export generated event
   */
  public emitExportGenerated(data: ExportGeneratedEvent): void {
    this.emitTelemetry('export_generated', data);
  }

  /**
   * Flush events to backend
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to backend telemetry endpoint
      const response = await fetch('/api/v2/telemetry/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'metrics-v1',
          events
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Telemetry flush failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('[Telemetry] Failed to flush events:', error);
      // Re-queue events with limit to prevent memory issues
      if (this.eventQueue.length < this.maxQueueSize / 2) {
        this.eventQueue.unshift(...events.slice(-10)); // Keep only last 10 failed events
      }
    }
  }

  /**
   * Start automatic flushing
   */
  private startFlushInterval(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }

  /**
   * Check if this session is in the sampling group
   */
  private checkSampling(): boolean {
    const samplingRate = getTelemetrySampling();
    if (samplingRate <= 0) return false;
    if (samplingRate >= 1) return true;

    // Use session ID for consistent sampling
    const hash = this.hashString(this.sessionId);
    return (hash % 100) / 100 < samplingRate;
  }

  /**
   * Simple hash function for consistent sampling
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get recent events for debugging
   */
  public getRecentEvents(limit: number = 10): TelemetryEvent[] {
    return this.eventQueue.slice(-limit);
  }

  /**
   * Get telemetry status
   */
  public getStatus(): {
    enabled: boolean;
    inSample: boolean;
    sessionId: string;
    queueSize: number;
    samplingRate: number;
  } {
    return {
      enabled: isTelemetryEnabled(),
      inSample: this.isInSample,
      sessionId: this.sessionId,
      queueSize: this.eventQueue.length,
      samplingRate: getTelemetrySampling()
    };
  }

  /**
   * Destroy telemetry service
   */
  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    if (this.eventQueue.length > 0) {
      this.flush();
    }

    // Clean up global reference
    if (typeof window !== 'undefined' && (window as any).__telemetryService === this) {
      delete (window as any).__telemetryService;
    }
  }
}

// Create and export singleton instance
export const telemetryService = new TelemetryService();

/**
 * Initialize telemetry service (call once at app startup)
 */
export function initTelemetry(): void {
  telemetryService.initTelemetry();
}

/**
 * Emit telemetry event (convenience function)
 */
export function emitTelemetry(
  type: TelemetryEvent['type'],
  data: Record<string, any>
): void {
  telemetryService.emitTelemetry(type, data);
}

/**
 * Check if telemetry is available
 */
export function isTelemetryAvailable(): boolean {
  return isTelemetryEnabled();
}

/**
 * Get telemetry status
 */
export function getTelemetryStatus(): ReturnType<TelemetryService['getStatus']> {
  return telemetryService.getStatus();
}