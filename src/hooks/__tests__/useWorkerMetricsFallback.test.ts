/**
 * useWorkerMetricsFallback Tests (Phase 4)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useWorkerMetricsFallback } from '../useWorkerMetricsFallback';
import type { DomainMetricsInput } from '@/types/campaignMetrics';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;
  
  postMessage(message: any) {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        const response = {
          data: {
            type: 'result',
            id: message.id,
            aggregates: {
              totalDomains: message.domains?.length || 0,
              averageScore: 75.5,
              scoredDomains: message.domains?.length || 0,
              validDomains: message.domains?.length || 0
            },
            classifiedCounts: {
              highQuality: Math.floor((message.domains?.length || 0) * 0.2),
              mediumQuality: Math.floor((message.domains?.length || 0) * 0.5),
              lowQuality: Math.floor((message.domains?.length || 0) * 0.3),
              total: message.domains?.length || 0
            },
            timingMs: 150
          }
        };
        this.onmessage(response as MessageEvent);
      }
    }, 10);
  }
  
  terminate() {
    // Mock terminate
  }
}

// Mock Worker constructor
(global as any).Worker = jest.fn().mockImplementation(() => new MockWorker());

// Mock URL.createObjectURL
(global as any).URL = {
  createObjectURL: jest.fn(() => 'mock-url')
};

const originalEnv = process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS;

describe('useWorkerMetricsFallback', () => {
  const createMockDomains = (count: number): DomainMetricsInput[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `domain-${i}`,
      domain_name: `example${i}.com`,
      dns_status: 'ok' as const,
      http_status: 'ok' as const,
      lead_score: 70 + Math.random() * 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS = 'true';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS = originalEnv;
  });

  describe('worker activation threshold', () => {
    it('should not use worker for small domain sets', () => {
      const domains = createMockDomains(100); // Below default threshold of 4000
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      expect(result.current.isUsingWorker).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should use worker for large domain sets', () => {
      const domains = createMockDomains(5000); // Above default threshold
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      expect(result.current.isUsingWorker).toBe(true);
      expect(result.current.isLoading).toBe(true);
    });

    it('should respect custom threshold', () => {
      const domains = createMockDomains(100);
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains, { threshold: 50 })
      );

      expect(result.current.isUsingWorker).toBe(true);
    });
  });

  describe('worker computation', () => {
    it('should compute metrics via worker for large domain sets', async () => {
      const domains = createMockDomains(5000);
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.aggregates.totalDomains).toBe(5000);
      expect(result.current.timingMs).toBeGreaterThan(0);
      expect(result.current.error).toBeNull();
    });

    it('should provide timing information', async () => {
      const domains = createMockDomains(5000);
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.timingMs).toBe(150); // From mock
    });
  });

  describe('error handling', () => {
    it('should handle worker initialization failure', () => {
      // Mock Worker to throw on construction
      (global as any).Worker = jest.fn().mockImplementation(() => {
        throw new Error('Worker not supported');
      });

      const domains = createMockDomains(5000);
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      // Should fall back gracefully
      expect(result.current.isUsingWorker).toBe(true); // Still thinks it should use worker
      expect(result.current.error).not.toBeNull();
    });

    it('should handle worker computation errors', async () => {
      // Mock worker that returns errors
      class ErrorWorker extends MockWorker {
        override postMessage(message: any) {
          setTimeout(() => {
            if (this.onmessage) {
              const response = {
                data: {
                  type: 'error',
                  id: message.id,
                  error: 'Computation failed'
                }
              };
              this.onmessage(response as MessageEvent);
            }
          }, 10);
        }
      }

      (global as any).Worker = jest.fn().mockImplementation(() => new ErrorWorker());

      const domains = createMockDomains(5000);
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.result).toBeNull();
    });
  });

  describe('feature flag disabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_WORKER_METRICS = 'false';
    });

    it('should not use worker when disabled', () => {
      const domains = createMockDomains(10000); // Large set
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      expect(result.current.isUsingWorker).toBe(false);
      expect(result.current.result).toBeNull();
    });
  });

  describe('hook option overrides', () => {
    it('should respect enabled option', () => {
      const domains = createMockDomains(5000);
      
      const { result } = renderHook(() => 
        useWorkerMetricsFallback(domains, { enabled: false })
      );

      expect(result.current.isUsingWorker).toBe(false);
    });

    it('should respect threshold option', () => {
      const domains = createMockDomains(1000);
      
      const { result: resultLowThreshold } = renderHook(() => 
        useWorkerMetricsFallback(domains, { threshold: 500 })
      );

      const { result: resultHighThreshold } = renderHook(() => 
        useWorkerMetricsFallback(domains, { threshold: 2000 })
      );

      expect(resultLowThreshold.current.isUsingWorker).toBe(true);
      expect(resultHighThreshold.current.isUsingWorker).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup worker on unmount', () => {
      const domains = createMockDomains(5000);
      const mockTerminate = jest.fn();
      
      (global as any).Worker = jest.fn().mockImplementation(() => ({
        ...new MockWorker(),
        terminate: mockTerminate
      }));
      
      const { unmount } = renderHook(() => 
        useWorkerMetricsFallback(domains)
      );

      unmount();

      expect(mockTerminate).toHaveBeenCalled();
    });
  });
});