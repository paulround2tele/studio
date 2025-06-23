// src/types/campaign-flow-context.ts
// Campaign Flow Intelligence Types for DomainFlow MCP Server

import { z } from 'zod';

/**
 * 3-Phase Campaign Flow Awareness Schema
 * Represents the closed-loop architecture of DomainFlow campaigns
 */
export const CampaignPhaseFlowSchema = z.object({
  domainGeneration: z.object({
    outputs: z.literal("generated_domains[]"),
    nextPhase: z.literal("dns_validation"),
    gating: z.literal("completion_required")
  }),
  dnsValidation: z.object({
    inputs: z.literal("validated_domains_from_generation"),
    outputs: z.literal("dns_verified_domains[]"),
    nextPhase: z.literal("http_keyword_validation"),
    gating: z.literal("min_success_threshold")
  }),
  httpKeywordValidation: z.object({
    inputs: z.literal("dns_verified_domains"),
    outputs: z.literal("qualified_leads[]"),
    nextPhase: z.literal("completed"),
    gating: z.literal("keyword_score_threshold")
  })
});

export type CampaignPhaseFlow = z.infer<typeof CampaignPhaseFlowSchema>;

/**
 * Phase Gating Logic Types
 * Controls campaign dependencies and unlocking conditions
 */
export const PhaseGatingRulesSchema = z.object({
  completion_required: z.object({
    type: z.literal("completion_required"),
    description: z.string(),
    condition: z.literal("all_jobs_completed"),
    minimumThreshold: z.number().optional()
  }),
  min_success_threshold: z.object({
    type: z.literal("min_success_threshold"),
    description: z.string(),
    condition: z.literal("success_percentage"),
    minimumThreshold: z.number().min(0).max(100)
  }),
  keyword_score_threshold: z.object({
    type: z.literal("keyword_score_threshold"),
    description: z.string(),
    condition: z.literal("avg_score_threshold"),
    minimumThreshold: z.number().min(0).max(100)
  })
});

export type PhaseGatingRules = z.infer<typeof PhaseGatingRulesSchema>;

/**
 * Campaign Status Evolution Schema
 * Tracks campaign progression through phases
 */
export const CampaignStatusEvolutionSchema = z.object({
  campaignId: z.string().uuid(),
  currentPhase: z.enum(['domain_generation', 'dns_validation', 'http_keyword_validation', 'completed']),
  phaseStatus: z.enum(['pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled']),
  gatingChecks: z.record(z.boolean()),
  transitionHistory: z.array(z.object({
    fromPhase: z.string(),
    toPhase: z.string(),
    timestamp: z.string().datetime(),
    triggeredBy: z.enum(['automatic', 'manual', 'gating_condition']),
    gatingResult: z.boolean().optional()
  })),
  blockedReasons: z.array(z.string()).optional(),
  nextValidTransitions: z.array(z.string())
});

export type CampaignStatusEvolution = z.infer<typeof CampaignStatusEvolutionSchema>;

/**
 * Campaign Data Flow Context
 * Tracks data passing between campaign phases
 */
export const CampaignDataFlowSchema = z.object({
  sourcePhase: z.string(),
  targetPhase: z.string(),
  dataType: z.enum(['generated_domains', 'dns_verified_domains', 'qualified_leads']),
  filterCriteria: z.record(z.any()).optional(),
  transformationRules: z.array(z.object({
    field: z.string(),
    transformation: z.enum(['map', 'filter', 'aggregate', 'validate']),
    parameters: z.record(z.any())
  })).optional(),
  inheritanceRules: z.object({
    preserveFields: z.array(z.string()),
    computedFields: z.array(z.object({
      name: z.string(),
      computation: z.string(),
      dependencies: z.array(z.string())
    }))
  }).optional()
});

export type CampaignDataFlow = z.infer<typeof CampaignDataFlowSchema>;

/**
 * Phase Dependency Validation Schema
 * Validates campaign phase dependencies and prerequisites
 */
export const PhaseDependencyValidationSchema = z.object({
  phase: z.string(),
  dependencies: z.array(z.object({
    type: z.enum(['campaign_completion', 'data_availability', 'resource_readiness']),
    source: z.string(),
    condition: z.string(),
    satisfied: z.boolean(),
    validationTimestamp: z.string().datetime()
  })),
  canProceed: z.boolean(),
  blockers: z.array(z.string())
});

export type PhaseDependencyValidation = z.infer<typeof PhaseDependencyValidationSchema>;