// src/types/domain-status-context.ts
// Multi-State Domain Status Evolution Types

import { z } from 'zod';

/**
 * Domain Status Context Schema
 * Tracks domain lifecycle and status transitions
 */
export const DomainStatusContextSchema = z.object({
  statusFlow: z.object({
    states: z.array(z.enum(['pending', 'fetched', 'verified', 'qualified', 'failed', 'excluded'])),
    transitions: z.array(z.object({
      from: z.string(),
      to: z.string(),
      condition: z.string(),
      automatic: z.boolean(),
      reversible: z.boolean()
    })),
    terminalStates: z.array(z.string()),
    validationRules: z.array(z.object({
      transition: z.string(),
      rules: z.array(z.string()),
      requiredData: z.array(z.string())
    }))
  }),
  campaignLinkage: z.object({
    sourceSelection: z.object({
      allowPreviousCampaigns: z.boolean(),
      statusFilters: z.array(z.string()),
      qualityThresholds: z.record(z.number()),
      excludeFailedDomains: z.boolean(),
      timeWindowLimits: z.object({
        maxAgeInDays: z.number().min(1),
        allowRecent: z.boolean()
      })
    }),
    dataInheritance: z.object({
      preserveMetadata: z.boolean(),
      inheritScores: z.boolean(),
      carryForwardFlags: z.array(z.string()),
      resetFields: z.array(z.string())
    }),
    crossCampaignRules: z.object({
      preventDuplicates: z.boolean(),
      respectCooldownPeriods: z.boolean(),
      prioritizeUntestedDomains: z.boolean(),
      balanceWorkload: z.boolean()
    })
  }),
  statusValidation: z.object({
    stateTransitionRules: z.array(z.object({
      fromState: z.string(),
      toState: z.string(),
      requiredFields: z.array(z.string()),
      validationChecks: z.array(z.string()),
      automaticTriggers: z.array(z.string()),
      manualOverride: z.boolean()
    })),
    dataConsistencyRules: z.array(z.object({
      rule: z.string(),
      scope: z.enum(['single_domain', 'campaign_level', 'cross_campaign']),
      severity: z.enum(['warning', 'error', 'critical']),
      autoCorrection: z.boolean()
    })),
    businessLogicValidation: z.array(z.object({
      validation: z.string(),
      description: z.string(),
      applicableStates: z.array(z.string()),
      failureAction: z.enum(['block', 'warn', 'log', 'auto_correct'])
    }))
  }),
  dataRetention: z.object({
    statusHistoryTracking: z.object({
      enabled: z.boolean(),
      retentionPeriodDays: z.number().min(1),
      compressionAfterDays: z.number().min(1),
      includeMetadata: z.boolean()
    }),
    auditTrail: z.object({
      enabled: z.boolean(),
      trackChanges: z.boolean(),
      trackAccess: z.boolean(),
      retentionPolicy: z.string()
    }),
    archivalRules: z.object({
      archiveAfterDays: z.number().min(1),
      archiveCompletedCampaigns: z.boolean(),
      archiveFailedDomains: z.boolean(),
      compressionLevel: z.enum(['none', 'standard', 'maximum'])
    })
  })
});

export type DomainStatusContext = z.infer<typeof DomainStatusContextSchema>;

/**
 * Domain Status Evolution Schema
 * Tracks individual domain progression through states
 */
export const DomainStatusEvolutionSchema = z.object({
  domainId: z.string().uuid(),
  domainName: z.string(),
  currentStatus: z.enum(['pending', 'fetched', 'verified', 'qualified', 'failed', 'excluded']),
  statusHistory: z.array(z.object({
    status: z.string(),
    timestamp: z.string().datetime(),
    triggeredBy: z.enum(['automatic', 'manual', 'system', 'campaign_rule']),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    previousStatus: z.string().optional()
  })),
  campaignContext: z.object({
    sourceCampaignId: z.string().uuid().optional(),
    currentCampaignId: z.string().uuid(),
    campaignPhase: z.enum(['domain_generation', 'dns_validation', 'http_keyword_validation']),
    inheritedData: z.record(z.any()).optional(),
    processingFlags: z.array(z.string())
  }),
  validationResults: z.object({
    dnsValidation: z.object({
      status: z.enum(['pending', 'passed', 'failed', 'timeout']).optional(),
      results: z.record(z.any()).optional(),
      timestamp: z.string().datetime().optional()
    }),
    httpValidation: z.object({
      status: z.enum(['pending', 'passed', 'failed', 'timeout']).optional(),
      results: z.record(z.any()).optional(),
      timestamp: z.string().datetime().optional()
    }),
    keywordValidation: z.object({
      status: z.enum(['pending', 'passed', 'failed', 'no_content']).optional(),
      score: z.number().min(0).max(100).optional(),
      matchedKeywords: z.array(z.string()).optional(),
      timestamp: z.string().datetime().optional()
    })
  }),
  qualityMetrics: z.object({
    overallScore: z.number().min(0).max(100).optional(),
    contentQualityScore: z.number().min(0).max(100).optional(),
    technicalScore: z.number().min(0).max(100).optional(),
    businessRelevanceScore: z.number().min(0).max(100).optional(),
    riskFactors: z.array(z.string()),
    qualityFlags: z.array(z.string())
  }),
  errorHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    errorType: z.string(),
    errorMessage: z.string(),
    recoverable: z.boolean(),
    retryCount: z.number().min(0),
    resolution: z.string().optional()
  }))
});

