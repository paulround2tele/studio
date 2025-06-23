// src/types/persona-context.ts
// Persona System & Stealth Validation Context Types

import { z } from 'zod';

/**
 * Persona Configuration Intelligence Schema
 * Manages stealth validation and anti-detection strategies
 */
export const PersonaContextSchema = z.object({
  userAgents: z.object({
    strategy: z.enum(['rotation', 'fixed', 'random']),
    pool: z.array(z.string()),
    rotationInterval: z.number().min(1),
    fingerprintRandomization: z.boolean()
  }),
  rateLimits: z.object({
    requestsPerSecond: z.number().min(0.1),
    burstSize: z.number().min(1),
    throttlingStrategy: z.enum(['exponential_backoff', 'fixed_delay', 'adaptive']),
    perPersonaLimits: z.record(z.object({
      rps: z.number(),
      burst: z.number()
    }))
  }),
  jsRendering: z.object({
    enabled: z.boolean(),
    browserProfiles: z.array(z.object({
      name: z.string(),
      userAgent: z.string(),
      viewportSize: z.object({
        width: z.number(),
        height: z.number()
      }),
      deviceScaleFactor: z.number(),
      capabilities: z.array(z.string())
    })),
    renderTimeout: z.number().min(1000),
    resourceBlocking: z.object({
      images: z.boolean(),
      stylesheets: z.boolean(),
      fonts: z.boolean(),
      scripts: z.boolean()
    })
  }),
  proxyProfiles: z.object({
    residentialRotation: z.boolean(),
    ipPoolSize: z.number().min(1),
    rotationStrategy: z.enum(['round_robin', 'random', 'sticky_session']),
    geoTargeting: z.object({
      enabled: z.boolean(),
      allowedCountries: z.array(z.string()),
      preferredRegions: z.array(z.string())
    }),
    failoverRules: z.object({
      maxRetries: z.number().min(1),
      backoffStrategy: z.enum(['linear', 'exponential', 'fixed']),
      excludeFailedProxies: z.boolean()
    })
  }),
  stealthStrategies: z.object({
    fingerprintRandomization: z.object({
      enabled: z.boolean(),
      randomizeHeaders: z.boolean(),
      randomizeTimingPatterns: z.boolean(),
      randomizeTlsFingerprint: z.boolean()
    }),
    behaviorSimulation: z.object({
      enabled: z.boolean(),
      mouseMovePatterns: z.boolean(),
      scrollingSimulation: z.boolean(),
      keyboardPatterns: z.boolean(),
      sessionDuration: z.object({
        min: z.number(),
        max: z.number()
      })
    }),
    requestPatternObfuscation: z.object({
      enabled: z.boolean(),
      jitterDelay: z.object({
        min: z.number(),
        max: z.number()
      }),
      requestOrderRandomization: z.boolean(),
      fakeRequestInjection: z.boolean()
    })
  })
});

export type PersonaContext = z.infer<typeof PersonaContextSchema>;

/**
 * Stealth Fetch Configuration Schema
 * HTTP validation persona profiles and anti-detection
 */
export const StealthFetchConfigSchema = z.object({
  personaId: z.string().uuid(),
  stealthLevel: z.enum(['basic', 'moderate', 'aggressive', 'maximum']),
  detectionAvoidance: z.object({
    userAgentRotation: z.boolean(),
    headerRandomization: z.boolean(),
    timingJitter: z.boolean(),
    connectionReuse: z.boolean(),
    cookieManagement: z.enum(['disable', 'session', 'persistent', 'smart'])
  }),
  requestModification: z.object({
    acceptHeaders: z.array(z.string()),
    acceptLanguage: z.string(),
    acceptEncoding: z.string(),
    customHeaders: z.record(z.string()),
    removeHeaders: z.array(z.string())
  }),
  behaviorSimulation: z.object({
    simulateHumanPauses: z.boolean(),
    randomScrolling: z.boolean(),
    fakeMouseMovements: z.boolean(),
    pageLoadComplete: z.boolean()
  }),
  resourceHandling: z.object({
    loadImages: z.boolean(),
    loadCSS: z.boolean(),
    loadJS: z.boolean(),
    loadFonts: z.boolean(),
    resourceTimeout: z.number()
  })
});

