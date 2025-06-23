// src/types/contract-drift-context.ts
// Frontend/Backend Contract Drift Detection Types

import { z } from 'zod';

/**
 * Contract Drift Detection Schema
 * Real-time validation of frontend/backend contract alignment
 */
export const ContractDriftDetectionSchema = z.object({
  openApiSync: z.object({
    specValidation: z.object({
      specPath: z.string(),
      lastModified: z.string().datetime(),
      schemaVersion: z.string(),
      validationStatus: z.enum(['valid', 'invalid', 'outdated', 'missing'])
    }),
    implementationAlignment: z.object({
      endpointCoverage: z.number().min(0).max(100),
      schemaConsistency: z.number().min(0).max(100),
      responseFormatMatches: z.boolean(),
      requestFormatMatches: z.boolean()
    }),
    driftDetection: z.object({
      missingEndpoints: z.array(z.string()),
      extraEndpoints: z.array(z.string()),
      parameterMismatches: z.array(z.object({
        endpoint: z.string(),
        parameter: z.string(),
        specType: z.string(),
        implementationType: z.string()
      })),
      responseSchemaDrift: z.array(z.object({
        endpoint: z.string(),
        expectedSchema: z.string(),
        actualSchema: z.string(),
        driftSeverity: z.enum(['minor', 'major', 'breaking'])
      }))
    })
  }),
  zodGoConsistency: z.object({
    schemaAlignment: z.object({
      goStructFields: z.array(z.object({
        structName: z.string(),
        fieldName: z.string(),
        goType: z.string(),
        jsonTag: z.string(),
        validationTags: z.array(z.string())
      })),
      zodSchemaFields: z.array(z.object({
        schemaName: z.string(),
        fieldName: z.string(),
        zodType: z.string(),
        validationRules: z.array(z.string())
      })),
      alignmentStatus: z.enum(['aligned', 'minor_drift', 'major_drift', 'completely_misaligned'])
    }),
    typeMapping: z.object({
      mappingRules: z.array(z.object({
        goType: z.string(),
        zodType: z.string(),
        conversionLogic: z.string().optional(),
        precision: z.enum(['exact', 'lossy', 'incompatible'])
      })),
      unmappedTypes: z.array(z.object({
        type: z.string(),
        location: z.enum(['go', 'zod']),
        severity: z.enum(['info', 'warning', 'error'])
      }))
    }),
    validationConsistency: z.object({
      consistentRules: z.array(z.string()),
      inconsistentRules: z.array(z.object({
        field: z.string(),
        goValidation: z.string(),
        zodValidation: z.string(),
        impact: z.enum(['functional', 'validation_only', 'cosmetic'])
      })),
      missingValidations: z.array(z.object({
        field: z.string(),
        missingIn: z.enum(['go', 'zod']),
        recommendedAction: z.string()
      }))
    })
  }),
  safeBigIntValidation: z.object({
    int64OverflowDetection: z.object({
      maxSafeInteger: z.number(),
      detectedOverflows: z.array(z.object({
        field: z.string(),
        value: z.string(),
        endpoint: z.string(),
        timestamp: z.string().datetime()
      })),
      preventionStrategies: z.array(z.object({
        strategy: z.enum(['string_encoding', 'decimal_js', 'custom_serializer']),
        applicableFields: z.array(z.string()),
        implementation: z.string()
      }))
    }),
    precisionLossDetection: z.object({
      affectedFields: z.array(z.object({
        field: z.string(),
        originalPrecision: z.number(),
        resultingPrecision: z.number(),
        lossPercentage: z.number()
      })),
      mitigationStrategies: z.array(z.object({
        field: z.string(),
        strategy: z.string(),
        implementation: z.string()
      }))
    }),
    serialization: z.object({
      safeSerializationMethods: z.array(z.object({
        dataType: z.string(),
        method: z.string(),
        implementation: z.string(),
        compatibility: z.array(z.string())
      })),
      detectedIssues: z.array(z.object({
        issue: z.string(),
        affectedEndpoints: z.array(z.string()),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        resolution: z.string()
      }))
    })
  }),
  enumConsistency: z.object({
    crossLayerEnumValidation: z.object({
      frontendEnums: z.array(z.object({
        name: z.string(),
        values: z.array(z.string()),
        location: z.string()
      })),
      backendEnums: z.array(z.object({
        name: z.string(),
        values: z.array(z.string()),
        location: z.string()
      })),
      databaseEnums: z.array(z.object({
        name: z.string(),
        values: z.array(z.string()),
        constraints: z.array(z.string())
      }))
    }),
    enumMismatches: z.array(z.object({
      enumName: z.string(),
      mismatchType: z.enum(['missing_value', 'extra_value', 'case_mismatch', 'type_mismatch']),
      frontendValue: z.string().optional(),
      backendValue: z.string().optional(),
      databaseValue: z.string().optional(),
      severity: z.enum(['minor', 'major', 'breaking']),
      suggestedResolution: z.string()
    })),
    transformationMaps: z.array(z.object({
      sourceLayer: z.enum(['frontend', 'backend', 'database']),
      targetLayer: z.enum(['frontend', 'backend', 'database']),
      enumName: z.string(),
      mappingRules: z.array(z.object({
        sourceValue: z.string(),
        targetValue: z.string(),
        transformationType: z.enum(['direct', 'case_conversion', 'value_mapping', 'computed'])
      }))
    }))
  }),
  typeTransformations: z.object({
    camelCaseSnakeCaseMapping: z.object({
      transformationRules: z.array(z.object({
        direction: z.enum(['camel_to_snake', 'snake_to_camel']),
        field: z.string(),
        sourceFormat: z.string(),
        targetFormat: z.string(),
        exceptions: z.array(z.string())
      })),
      inconsistencies: z.array(z.object({
        field: z.string(),
        expected: z.string(),
        actual: z.string(),
        context: z.string()
      })),
      automatedCorrections: z.array(z.object({
        field: z.string(),
        correction: z.string(),
        confidence: z.number().min(0).max(100)
      }))
    }),
    nullabilityMapping: z.object({
      mappingRules: z.array(z.object({
        goType: z.string(),
        typescriptType: z.string(),
        nullHandling: z.enum(['required', 'optional', 'nullable', 'undefined']),
        defaultValue: z.any().optional()
      })),
      mismatches: z.array(z.object({
        field: z.string(),
        goNullability: z.string(),
        typescriptNullability: z.string(),
        runtimeIssues: z.boolean()
      }))
    })
  })
});