export type DomainStatusEvolution = z.infer<typeof DomainStatusEvolutionSchema>;

/**
 * Cross-Campaign Data Flow Schema
 * Manages domain selection and data flow between campaigns
 */
export const CrossCampaignDataFlowSchema = z.object({
  sourceCampaign: z.object({
    campaignId: z.string().uuid(),
    campaignType: z.enum(['domain_generation', 'dns_validation', 'http_keyword_validation']),
    completionStatus: z.enum(['completed', 'partial', 'failed']),
    resultsAvailable: z.boolean(),
    dataQuality: z.enum(['excellent', 'good', 'fair', 'poor'])
  }),
  targetCampaign: z.object({
    campaignId: z.string().uuid(),
    campaignType: z.enum(['dns_validation', 'http_keyword_validation']),
    requirements: z.object({
      minimumDomains: z.number().min(1),
      qualityThreshold: z.number().min(0).max(100),
      statusFilters: z.array(z.string()),
      dataRequirements: z.array(z.string())
    })
  }),
  selectionCriteria: z.object({
    statusBasedFiltering: z.object({
      includeStatuses: z.array(z.string()),
      excludeStatuses: z.array(z.string()),
      priorityOrder: z.array(z.string())
    }),
    qualityBasedFiltering: z.object({
      minimumScore: z.number().min(0).max(100),
      scoringCategories: z.array(z.string()),
      weightedScoring: z.boolean()
    }),
    timeBasedFiltering: z.object({
      maxAge: z.number().min(1),
      preferRecentDomains: z.boolean(),
      excludeStaleData: z.boolean()
    }),
    businessRuleFiltering: z.object({
      excludePreviouslyFailed: z.boolean(),
      respectCooldownPeriods: z.boolean(),
      balanceAcrossCategories: z.boolean()
    })
  }),
  dataTransformation: z.object({
    fieldMapping: z.array(z.object({
      sourceField: z.string(),
      targetField: z.string(),
      transformation: z.enum(['direct', 'computed', 'aggregated', 'derived']),
      transformationLogic: z.string().optional()
    })),
    enrichmentRules: z.array(z.object({
      field: z.string(),
      enrichmentSource: z.enum(['external_api', 'lookup_table', 'computation', 'ai_inference']),
      parameters: z.record(z.any())
    })),
    validationRules: z.array(z.object({
      field: z.string(),
      validationType: z.enum(['format', 'range', 'lookup', 'business_rule']),
      validationLogic: z.string(),
      failureAction: z.enum(['reject', 'warn', 'auto_correct', 'flag'])
    }))
  }),
  flowMetrics: z.object({
    domainsConsidered: z.number().min(0),
    domainsSelected: z.number().min(0),
    domainsRejected: z.number().min(0),
    selectionEfficiency: z.number().min(0).max(100),
    dataQualityScore: z.number().min(0).max(100),
    processingTime: z.number().min(0)
  })
});

export type CrossCampaignDataFlow = z.infer<typeof CrossCampaignDataFlowSchema>;

/**
 * Status Transition Validation Schema
 * Validates state changes and business logic
 */
export const StatusTransitionValidationSchema = z.object({
  domainId: z.string().uuid(),
  proposedTransition: z.object({
    fromStatus: z.string(),
    toStatus: z.string(),
    triggerType: z.enum(['automatic', 'manual', 'system', 'campaign_rule']),
    triggeredBy: z.string(),
    reason: z.string()
  }),
  validationChecks: z.array(z.object({
    checkName: z.string(),
    checkType: z.enum(['prerequisite', 'data_validation', 'business_rule', 'constraint']),
    passed: z.boolean(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    blockingFailure: z.boolean()
  })),
  dataRequirements: z.object({
    requiredFields: z.array(z.string()),
    optionalFields: z.array(z.string()),
    missingFields: z.array(z.string()),
    invalidFields: z.array(z.object({
      field: z.string(),
      reason: z.string(),
      currentValue: z.any()
    }))
  }),
  businessRuleValidation: z.array(z.object({
    rule: z.string(),
    description: z.string(),
    passed: z.boolean(),
    impact: z.enum(['blocking', 'warning', 'informational']),
    remediation: z.string().optional()
  })),
  canProceed: z.boolean(),
  blockers: z.array(z.string()),
  warnings: z.array(z.string()),
  requiresManualApproval: z.boolean()
});

export type StatusTransitionValidation = z.infer<typeof StatusTransitionValidationSchema>;