export type StealthFetchConfig = z.infer<typeof StealthFetchConfigSchema>;

/**
 * Anti-Detection Strategy Schema
 * Comprehensive fingerprinting and detection avoidance
 */
export const AntiDetectionStrategySchema = z.object({
  strategyName: z.string(),
  description: z.string(),
  fingerprintingCountermeasures: z.object({
    canvasFingerprinting: z.object({
      enabled: z.boolean(),
      randomization: z.enum(['noise', 'block', 'fake'])
    }),
    webglFingerprinting: z.object({
      enabled: z.boolean(),
      vendorSpoofing: z.boolean(),
      rendererSpoofing: z.boolean()
    }),
    audioFingerprinting: z.object({
      enabled: z.boolean(),
      noiseInjection: z.boolean()
    }),
    screenFingerprinting: z.object({
      enabled: z.boolean(),
      resolutionSpoofing: z.boolean(),
      colorDepthSpoofing: z.boolean()
    })
  }),
  networkLevelProtection: z.object({
    tlsFingerprinting: z.object({
      enabled: z.boolean(),
      cipherSuiteRandomization: z.boolean(),
      protocolVersionSpoofing: z.boolean()
    }),
    httpFingerprinting: z.object({
      enabled: z.boolean(),
      headerOrderRandomization: z.boolean(),
      http2SettingsRandomization: z.boolean()
    }),
    timingAttackPrevention: z.object({
      enabled: z.boolean(),
      requestTimingJitter: z.boolean(),
      responseProcessingDelay: z.boolean()
    })
  }),
  behavioralCountermeasures: z.object({
    clickPatterns: z.object({
      enabled: z.boolean(),
      humanLikeClicks: z.boolean(),
      clickTimingVariation: z.boolean()
    }),
    scrollPatterns: z.object({
      enabled: z.boolean(),
      naturalScrolling: z.boolean(),
      pauseAtContent: z.boolean()
    }),
    navigationPatterns: z.object({
      enabled: z.boolean(),
      organicNavigation: z.boolean(),
      breadcrumbSimulation: z.boolean()
    })
  })
});

export type AntiDetectionStrategy = z.infer<typeof AntiDetectionStrategySchema>;

/**
 * Rate Limiting and Concurrency Context Schema
 * Per-persona concurrent request management
 */
export const ConcurrencyManagementSchema = z.object({
  personaId: z.string().uuid(),
  concurrencyLimits: z.object({
    maxConcurrentRequests: z.number().min(1),
    perDomainLimit: z.number().min(1),
    perIPLimit: z.number().min(1),
    globalLimit: z.number().min(1)
  }),
  rateLimitingRules: z.object({
    requestsPerSecond: z.number().min(0.1),
    burstCapacity: z.number().min(1),
    slidingWindowSize: z.number().min(1000),
    backoffStrategy: z.enum(['linear', 'exponential', 'fibonacci', 'adaptive'])
  }),
  requestQueueManagement: z.object({
    queueSize: z.number().min(1),
    priorityLevels: z.number().min(1),
    timeoutSettings: z.object({
      requestTimeout: z.number(),
      queueTimeout: z.number(),
      retryTimeout: z.number()
    }),
    overflowStrategy: z.enum(['drop_oldest', 'drop_newest', 'reject', 'backpressure'])
  }),
  errorHandling: z.object({
    maxRetries: z.number().min(0),
    retryStrategies: z.array(z.object({
      errorType: z.string(),
      strategy: z.enum(['immediate', 'exponential_backoff', 'fixed_delay', 'circuit_breaker']),
      parameters: z.record(z.any())
    })),
    circuitBreakerSettings: z.object({
      failureThreshold: z.number().min(1),
      timeoutThreshold: z.number().min(1000),
      resetTimeout: z.number().min(1000)
    })
  })
});

export type ConcurrencyManagement = z.infer<typeof ConcurrencyManagementSchema>;