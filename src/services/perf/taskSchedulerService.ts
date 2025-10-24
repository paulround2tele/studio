/**
 * Task Scheduler Service (Phase 11)
 * Manages worker task queuing with backpressure and fallback handling
 */

import { isEdgeProcessingEnabled as isEdgeProcessing } from '../../lib/feature-flags-simple';
import { telemetryService } from '../campaignMetrics/telemetryService';

// Feature flag check
const isEdgeProcessingEnabled = (): boolean => {
  return isEdgeProcessing();
};

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task kinds supported by edge processor
 */
export type TaskKind = 'causal_recompute' | 'forecast_blend' | 'simulation_projection';

// Strongly typed payloads per task kind
interface CausalRecomputePayload { graphId?: string }
interface ForecastBlendPayload { modelForecasts: Array<{ modelId: string; points: Array<{ timestamp: string; value: number; lower?: number; upper?: number }> }>; metricKey: string; horizon: number }
interface SimulationProjectionPayload { baselineMetrics: Record<string, number> }
type TaskPayloadMap = {
  causal_recompute: CausalRecomputePayload;
  forecast_blend: ForecastBlendPayload;
  simulation_projection: SimulationProjectionPayload;
};
type AnyTaskPayload = TaskPayloadMap[TaskKind];

/**
 * Timer handle for ownership tracking
 */
export type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Discriminated union for task descriptors
 */
export type TaskDescriptor = 
  | { kind: 'forecast'; payload: { modelForecasts: Record<string, unknown>[]; metricKey: string; horizon: number } }
  | { kind: 'metric'; payload: { aggregates: Record<string, number>; classifiedCounts: Record<string, number> } }
  | { kind: 'aggregate'; payload: { baselineMetrics: Record<string, number> } };

/**
 * Result wrapper for safe operations
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Task definition with improved type safety
 */
export interface ScheduledTask {
  id: string;
  kind: TaskKind;
  payload: AnyTaskPayload;
  priority: TaskPriority;
  queuedAt: number;
  timeoutMs: number;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Worker status
 */
export interface WorkerStatus {
  available: boolean;
  currentTask?: string;
  queueLength: number;
  processingTimeMs: number;
  lastHeartbeat: number;
}

/**
 * Task execution result
 */
export interface TaskResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  processingTimeMs: number;
  executedBy: 'worker' | 'fallback';
}

/**
 * Task Scheduler Service Implementation
 */
class TaskSchedulerService {
  private worker?: Worker;
  private taskQueue = new Map<string, ScheduledTask>();
  private pendingTasks = new Set<string>();
  private workerInitialized = false;
  private workerHealthy = true;
  private lastWorkerResponse = 0;
  private readonly WORKER_TIMEOUT_MS = 5000;
  private readonly HEARTBEAT_INTERVAL_MS = 10000;
  private activeTimers = new Set<TimerHandle>();
  
  constructor() {
    this.initializeWorker();
    this.startHealthCheck();
  }

  /**
   * Safe queue task retrieval with null checking
   */
  private safeGetTask(taskId: string): ScheduledTask | null {
    const task = this.taskQueue.get(taskId);
    return task ?? null;
  }

