// src/types/enum-contract-context.ts
// Enum Contract Management Types

import { z } from 'zod';

/**
 * Enum Contract Context Schema
 * Field-level consistency tracking across layers
 */
export const EnumContractContextSchema = z.object({
  frontendEnums: z.object({
    typescriptEnumDefinitions: z.array(z.object({
      name: z.string(),
      location: z.string(),
      values: z.array(z.object({
        key: z.string(),
        value: z.union([z.string(), z.number()]),
        deprecated: z.boolean().optional(),
        documentation: z.string().optional()
      })),
      enumType: z.enum(['string', 'numeric', 'const_assertion', 'union_type']),
      exportType: z.enum(['named_export', 'default_export', 'const_export']),
      usage: z.array(z.object({
        file: z.string(),
        context: z.string(),
        usageType: z.enum(['type_annotation', 'value_assignment', 'validation', 'comparison'])
      }))
    })),
    validationIntegration: z.object({
      zodEnumUsage: z.array(z.object({
        enumName: z.string(),
        zodSchema: z.string(),
        validationRules: z.array(z.string())
      })),
      formValidation: z.array(z.object({
        enumName: z.string(),
        formFields: z.array(z.string()),
        validationLibrary: z.string()
      }))
    })
  }),
  backendEnums: z.object({
    goConstDefinitions: z.array(z.object({
      name: z.string(),
      packageName: z.string(),
      location: z.string(),
      values: z.array(z.object({
        name: z.string(),
        value: z.union([z.string(), z.number()]),
        iota: z.boolean().optional(),
        comment: z.string().optional()
      })),
      underlyingType: z.string(),
      stringerGenerated: z.boolean(),
      jsonTags: z.object({
        enabled: z.boolean(),
        customMapping: z.record(z.string()).optional()
      }),
      validation: z.object({
        validationTags: z.array(z.string()),
        customValidators: z.array(z.string())
      })
    })),
    databaseIntegration: z.object({
      postgresEnumUsage: z.array(z.object({
        enumName: z.string(),
        columnDefinitions: z.array(z.object({
          table: z.string(),
          column: z.string(),
          nullable: z.boolean()
        })),
        constraints: z.array(z.string())
      })),
      migrationHandling: z.object({
        enumCreationMigrations: z.array(z.string()),
        enumModificationMigrations: z.array(z.string()),
        backwardCompatibility: z.boolean()
      })
    })
  }),
  databaseEnums: z.object({
    postgresqlEnumTypes: z.array(z.object({
      name: z.string(),
      schema: z.string(),
      values: z.array(z.string()),
      usedInTables: z.array(z.object({
        table: z.string(),
        columns: z.array(z.string()),
        constraints: z.array(z.string())
      })),
      dependencies: z.array(z.string()),
      version: z.string().optional()
    })),
    constraintDefinitions: z.array(z.object({
      constraintName: z.string(),
      table: z.string(),
      column: z.string(),
      enumType: z.string(),
      checkConstraint: z.string(),
      errorMessage: z.string().optional()
    }))
  }),
  transformationMaps: z.object({
    crossLayerEnumMapping: z.array(z.object({
      enumName: z.string(),
      mappings: z.array(z.object({
        frontendValue: z.string().optional(),
        backendValue: z.string().optional(),
        databaseValue: z.string().optional(),
        transformationRules: z.array(z.object({
          direction: z.enum(['frontend_to_backend', 'backend_to_frontend', 'backend_to_database', 'database_to_backend']),
          transformation: z.enum(['direct', 'case_conversion', 'value_mapping', 'computed']),
          logic: z.string().optional()
        }))
      })),
      defaultValues: z.object({
        frontend: z.string().optional(),
        backend: z.string().optional(),
        database: z.string().optional()
      }),
      deprecationHandling: z.object({
        deprecatedValues: z.array(z.object({
          value: z.string(),
          layer: z.enum(['frontend', 'backend', 'database']),
          deprecationDate: z.string().datetime(),
          removalDate: z.string().datetime().optional(),
          migrationPath: z.string()
        }))
      })
    })),
    conversionUtilities: z.array(z.object({
      utilityName: z.string(),
      sourceType: z.string(),
      targetType: z.string(),
      conversionLogic: z.string(),
      errorHandling: z.string(),
      testCoverage: z.number().min(0).max(100)
    }))
  }),
  validationRules: z.object({
    enumValueConsistencyChecks: z.array(z.object({
      checkName: z.string(),
      description: z.string(),
      applicableLayers: z.array(z.enum(['frontend', 'backend', 'database'])),
      severity: z.enum(['info', 'warning', 'error', 'critical']),
      automatedDetection: z.boolean(),
      remediation: z.string()
    })),
    crossLayerValidation: z.object({
      validationFrequency: z.enum(['on_commit', 'daily', 'weekly', 'on_deploy', 'manual']),
      validationScope: z.enum(['full', 'changed_enums_only', 'critical_enums_only']),
      reportingFormat: z.enum(['json', 'markdown', 'html', 'pdf']),
      alertingRules: z.array(z.object({
        condition: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        notificationChannels: z.array(z.string())
      }))
    }),
    compatibilityChecks: z.object({
      backwardCompatibility: z.object({
        checkRemovedValues: z.boolean(),
        checkRenamedValues: z.boolean(),
        checkTypeChanges: z.boolean(),
        gracePeriodDays: z.number().min(0)
      }),
      forwardCompatibility: z.object({
        checkNewValues: z.boolean(),
        checkExtendedTypes: z.boolean(),
        autoApproveAdditions: z.boolean(),
        requireExplicitApproval: z.boolean()
      })
    })
  })
});