export type ContractDriftDetection = z.infer<typeof ContractDriftDetectionSchema>;

/**
 * Automated Validation Schema
 * Real-time contract monitoring and validation
 */
export const AutomatedValidationSchema = z.object({
  validationRun: z.object({
    runId: z.string().uuid(),
    timestamp: z.string().datetime(),
    triggerType: z.enum(['scheduled', 'on_commit', 'on_deploy', 'manual']),
    scope: z.enum(['full', 'incremental', 'targeted']),
    duration: z.number().min(0)
  }),
  validationResults: z.object({
    overallStatus: z.enum(['pass', 'warning', 'failure', 'error']),
    testsSuite: z.array(z.object({
      testName: z.string(),
      status: z.enum(['pass', 'fail', 'skip', 'error']),
      duration: z.number(),
      message: z.string().optional(),
      details: z.record(z.any()).optional()
    })),
    contractCoverage: z.object({
      endpointsCovered: z.number(),
      totalEndpoints: z.number(),
      coveragePercentage: z.number().min(0).max(100),
      uncoveredEndpoints: z.array(z.string())
    }),
    regressionDetection: z.array(z.object({
      type: z.enum(['breaking_change', 'deprecation', 'new_requirement', 'removed_feature']),
      component: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high', 'critical']),
      recommendations: z.array(z.string())
    }))
  }),
  continuousMonitoring: z.object({
    monitoringEnabled: z.boolean(),
    checkInterval: z.number().min(60),
    alertingRules: z.array(z.object({
      ruleName: z.string(),
      condition: z.string(),
      severity: z.enum(['info', 'warning', 'error', 'critical']),
      notificationChannels: z.array(z.string())
    })),
    historicalTrends: z.object({
      contractStabilityScore: z.number().min(0).max(100),
      driftFrequency: z.number().min(0),
      resolutionTime: z.object({
        average: z.number().min(0),
        median: z.number().min(0),
        percentile95: z.number().min(0)
      }),
      qualityMetrics: z.array(z.object({
        metric: z.string(),
        value: z.number(),
        trend: z.enum(['improving', 'stable', 'degrading']),
        target: z.number().optional()
      }))
    })
  }),
  remediation: z.object({
    automatedFixes: z.array(z.object({
      issueType: z.string(),
      fixDescription: z.string(),
      automationLevel: z.enum(['fully_automated', 'semi_automated', 'manual_only']),
      safeguards: z.array(z.string()),
      rollbackStrategy: z.string()
    })),
    manualInterventions: z.array(z.object({
      issue: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      estimatedEffort: z.string(),
      requiredSkills: z.array(z.string()),
      dependencies: z.array(z.string())
    })),
    preventionStrategies: z.array(z.object({
      strategy: z.string(),
      implementation: z.string(),
      effectiveness: z.number().min(0).max(100)
    }))
  })
});

export type AutomatedValidation = z.infer<typeof AutomatedValidationSchema>;

/**
 * Schema Synchronization Status
 * Tracks synchronization state across layers
 */
export const SchemaSynchronizationStatusSchema = z.object({
  synchronizationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  layers: z.object({
    frontend: z.object({
      version: z.string(),
      lastUpdated: z.string().datetime(),
      schemaHash: z.string(),
      status: z.enum(['synchronized', 'outdated', 'inconsistent', 'error'])
    }),
    backend: z.object({
      version: z.string(),
      lastUpdated: z.string().datetime(),
      schemaHash: z.string(),
      status: z.enum(['synchronized', 'outdated', 'inconsistent', 'error'])
    }),
    database: z.object({
      version: z.string(),
      lastUpdated: z.string().datetime(),
      schemaHash: z.string(),
      status: z.enum(['synchronized', 'outdated', 'inconsistent', 'error'])
    })
  }),
  syncStatus: z.object({
    overallStatus: z.enum(['fully_synchronized', 'partially_synchronized', 'out_of_sync', 'error']),
    lastSuccessfulSync: z.string().datetime().optional(),
    pendingSyncOperations: z.array(z.object({
      operation: z.string(),
      targetLayer: z.string(),
      estimatedDuration: z.number(),
      dependencies: z.array(z.string())
    })),
    blockingIssues: z.array(z.object({
      issue: z.string(),
      severity: z.enum(['warning', 'error', 'critical']),
      affectedLayers: z.array(z.string()),
      resolution: z.string()
    }))
  }),
  metrics: z.object({
    syncFrequency: z.number().min(0),
    avgSyncDuration: z.number().min(0),
    successRate: z.number().min(0).max(100),
    driftDetectionLatency: z.number().min(0),
    false_positiveRate: z.number().min(0).max(100)
  })
});

export type SchemaSynchronizationStatus = z.infer<typeof SchemaSynchronizationStatusSchema>;