// src/types/concurrency-context.ts
// Streaming & Concurrency Behavior Intelligence Types

import { z } from 'zod';

/**
 * Concurrency Context Schema
 * High-performance processing and streaming patterns
 */
export const ConcurrencyContextSchema = z.object({
  streamingWrites: z.object({
    batchInsertionStrategies: z.object({
      batchSize: z.number().min(1),
      flushInterval: z.number().min(100),
      adaptiveBatching: z.boolean(),
      batchingAlgorithm: z.enum(['fixed_size', 'time_based', 'adaptive', 'hybrid']),
      compressionEnabled: z.boolean(),
      checksumValidation: z.boolean()
    }),
    streamProcessing: z.object({
      bufferSize: z.number().min(1024),
      backpressureStrategy: z.enum(['block', 'drop', 'buffer', 'slow_consumer']),
      flowControl: z.object({
        enabled: z.boolean(),
        highWaterMark: z.number(),
        lowWaterMark: z.number(),
        drainStrategy: z.enum(['pause_source', 'increase_buffer', 'selective_drop'])
      }),
      errorRecovery: z.object({
        retryStrategy: z.enum(['immediate', 'exponential_backoff', 'circuit_breaker']),
        maxRetries: z.number().min(0),
        deadLetterQueue: z.boolean(),
        partialFailureHandling: z.enum(['abort_batch', 'continue_processing', 'isolate_failures'])
      })
    }),
    databaseOptimization: z.object({
      connectionPooling: z.object({
        minConnections: z.number().min(1),
        maxConnections: z.number().min(1),
        idleTimeout: z.number().min(1000),
        connectionValidation: z.boolean()
      }),
      transactionManagement: z.object({
        isolationLevel: z.enum(['read_uncommitted', 'read_committed', 'repeatable_read', 'serializable']),
        timeoutSettings: z.number().min(1000),
        deadlockDetection: z.boolean(),
        autoRetryOnDeadlock: z.boolean()
      }),
      writeOptimization: z.object({
        bulkInsertEnabled: z.boolean(),
        useUpsert: z.boolean(),
        indexOptimization: z.boolean(),
        parallelWrites: z.boolean(),
        writeAheadLogging: z.boolean()
      })
    })
  }),
  rateLimiting: z.object({
    perPersonaConcurrentLimits: z.object({
      maxConcurrentRequests: z.number().min(1),
      rateLimitingAlgorithm: z.enum(['token_bucket', 'leaky_bucket', 'sliding_window', 'fixed_window']),
      burstCapacity: z.number().min(1),
      refillRate: z.number().min(0.1),
      quotaManagement: z.object({
        dailyQuota: z.number().min(-1), // -1 for unlimited
        hourlyQuota: z.number().min(-1),
        resetStrategy: z.enum(['rolling', 'fixed_window', 'sliding_window'])
      })
    }),
    globalLimiting: z.object({
      systemWideLimits: z.object({
        maxGlobalConcurrency: z.number().min(1),
        resourceBasedThrottling: z.boolean(),
        cpuThreshold: z.number().min(0).max(100),
        memoryThreshold: z.number().min(0).max(100)
      }),
      adaptiveThrottling: z.object({
        enabled: z.boolean(),
        responseTimeThreshold: z.number().min(100),
        errorRateThreshold: z.number().min(0).max(100),
        adaptationStrategy: z.enum(['aggressive', 'conservative', 'balanced'])
      }),
      loadShedding: z.object({
        enabled: z.boolean(),
        sheddingStrategy: z.enum(['random', 'fifo', 'priority_based', 'load_based']),
        sheddingThreshold: z.number().min(0).max(100),
        gracefulDegradation: z.boolean()
      })
    }),
    distributedRateLimiting: z.object({
      enabled: z.boolean(),
      coordinationMechanism: z.enum(['redis', 'database', 'gossip_protocol', 'consensus']),
      syncInterval: z.number().min(100),
      toleratePartitions: z.boolean(),
      fairnessAlgorithm: z.enum(['round_robin', 'weighted_fair_queueing', 'deficit_round_robin'])
    })
  }),
  conflictDetection: z.object({
    duplicateDomainHandling: z.object({
      detectionStrategy: z.enum(['exact_match', 'fuzzy_match', 'domain_normalization']),
      resolutionStrategy: z.enum(['first_wins', 'last_wins', 'merge_data', 'manual_review']),
      deduplicationWindow: z.number().min(1),
      similarityThreshold: z.number().min(0).max(1)
    }),
    concurrentModificationDetection: z.object({
      optimisticLocking: z.boolean(),
      pessimisticLocking: z.boolean(),
      versioningStrategy: z.enum(['timestamp', 'version_number', 'hash_based', 'vector_clock']),
      conflictResolution: z.enum(['automatic_merge', 'manual_resolution', 'last_writer_wins', 'first_writer_wins'])
    }),
    dataConsistency: z.object({
      consistencyLevel: z.enum(['eventual', 'strong', 'bounded_staleness', 'session']),
      validationRules: z.array(z.object({
        rule: z.string(),
        scope: z.enum(['single_record', 'related_records', 'global']),
        enforcement: z.enum(['strict', 'advisory', 'best_effort'])
      })),
      repairStrategies: z.array(z.object({
        inconsistencyType: z.string(),
        repairMethod: z.string(),
        automaticRepair: z.boolean()
      }))
    })
  }),
  resourceManagement: z.object({
    memoryOptimization: z.object({
      heapManagement: z.object({
        initialHeapSize: z.string(),
        maxHeapSize: z.string(),
        gcStrategy: z.enum(['parallel', 'concurrent', 'g1', 'cms']),
        gcTuning: z.record(z.any())
      }),
      bufferManagement: z.object({
        bufferPoolSize: z.number().min(1024),
        bufferRecycling: z.boolean(),
        memoryMappedFiles: z.boolean(),
        cacheEvictionPolicy: z.enum(['lru', 'lfu', 'fifo', 'random'])
      }),
      memoryLeakDetection: z.object({
        enabled: z.boolean(),
        detectionThreshold: z.number().min(0).max(100),
        automaticDumps: z.boolean(),
        alertingEnabled: z.boolean()
      })
    }),
    cpuOptimization: z.object({
      threadPoolManagement: z.object({
        corePoolSize: z.number().min(1),
        maxPoolSize: z.number().min(1),
        keepAliveTime: z.number().min(1000),
        queueCapacity: z.number().min(1),
        rejectionPolicy: z.enum(['abort', 'caller_runs', 'discard', 'discard_oldest'])
      }),
      workloadDistribution: z.object({
        loadBalancingStrategy: z.enum(['round_robin', 'least_connections', 'weighted', 'response_time']),
        affinityRules: z.array(z.string()),
        workStealing: z.boolean(),
        dynamicScaling: z.boolean()
      }),
      cpuBoundOptimizations: z.object({
        parallelizationLevel: z.number().min(1),
        chunkingStrategy: z.enum(['fixed_size', 'adaptive', 'work_stealing']),
        forkJoinOptimization: z.boolean(),
        vectorization: z.boolean()
      })
    }),
    ioOptimization: z.object({
      diskIO: z.object({
        bufferSize: z.number().min(1024),
        readAheadSize: z.number().min(1024),
        asyncIO: z.boolean(),
        directIO: z.boolean(),
        compressionEnabled: z.boolean()
      }),
      networkIO: z.object({
        connectionPooling: z.boolean(),
        keepAliveSettings: z.object({
          enabled: z.boolean(),
          idleTime: z.number(),
          interval: z.number(),
          probes: z.number()
        }),
        tcpOptimizations: z.object({
          nagleAlgorithm: z.boolean(),
          tcpWindowScaling: z.boolean(),
          receiveBufferSize: z.number(),
          sendBufferSize: z.number()
        })
      })
    })
  }),
  errorRecovery: z.object({
    partialFailureContinuation: z.object({
      enabled: z.boolean(),
      isolationStrategy: z.enum(['transaction_based', 'domain_based', 'time_based']),
      recoveryStrategy: z.enum(['retry_failed', 'skip_failed', 'manual_intervention']),
      checkpointingEnabled: z.boolean(),
      rollbackCapability: z.boolean()
    }),
    circuitBreakerPatterns: z.object({
      enabled: z.boolean(),
      failureThreshold: z.number().min(1),
      timeout: z.number().min(1000),
      recoveryTimeout: z.number().min(1000),
      halfOpenMaxCalls: z.number().min(1),
      fallbackStrategy: z.enum(['cache', 'default_value', 'alternative_service', 'graceful_degradation'])
    }),
    retryMechanisms: z.object({
      maxRetries: z.number().min(0),
      retryStrategies: z.array(z.object({
        errorType: z.string(),
        strategy: z.enum(['immediate', 'fixed_delay', 'exponential_backoff', 'linear_backoff']),
        baseDelay: z.number().min(0),
        maxDelay: z.number().min(0),
        jitter: z.boolean()
      })),
      deadLetterQueue: z.object({
        enabled: z.boolean(),
        maxRetentionTime: z.number().min(1),
        reprocessingStrategy: z.enum(['manual', 'scheduled', 'triggered']),
        alertingOnDeadLetter: z.boolean()
      })
    }),
    gracefulShutdown: z.object({
      enabled: z.boolean(),
      shutdownTimeout: z.number().min(1000),
      drainingStrategy: z.enum(['immediate', 'graceful', 'force']),
      persistPendingWork: z.boolean(),
      notificationChannels: z.array(z.string())
    })
  })
});

