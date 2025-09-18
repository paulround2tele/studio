/**
 * Performance Services Index
 * Includes Phase 10 and Phase 11 performance services
 */

// Phase 10 services
export { memoryPressureService } from './memoryPressureService';
export { wasmAccelerationService } from './wasmAccelerationService';

// Phase 11 services
export { taskScheduler } from './taskSchedulerService';

export type {
  TaskPriority,
  TaskKind,
  ScheduledTask,
  WorkerStatus,
  TaskResult
} from './taskSchedulerService';