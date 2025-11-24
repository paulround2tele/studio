/**
 * Tests for Task Scheduler Service safety improvements
 * Phase 1: Scheduling/Task/Queue Layer Hardening
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../campaignMetrics/telemetryService');
jest.mock('../../../lib/feature-flags-simple');

// Mock the worker constructor
const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn(),
  onmessage: jest.fn(),
  onerror: jest.fn(),
};

(global as unknown).Worker = jest.fn(() => mockWorker);

describe('TaskSchedulerService Safety Improvements', () => {
  let taskScheduler: typeof import('../taskSchedulerService').taskScheduler;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock feature flags
    const featureFlags = await import('../../../lib/feature-flags-simple');
    (featureFlags.isEdgeProcessingEnabled as jest.Mock).mockReturnValue(true);
    
    // Reimport to get fresh instance
    const taskSchedulerModule = await import('../taskSchedulerService');
    taskScheduler = taskSchedulerModule.taskScheduler;
  });

  describe('Queue Safety Operations', () => {
    it('should handle null task retrieval gracefully', async () => {
      const promise = taskScheduler.queueTask('forecast_blend', { test: 'data' });
      
      // Simulate worker unavailable
      (taskScheduler as unknown).workerHealthy = false;
      
      const result = await promise;
      expect(result.executedBy).toBe('fallback');
    });

    it('should clear all timers on queue clear', () => {
      // Queue multiple tasks
      taskScheduler.queueTask('causal_recompute', { data: 1 });
      taskScheduler.queueTask('forecast_blend', { data: 2 });
      
      // Clear queue should not throw
      expect(() => taskScheduler.clearQueue()).not.toThrow();
    });

    it('should handle task timeouts safely', async () => {
      const shortTimeoutPromise = taskScheduler.queueTask(
        'simulation_projection', 
        { test: 'data' }, 
        'high', 
        100 // 100ms timeout
      );

      // Should reject with timeout error
      await expect(shortTimeoutPromise).rejects.toThrow('Task timeout');
    });
  });

  describe('Worker Status Tracking', () => {  
    it('should return valid worker status', () => {
      const status = taskScheduler.getWorkerStatus();
      
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('processingTimeMs');
      expect(status).toHaveProperty('lastHeartbeat');
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.queueLength).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle worker initialization failure', () => {
      // Mock Worker constructor to throw
      (global as unknown).Worker = jest.fn(() => {
        throw new Error('Worker not supported');
      });

      // Should not throw during initialization
      expect(() => {
        const taskSchedulerModule = require('../taskSchedulerService');
        return taskSchedulerModule.taskScheduler;
      }).not.toThrow();
    });

    it('should handle worker message without taskId', () => {
      const service = (taskScheduler as unknown);
      
      // Should not throw when handling malformed message
      expect(() => {
        service.handleWorkerMessage({ data: { success: true } });
      }).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      taskScheduler.queueTask('forecast_blend', { test: 'data' });
      
      expect(() => taskScheduler.destroy()).not.toThrow();
      
      const status = taskScheduler.getWorkerStatus();
      expect(status.queueLength).toBe(0);
    });
  });

  describe('Timer Management', () => {
    it('should track active timers', () => {
      const service = (taskScheduler as unknown);
      const initialTimerCount = service.activeTimers.size;
      
      // Create a timer
      const timer = service.createTimer(() => {}, 1000);
      
      expect(service.activeTimers.size).toBe(initialTimerCount + 1);
      expect(service.activeTimers.has(timer)).toBe(true);
    });

    it('should remove timers when they execute', (done) => {
      const service = (taskScheduler as unknown);
      
      const timer = service.createTimer(() => {
        expect(service.activeTimers.has(timer)).toBe(false);
        done();
      }, 10);
      
      expect(service.activeTimers.has(timer)).toBe(true);
    });
  });
});