export type ConcurrencyContext = z.infer<typeof ConcurrencyContextSchema>;

/**
 * Performance Monitoring Schema
 * Real-time performance metrics and optimization
 */
export const PerformanceMonitoringSchema = z.object({
  monitoringId: z.string().uuid(),
  timestamp: z.string().datetime(),
  systemMetrics: z.object({
    throughput: z.object({
      requestsPerSecond: z.number().min(0),
      domainsProcessedPerMinute: z.number().min(0),
      bytesProcessedPerSecond: z.number().min(0),
      peakThroughput: z.number().min(0),
      averageThroughput: z.number().min(0)
    }),
    latency: z.object({
      averageResponseTime: z.number().min(0),
      p50ResponseTime: z.number().min(0),
      p95ResponseTime: z.number().min(0),
      p99ResponseTime: z.number().min(0),
      maxResponseTime: z.number().min(0)
    }),
    resourceUtilization: z.object({
      cpuUsage: z.number().min(0).max(100),
      memoryUsage: z.number().min(0).max(100),
      diskUsage: z.number().min(0).max(100),
      networkUtilization: z.number().min(0).max(100),
      connectionPoolUtilization: z.number().min(0).max(100)
    }),
    errorMetrics: z.object({
      errorRate: z.number().min(0).max(100),
      timeoutRate: z.number().min(0).max(100),
      retryRate: z.number().min(0).max(100),
      circuitBreakerTrips: z.number().min(0)
    })
  }),
  performanceBottlenecks: z.array(z.object({
    component: z.string(),
    bottleneckType: z.enum(['cpu_bound', 'io_bound', 'memory_bound', 'network_bound', 'lock_contention']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    impact: z.string(),
    recommendations: z.array(z.string())
  })),
  optimizationOpportunities: z.array(z.object({
    area: z.string(),
    opportunity: z.string(),
    estimatedImpact: z.enum(['low', 'medium', 'high']),
    implementationEffort: z.enum(['low', 'medium', 'high']),
    priority: z.number().min(1).max(10)
  })),
  scalabilityMetrics: z.object({
    horizontalScalability: z.object({
      currentInstances: z.number().min(1),
      optimalInstances: z.number().min(1),
      scalingEfficiency: z.number().min(0).max(100),
      loadDistribution: z.number().min(0).max(100)
    }),
    verticalScalability: z.object({
      resourceEfficiency: z.number().min(0).max(100),
      utilizationOptimality: z.number().min(0).max(100),
      bottleneckFactor: z.number().min(0)
    })
  })
});

export type PerformanceMonitoring = z.infer<typeof PerformanceMonitoringSchema>;