export type EnumContractContext = z.infer<typeof EnumContractContextSchema>;

/**
 * Cross-Layer Validation Schema
 * Validates enum consistency across frontend, backend, and database
 */
export const CrossLayerValidationSchema = z.object({
  validationRun: z.object({
    runId: z.string().uuid(),
    timestamp: z.string().datetime(),
    scope: z.enum(['full_validation', 'incremental', 'specific_enums']),
    triggeredBy: z.enum(['automated', 'manual', 'ci_cd', 'deployment']),
    duration: z.number().min(0)
  }),
  enumConsistencyResults: z.array(z.object({
    enumName: z.string(),
    overallConsistency: z.enum(['consistent', 'minor_issues', 'major_issues', 'inconsistent']),
    layerComparisons: z.array(z.object({
      fromLayer: z.enum(['frontend', 'backend', 'database']),
      toLayer: z.enum(['frontend', 'backend', 'database']),
      consistencyStatus: z.enum(['consistent', 'inconsistent']),
      issues: z.array(z.object({
        issueType: z.enum(['missing_value', 'extra_value', 'case_mismatch', 'type_mismatch', 'order_mismatch']),
        description: z.string(),
        severity: z.enum(['info', 'warning', 'error', 'critical']),
        recommendedAction: z.string()
      }))
    })),
    valueMapping: z.array(z.object({
      frontendValue: z.string().optional(),
      backendValue: z.string().optional(),
      databaseValue: z.string().optional(),
      mappingStatus: z.enum(['perfect_match', 'case_difference', 'value_difference', 'missing_mapping']),
      transformationRequired: z.boolean(),
      notes: z.string().optional()
    }))
  })),
  detectedDrifts: z.array(z.object({
    driftType: z.enum(['new_enum', 'removed_enum', 'modified_enum', 'usage_change']),
    enumName: z.string(),
    affectedLayers: z.array(z.enum(['frontend', 'backend', 'database'])),
    driftDescription: z.string(),
    impact: z.enum(['breaking', 'non_breaking', 'cosmetic']),
    detectionConfidence: z.number().min(0).max(100),
    recommendedResolution: z.string()
  })),
  complianceStatus: z.object({
    overallCompliance: z.number().min(0).max(100),
    complianceByLayer: z.object({
      frontend: z.number().min(0).max(100),
      backend: z.number().min(0).max(100),
      database: z.number().min(0).max(100)
    }),
    nonCompliantEnums: z.array(z.string()),
    complianceThreshold: z.number().min(0).max(100),
    actionRequired: z.boolean()
  }),
  remediation: z.object({
    automaticFixes: z.array(z.object({
      enumName: z.string(),
      fixType: z.enum(['add_value', 'rename_value', 'case_correction', 'remove_deprecated']),
      fixDescription: z.string(),
      affectedFiles: z.array(z.string()),
      riskLevel: z.enum(['low', 'medium', 'high']),
      rollbackPlan: z.string()
    })),
    manualInterventions: z.array(z.object({
      enumName: z.string(),
      issue: z.string(),
      requiredAction: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      estimatedEffort: z.string(),
      dependencies: z.array(z.string())
    }))
  })
});

export type CrossLayerValidation = z.infer<typeof CrossLayerValidationSchema>;

/**
 * Enum Usage Analytics Schema
 * Tracks enum usage patterns and impact analysis
 */
export const EnumUsageAnalyticsSchema = z.object({
  analysisId: z.string().uuid(),
  analysisDate: z.string().datetime(),
  enumUsagePatterns: z.array(z.object({
    enumName: z.string(),
    usageFrequency: z.object({
      frontend: z.number().min(0),
      backend: z.number().min(0),
      database: z.number().min(0)
    }),
    usageContexts: z.array(z.object({
      context: z.string(),
      layer: z.enum(['frontend', 'backend', 'database']),
      frequency: z.number().min(0),
      criticalPath: z.boolean()
    })),
    changeImpact: z.object({
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
      affectedComponents: z.array(z.string()),
      migrationComplexity: z.enum(['simple', 'moderate', 'complex', 'very_complex']),
      testingRequired: z.array(z.string())
    })
  })),
  trendAnalysis: z.object({
    enumEvolution: z.array(z.object({
      enumName: z.string(),
      changes: z.array(z.object({
        date: z.string().datetime(),
        changeType: z.enum(['added_value', 'removed_value', 'renamed_value', 'deprecated_value']),
        details: z.string(),
        impact: z.string()
      })),
      stabilityScore: z.number().min(0).max(100),
      changeFrequency: z.number().min(0)
    })),
    usageTrends: z.object({
      increasingUsage: z.array(z.string()),
      decreasingUsage: z.array(z.string()),
      stableUsage: z.array(z.string()),
      deprecationCandidates: z.array(z.string())
    })
  }),
  qualityMetrics: z.object({
    consistencyScore: z.number().min(0).max(100),
    maintenanceScore: z.number().min(0).max(100),
    documentationCoverage: z.number().min(0).max(100),
    testCoverage: z.number().min(0).max(100),
    improvementRecommendations: z.array(z.object({
      recommendation: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      effort: z.enum(['low', 'medium', 'high']),
      priority: z.number().min(1).max(10)
    }))
  })
});

export type EnumUsageAnalytics = z.infer<typeof EnumUsageAnalyticsSchema>;