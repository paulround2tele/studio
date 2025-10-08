/**
 * Worker Coordinator (Phase 5)
 * Queue-based worker management with cancellation support
 */

import { DomainMetricsInput } from '@/types/campaignMetrics';

// Feature flag from Phase 4
const isWorkerEnabled = () => 
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_WORKER_METRICS !== 'false';

/**
 * Extended worker message types for Phase 5
 */
export interface ExtendedWorkerMessage {
  type: 'compute' | 'computeAll' | 'result' | 'error' | 'cancel';
  id?: string;
  domains?: DomainMetricsInput[];
  previousDomains?: DomainMetricsInput[];
  includeMovers?: boolean;
  aggregates?: Record<string, number>;
  classifiedCounts?: Record<string, number>;
  movers?: Record<string, unknown>[];
  deltas?: Record<string, number>;
  error?: string;
  timings?: {
    queueTimeMs: number;
    execTimeMs: number;
    total: number;
  };
}

/**
 * Worker task queue item with improved type safety
 */
interface WorkerTask {
  id: string;
  message: ExtendedWorkerMessage;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  queuedAt: number;
  startedAt?: number;
  timeout?: number;
}

/**
 * Result wrapper for safe worker operations
 */
type WorkerResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Worker coordinator class
 */
class WorkerCoordinator {
  private worker: Worker | null = null;
  private taskQueue: WorkerTask[] = [];
  private currentTask: WorkerTask | null = null;
  private isProcessing = false;
  private requestIdCounter = 0;

  /**
   * Safe task retrieval with null checking
   */
  private safeGetCurrentTask(): WorkerTask | null {
    return this.currentTask;
  }

  /**
   * Safe task queue operations
   */
  private safeDequeue(): WorkerTask | null {
    return this.taskQueue.shift() ?? null;
  }

  /**
   * Runtime assert for task operations
   */
  private assertTaskExists(task: WorkerTask | null, context: string): asserts task is WorkerTask {
    if (task === null) {
      throw new Error(`Task not found in ${context}`);
    }
  }

  /**
   * Initialize the worker
   */
  private initWorker(): void {
    if (this.worker || !isWorkerEnabled()) {
      return;
    }

    try {
      this.worker = new Worker('/workers/metricsWorker.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
    } catch (error) {
      console.warn('[WorkerCoordinator] Failed to initialize worker:', error);
    }
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(event: MessageEvent<ExtendedWorkerMessage>): void {
    const { type, id, error, ...result } = event.data;

    const currentTask = this.safeGetCurrentTask();
    if (currentTask === null || currentTask.id !== id) {
      console.warn('[WorkerCoordinator] Received message for unknown task:', id);
      return;
    }

    const task = currentTask;
    this.currentTask = null;

    // Calculate timing
    const now = Date.now();
    const queueTimeMs = (task.startedAt || now) - task.queuedAt;
    const execTimeMs = now - (task.startedAt || now);

    if (type === 'result') {
      task.resolve({
        ...result,
        timings: {
          queueTimeMs,
          execTimeMs,
          total: queueTimeMs + execTimeMs
        }
      });
    } else if (type === 'error') {
      task.reject(new Error(error || 'Worker computation failed'));
    }

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('[WorkerCoordinator] Worker error:', error);
    
    const currentTask = this.safeGetCurrentTask();
    if (currentTask !== null) {
      currentTask.reject(new Error('Worker encountered an error'));
      this.currentTask = null;
    }

    // Clear queue and restart worker
    this.taskQueue.forEach(task => {
      task.reject(new Error('Worker failed, task cancelled'));
    });
    this.taskQueue = [];
    
    this.restartWorker();
  }

  /**
   * Restart the worker
   */
  private restartWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    setTimeout(() => {
      this.initWorker();
    }, 1000); // Wait 1 second before restarting
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.isProcessing || this.currentTask || this.taskQueue.length === 0 || !this.worker) {
      return;
    }

    this.isProcessing = true;
    const task = this.safeDequeue();
    if (task === null) {
      this.isProcessing = false;
      return;
    }

    this.currentTask = task;
    task.startedAt = Date.now();

    try {
      this.worker.postMessage(task.message);
    } catch (error) {
      console.error('[WorkerCoordinator] Failed to send message to worker:', error);
      task.reject(new Error('Failed to communicate with worker'));
      this.currentTask = null;
      this.processNextTask();
    }

    this.isProcessing = false;
  }

  /**
   * Queue a computation task
   */
  public queueTask(
    domains: DomainMetricsInput[],
    previousDomains?: DomainMetricsInput[],
    includeMovers?: boolean
  ): Promise<any> {
    if (!isWorkerEnabled()) {
      return Promise.reject(new Error('Worker metrics disabled'));
    }

    this.initWorker();

    return new Promise((resolve, reject) => {
      const taskId = `task_${++this.requestIdCounter}_${Date.now()}`;
      
      const message: ExtendedWorkerMessage = {
        type: 'computeAll',
        id: taskId,
        domains,
        previousDomains,
        includeMovers
      };

      const task: WorkerTask = {
        id: taskId,
        message,
        resolve,
        reject,
        queuedAt: Date.now()
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Cancel all pending tasks
   */
  public cancelAllTasks(): void {
    this.taskQueue.forEach(task => {
      if (task) {
        task.reject(new Error('Task cancelled'));
      }
    });
    this.taskQueue = [];

    if (this.currentTask) {
      // Send cancel message to worker
      if (this.worker) {
        try {
          this.worker.postMessage({
            type: 'cancel',
            id: this.currentTask.id
          });
        } catch (error) {
          console.warn('[WorkerCoordinator] Failed to send cancel message:', error);
        }
      }
      
      this.currentTask.reject(new Error('Task cancelled'));
      this.currentTask = null;
    }
  }

  /**
   * Cancel a specific task
   */
  public cancelTask(taskId: string): boolean {
    // Remove from queue if not started
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
  const task = this.taskQueue.splice(queueIndex, 1)[0];
  if (task) task.reject(new Error('Task cancelled'));
      return true;
    }

    // Cancel current task if it matches
    if (this.currentTask?.id === taskId) {
      if (this.worker) {
        try {
          this.worker.postMessage({
            type: 'cancel',
            id: taskId
          });
        } catch (error) {
          console.warn('[WorkerCoordinator] Failed to send cancel message:', error);
        }
      }
      
      this.currentTask.reject(new Error('Task cancelled'));
      this.currentTask = null;
      this.processNextTask();
      return true;
    }

    return false;
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTaskId: string | null;
  } {
    return {
      queueLength: this.taskQueue.length,
      isProcessing: this.currentTask !== null,
      currentTaskId: this.currentTask?.id || null
    };
  }

  /**
   * Destroy the coordinator
   */
  public destroy(): void {
    this.cancelAllTasks();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Export singleton instance
export const workerCoordinator = new WorkerCoordinator();

/**
 * High-level interface for computing all metrics
 */
export async function computeAllMetrics(
  domains: DomainMetricsInput[],
  previousDomains?: DomainMetricsInput[],
  includeMovers: boolean = false
): Promise<{
  aggregates: Record<string, number>;
  classifiedCounts: Record<string, number>;
  movers?: Record<string, unknown>[];
  deltas?: Record<string, number>;
  timings: {
    queueTimeMs: number;
    execTimeMs: number;
    total: number;
  };
}> {
  return workerCoordinator.queueTask(domains, previousDomains, includeMovers);
}

/**
 * Check if worker coordinator is available
 */
export function isWorkerCoordinatorAvailable(): boolean {
  return isWorkerEnabled();
}