  /**
   * Dequeue operation that returns null for empty queue
   */
  private dequeue(): ScheduledTask | null {
    // Find highest priority task that's not currently pending
    const availableTasks = Array.from(this.taskQueue.values())
      .filter(task => !this.pendingTasks.has(task.id))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority] || a.queuedAt - b.queuedAt;
      });

  return availableTasks.length > 0 ? (availableTasks[0] ?? null) : null;
  }

  /**
   * Runtime assert for task operations
   */
  private assertTaskExists(task: ScheduledTask | null, context: string): asserts task is ScheduledTask {
    if (task === null) {
      throw new Error(`Task not found in ${context}`);
    }
  }

  /**
   * Safe timer creation with ownership tracking
   */
  private createTimer(callback: () => void, delayMs: number): TimerHandle {
    const timer = setTimeout(() => {
      this.activeTimers.delete(timer);
      callback();
    }, delayMs);
    
    this.activeTimers.add(timer);
    return timer;
  }

  /**
   * Clear all active timers
   */
  private clearAllTimers(): void {
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Queue a task for execution
   */
  async queueTask<K extends TaskKind>(
    kind: K,
    payload: TaskPayloadMap[K],
    priority: TaskPriority = 'medium',
    timeoutMs: number = 30000
  ): Promise<unknown> {
    if (!isEdgeProcessingEnabled()) {
      // Fallback to inline execution
      return this.executeInline(kind, payload);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    telemetryService.emitTelemetry('worker_task_scheduled', {
      kind,
      priority,
      queuedMs: Date.now()
    });

  return new Promise<unknown>((resolve, reject) => {
      const task: ScheduledTask = {
        id: taskId,
        kind,
        payload,
        priority,
        queuedAt: Date.now(),
        timeoutMs,
        resolve,
        reject
      };

      this.taskQueue.set(taskId, task);
      this.processQueue();
    });
  }

  /**
   * Get current worker status
   */
  getWorkerStatus(): WorkerStatus {
    return {
      available: this.workerHealthy && this.workerInitialized,
      currentTask: Array.from(this.pendingTasks)[0],
      queueLength: this.taskQueue.size,
      processingTimeMs: this.lastWorkerResponse > 0 ? Date.now() - this.lastWorkerResponse : 0,
      lastHeartbeat: this.lastWorkerResponse
    };
  }

  /**
   * Clear all pending tasks
   */
  clearQueue(): void {
    const tasks = Array.from(this.taskQueue.values());
    for (const task of tasks) {
      task.reject(new Error('Task queue cleared'));
    }
    this.taskQueue.clear();
    this.pendingTasks.clear();
    this.clearAllTimers();
  }

  /**
   * Cleanup service and release resources
   */
  destroy(): void {
    this.clearQueue();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    
    this.workerInitialized = false;
    this.workerHealthy = false;
  }

  /**
   * Initialize the edge processor worker
   */
  private initializeWorker(): void {
    if (typeof Worker === 'undefined') {
      // Not in a browser environment
      this.workerHealthy = false;
      return;
    }

    try {
      // Create worker - fallback for environments without Worker support
      let workerURL: string;
      if (typeof window !== 'undefined' && 'Worker' in window) {
        // Use a static path that will be resolved by the bundler
        workerURL = '/workers/edgeProcessor.worker.js';
      } else {
        throw new Error('Web Workers are not supported in this environment');
      }
      
      this.worker = new Worker(workerURL, { type: 'module' });

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      this.workerInitialized = true;
      this.workerHealthy = true;
      this.lastWorkerResponse = Date.now();

    } catch (error) {
      console.warn('[TaskScheduler] Failed to initialize worker:', error);
      this.workerHealthy = false;
      this.workerInitialized = false;
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const response = event.data;
    this.lastWorkerResponse = Date.now();

    if (!response.taskId) {
      console.warn('[TaskScheduler] Received worker message without taskId:', response);
      return;
    }

    const task = this.safeGetTask(response.taskId);
    if (task === null) {
      console.warn('[TaskScheduler] Received response for unknown task:', response.taskId);
      return;
    }

    // Remove from pending and queue
    this.pendingTasks.delete(response.taskId);
    this.taskQueue.delete(response.taskId);

    // Resolve or reject the task
    if (response.success) {
      task.resolve({
        success: true,
        result: response.result,
        processingTimeMs: response.processingTimeMs,
        executedBy: 'worker' as const
      });
    } else {
      task.reject(new Error(response.error || 'Worker task failed'));
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('[TaskScheduler] Worker error:', error);
    this.workerHealthy = false;

    // Reject all pending tasks and fallback to inline execution
    const pendingTaskIds = Array.from(this.pendingTasks);
    for (const taskId of pendingTaskIds) {
      const task = this.safeGetTask(taskId);
      if (task !== null) {
        this.executeInlineFallback(task);
      }
    }

    this.pendingTasks.clear();

    telemetryService.emitTelemetry('worker_task_fallback', {
      reason: 'worker_error',
      errorMessage: error.message
    });
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    if (!this.workerHealthy || !this.workerInitialized || !this.worker) {
      // Process all queued tasks with inline fallback
      const tasks = Array.from(this.taskQueue.values());
      for (const task of tasks) {
        this.executeInlineFallback(task);
      }
      this.taskQueue.clear();
      return;
    }

    // Check if worker is currently busy (has pending tasks)
    if (this.pendingTasks.size > 0) {
      return; // Worker is busy
    }

    const task = this.dequeue();
    if (task === null) {
      return; // No available tasks
    }
    
    // Check for timeout
    const now = Date.now();
    if (now - task.queuedAt > task.timeoutMs) {
      this.taskQueue.delete(task.id);
      task.reject(new Error('Task timeout'));
      this.processQueue(); // Try next task
      return;
    }

    // Send task to worker
    this.pendingTasks.add(task.id);
    
    const workerTask = {
      id: task.id,
      kind: task.kind,
      payload: task.payload as Record<string, unknown>,
      priority: task.priority,
      timestamp: now
    };

    this.worker.postMessage(workerTask);

    // Set worker response timeout (global) and per-task timeout
    this.createTimer(() => {
      if (this.pendingTasks.has(task.id)) {
        this.pendingTasks.delete(task.id);
        const queuedTask = this.safeGetTask(task.id);
        if (queuedTask !== null) {
          queuedTask.reject(new Error('Task timeout'));
          this.taskQueue.delete(queuedTask.id);
        }
      }
    }, task.timeoutMs);
  }

  /**
   * Execute task inline as fallback
   */
  private async executeInlineFallback(task: ScheduledTask): Promise<void> {
    this.taskQueue.delete(task.id);
    
    try {
      const result = await this.executeInline(task.kind, task.payload);
      task.resolve({
        success: true,
        result,
        processingTimeMs: Date.now() - task.queuedAt,
        executedBy: 'fallback' as const
      });
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error('Inline execution failed'));
    }

    telemetryService.emitTelemetry('worker_task_fallback', {
      kind: task.kind,
      reason: 'timeout_or_unavailable'
    });
  }

  /**
   * Execute task inline (simplified implementations)
   */
  private async executeInline<K extends TaskKind>(kind: K, payload: TaskPayloadMap[K]): Promise<unknown> {
    if (kind === 'causal_recompute') {
      return this.inlineCausalRecompute(payload as CausalRecomputePayload);
    }
    if (kind === 'forecast_blend') {
      return this.inlineForecastBlend(payload as ForecastBlendPayload);
    }
    if (kind === 'simulation_projection') {
      return this.inlineSimulationProjection(payload as SimulationProjectionPayload);
    }
    throw new Error(`Unknown task kind: ${kind}`);
  }

  /**
   * Inline causal recompute (simplified)
   */
  private inlineCausalRecompute(_payload: CausalRecomputePayload): { correlations: []; nodeCount: number; edgeCount: number; computedAt: number; fallback: true } {
    // Simplified version of worker implementation
    return {
      correlations: [],
      nodeCount: 0,
      edgeCount: 0,
      computedAt: Date.now(),
      fallback: true
    };
  }

  /**
   * Inline forecast blend (simplified)
   */
  private inlineForecastBlend(payload: ForecastBlendPayload): {
    blendedPoints: Array<{ timestamp: string; value: number; lower?: number; upper?: number }>; weights: Record<string, number>; metricKey: string; horizon: number; fallback: true
  } {
    const { modelForecasts, metricKey, horizon } = payload;
    
    if (!modelForecasts || modelForecasts.length === 0) {
      return { blendedPoints: [], weights: {}, metricKey, horizon, fallback: true };
    }

    // Simple average blend
    const firstForecast = modelForecasts[0];
    if (!firstForecast) {
      return { blendedPoints: [], weights: {}, metricKey, horizon, fallback: true };
    }
    const blendedPoints = firstForecast.points.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
      lower: point.lower,
      upper: point.upper
    }));

    return {
      blendedPoints,
  weights: { [firstForecast.modelId]: 1.0 },
      metricKey,
      horizon,
      fallback: true
    };
  }

  /**
   * Inline simulation projection (simplified)
   */
  private inlineSimulationProjection(payload: SimulationProjectionPayload): {
    projectedMetrics: Record<string, { baseline: number; projected: number; confidence: number }>; interventionCount: number; seed: string; computedAt: number; fallback: true
  } {
    const baselineMetrics = payload.baselineMetrics || {};
    const projectedMetrics: Record<string, { baseline: number; projected: number; confidence: number }> = {};
    for (const [key, value] of Object.entries(baselineMetrics)) {
      projectedMetrics[key] = {
        baseline: value,
        projected: value, // No change in fallback
        confidence: 0.5
      };
    }

    return {
      projectedMetrics,
      interventionCount: 0,
      seed: 'fallback',
      computedAt: Date.now(),
      fallback: true
    };
  }

  /**
   * Start worker health check
   */
  private startHealthCheck(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Check if worker is responding
      if (this.workerInitialized && (now - this.lastWorkerResponse) > this.HEARTBEAT_INTERVAL_MS * 2) {
        console.warn('[TaskScheduler] Worker appears unresponsive, marking as unhealthy');
        this.workerHealthy = false;
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }
}

// Export singleton instance
export const taskScheduler = new TaskSchedulerService();

// Schedule queue processing asynchronously to allow health flag overrides in tests before execution
setTimeout(() => {
  try {
    // Access private via bracket index to avoid any cast
    (taskScheduler as unknown as { processQueue: () => void }).processQueue();
  } catch {
    // swallow
  }
}, 0);