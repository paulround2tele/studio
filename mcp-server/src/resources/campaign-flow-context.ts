// src/resources/campaign-flow-context.ts
// Campaign Flow Intelligence Resource Provider

import { z } from 'zod';
import type { 
  MCPContextProvider, 
  MCPResourceResult, 
  CampaignPhaseFlow, 
  CampaignStatusEvolution,
  PhaseDependencyValidation 
} from '../types/index.js';

/**
 * Campaign Flow Context Resource Provider
 * Provides intelligence about DomainFlow's 3-phase campaign architecture
 */
export class CampaignFlowContextProvider implements MCPContextProvider {
  private campaignFlowRules!: CampaignPhaseFlow;
  private phaseTransitionMatrix!: Record<string, string[]>;
  private gatingConditions!: Record<string, any>;

  constructor() {
    this.initializeCampaignFlowRules();
    this.setupPhaseTransitionMatrix();
    this.defineGatingConditions();
  }

  async getContext(params: Record<string, any>): Promise<MCPResourceResult> {
    const { contextType, campaignId, currentPhase, includeHistory } = params;

    try {
      let contextData: any = {};

      switch (contextType) {
        case 'flow_rules':
          contextData = this.getCampaignFlowRules();
          break;
        case 'phase_transitions':
          contextData = this.getPhaseTransitions(currentPhase);
          break;
        case 'gating_conditions':
          contextData = this.getGatingConditions(currentPhase);
          break;
        case 'campaign_status':
          contextData = await this.getCampaignStatusEvolution(campaignId, includeHistory);
          break;
        case 'dependency_validation':
          contextData = await this.validatePhaseDependencies(campaignId, currentPhase);
          break;
        case 'data_flow_mapping':
          contextData = this.getDataFlowMapping(currentPhase);
          break;
        default:
          contextData = this.getComprehensiveContext(params);
      }

      return {
        uri: `domainflow://campaign-flow/${contextType}`,
        mimeType: 'application/json',
        content: JSON.stringify(contextData, null, 2),
        metadata: {
          provider: 'CampaignFlowContextProvider',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          contextType
        }
      };
    } catch (error) {
      throw new Error(`Failed to get campaign flow context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateContext(context: any): boolean {
    try {
      // Basic validation - could be expanded based on context type
      return typeof context === 'object' && context !== null;
    } catch {
      return false;
    }
  }

  transformContext(context: any, format: string): any {
    switch (format) {
      case 'summary':
        return this.createContextSummary(context);
      case 'detailed':
        return this.createDetailedContext(context);
      case 'validation_report':
        return this.createValidationReport(context);
      default:
        return context;
    }
  }

  private initializeCampaignFlowRules(): void {
    this.campaignFlowRules = {
      domainGeneration: {
        outputs: "generated_domains[]",
        nextPhase: "dns_validation",
        gating: "completion_required"
      },
      dnsValidation: {
        inputs: "validated_domains_from_generation",
        outputs: "dns_verified_domains[]",
        nextPhase: "http_keyword_validation",
        gating: "min_success_threshold"
      },
      httpKeywordValidation: {
        inputs: "dns_verified_domains",
        outputs: "qualified_leads[]",
        nextPhase: "completed",
        gating: "keyword_score_threshold"
      }
    };
  }

  private setupPhaseTransitionMatrix(): void {
    this.phaseTransitionMatrix = {
      'domain_generation': ['dns_validation'],
      'dns_validation': ['http_keyword_validation'],
      'http_keyword_validation': ['completed'],
      'completed': [],
      'failed': [],
      'cancelled': []
    };
  }

  private defineGatingConditions(): void {
    this.gatingConditions = {
      completion_required: {
        type: "completion_required",
        description: "All domain generation jobs must complete successfully",
        condition: "all_jobs_completed",
        validation: (campaign: any) => {
          return campaign.totalJobs === campaign.completedJobs;
        }
      },
      min_success_threshold: {
        type: "min_success_threshold",
        description: "Minimum percentage of domains must pass DNS validation",
        condition: "success_percentage",
        minimumThreshold: 70,
        validation: (campaign: any) => {
          const successRate = (campaign.successfulDomains / campaign.totalDomains) * 100;
          return successRate >= 70;
        }
      },
      keyword_score_threshold: {
        type: "keyword_score_threshold",
        description: "Average keyword score must meet quality threshold",
        condition: "avg_score_threshold",
        minimumThreshold: 60,
        validation: (campaign: any) => {
          return campaign.averageKeywordScore >= 60;
        }
      }
    };
  }

  private getCampaignFlowRules(): any {
    return {
      flowRules: this.campaignFlowRules,
      phaseOrder: ['domain_generation', 'dns_validation', 'http_keyword_validation', 'completed'],
      parallelExecution: false,
      skipPhasesAllowed: false,
      rollbackSupported: true,
      checkpointingEnabled: true
    };
  }

  private getPhaseTransitions(currentPhase?: string): any {
    if (currentPhase) {
      return {
        currentPhase,
        validNextPhases: this.phaseTransitionMatrix[currentPhase] || [],
        allTransitions: this.phaseTransitionMatrix,
        transitionRules: this.getTransitionRules(currentPhase)
      };
    }
    return {
      allTransitions: this.phaseTransitionMatrix,
      transitionMatrix: this.phaseTransitionMatrix
    };
  }

  private getGatingConditions(phase?: string): any {
    if (phase) {
      const phaseGating = this.campaignFlowRules[phase as keyof CampaignPhaseFlow]?.gating;
      return {
        phase,
        gatingType: phaseGating,
        condition: this.gatingConditions[phaseGating],
        allGatingConditions: this.gatingConditions
      };
    }
    return this.gatingConditions;
  }

  private async getCampaignStatusEvolution(campaignId?: string, includeHistory: boolean = false): Promise<any> {
    // In a real implementation, this would fetch from the database
    // For now, returning a structure that shows the expected format
    return {
      campaignId: campaignId || 'example-campaign-id',
      currentPhase: 'dns_validation',
      phaseStatus: 'running',
      gatingChecks: {
        completion_required: true,
        min_success_threshold: false,
        keyword_score_threshold: false
      },
      transitionHistory: includeHistory ? [
        {
          fromPhase: 'domain_generation',
          toPhase: 'dns_validation',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          triggeredBy: 'automatic',
          gatingResult: true
        }
      ] : [],
      nextValidTransitions: ['http_keyword_validation', 'failed', 'cancelled'],
      blockedReasons: ['DNS validation success rate below 70%']
    };
  }

  private async validatePhaseDependencies(campaignId?: string, phase?: string): Promise<PhaseDependencyValidation> {
    // In a real implementation, this would validate actual campaign dependencies
    return {
      phase: phase || 'dns_validation',
      dependencies: [
        {
          type: 'campaign_completion',
          source: 'domain_generation_campaign',
          condition: 'all_jobs_completed',
          satisfied: true,
          validationTimestamp: new Date().toISOString()
        },
        {
          type: 'data_availability',
          source: 'generated_domains',
          condition: 'minimum_domain_count >= 100',
          satisfied: true,
          validationTimestamp: new Date().toISOString()
        },
        {
          type: 'resource_readiness',
          source: 'dns_personas',
          condition: 'at_least_one_active_persona',
          satisfied: true,
          validationTimestamp: new Date().toISOString()
        }
      ],
      canProceed: true,
      blockers: []
    };
  }

  private getDataFlowMapping(phase?: string): any {
    const dataFlowMap = {
      domain_generation: {
        inputs: ['domain_patterns', 'tld_list', 'generation_params'],
        outputs: ['generated_domains'],
        transformations: ['pattern_expansion', 'duplicate_removal', 'validation'],
        nextPhaseMapping: {
          target: 'dns_validation',
          dataTransfer: 'generated_domains -> dns_validation_queue',
          filtering: 'active_domains_only'
        }
      },
      dns_validation: {
        inputs: ['generated_domains', 'dns_personas', 'validation_settings'],
        outputs: ['dns_validation_results', 'verified_domains'],
        transformations: ['dns_lookup', 'result_scoring', 'status_assignment'],
        nextPhaseMapping: {
          target: 'http_keyword_validation',
          dataTransfer: 'verified_domains -> http_validation_queue',
          filtering: 'resolved_domains_only'
        }
      },
      http_keyword_validation: {
        inputs: ['verified_domains', 'http_personas', 'keyword_rules'],
        outputs: ['http_validation_results', 'qualified_leads'],
        transformations: ['content_fetch', 'keyword_extraction', 'lead_scoring'],
        nextPhaseMapping: {
          target: 'completed',
          dataTransfer: 'qualified_leads -> campaign_results',
          filtering: 'qualified_leads_only'
        }
      }
    };

    return phase ? dataFlowMap[phase as keyof typeof dataFlowMap] : dataFlowMap;
  }

  private getTransitionRules(phase: string): any {
    const rules = {
      domain_generation: [
        'All generation jobs must complete',
        'At least 1 domain must be generated',
        'No critical errors in generation process'
      ],
      dns_validation: [
        'Minimum success threshold must be met (70%)',
        'At least 1 domain must resolve successfully',
        'DNS personas must be available and functional'
      ],
      http_keyword_validation: [
        'HTTP personas must be available',
        'Keyword rules must be configured',
        'Minimum average score threshold must be achievable'
      ]
    };

    return rules[phase as keyof typeof rules] || [];
  }

  private getComprehensiveContext(params: any): any {
    return {
      campaignFlowRules: this.getCampaignFlowRules(),
      phaseTransitions: this.getPhaseTransitions(),
      gatingConditions: this.getGatingConditions(),
      dataFlowMapping: this.getDataFlowMapping(),
      systemCapabilities: {
        supportsRollback: true,
        supportsCheckpointing: true,
        supportsParallelPhases: false,
        supportsSkipPhases: false,
        supportsManualGating: true
      },
      performanceMetrics: {
        averagePhaseTransitionTime: '2-5 minutes',
        typicalCampaignDuration: '15-45 minutes',
        resourceRequirements: {
          cpu: 'moderate',
          memory: 'moderate',
          network: 'high'
        }
      }
    };
  }

  private createContextSummary(context: any): any {
    return {
      summary: 'DomainFlow 3-Phase Campaign Architecture',
      phases: ['Domain Generation', 'DNS Validation', 'HTTP Keyword Validation'],
      currentPhase: context.currentPhase || 'unknown',
      gatingStatus: context.gatingChecks || {},
      canProceed: context.canProceed || false
    };
  }

  private createDetailedContext(context: any): any {
    return {
      ...context,
      detailedFlowRules: this.campaignFlowRules,
      detailedGatingConditions: this.gatingConditions,
      troubleshootingGuide: {
        commonIssues: [
          'DNS validation stuck below threshold',
          'HTTP personas unavailable',
          'Keyword rules not configured'
        ],
        resolutionSteps: [
          'Check persona availability',
          'Verify network connectivity',
          'Review gating thresholds'
        ]
      }
    };
  }

  private createValidationReport(context: any): any {
    return {
      validationResults: {
        phaseConfiguration: 'valid',
        gatingConditions: 'valid',
        dataFlowMapping: 'valid',
        dependencies: 'satisfied'
      },
      recommendations: [
        'Monitor DNS success rates closely',
        'Ensure adequate persona pool',
        'Configure keyword rules before HTTP phase'
      ],
      warnings: context.blockedReasons || [],
      nextSteps: context.nextValidTransitions || []
    };
  }
}