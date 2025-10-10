/**
 * Types for Phase 1 UI Refactor Components
 */

// Campaign domain interface (lightweight for refactor components)
export interface CampaignDomain {
  id: string;
  domain_name: string;
  dns_status: DomainStatus;
  http_status: DomainStatus;
  lead_score: number;
  created_at: string;
  updated_at: string;
}

// Domain status enum
export type DomainStatus = 'pending' | 'ok' | 'error' | 'timeout';

// Campaign phase execution status
export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

// Campaign phase execution interface
export interface CampaignPhaseExecution {
  phase: string;
  status: PhaseStatus;
  progress_percentage?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

// Execution mode enum - matches backend CampaignModeEnum
export type ExecutionMode = 'manual' | 'auto';

// Wizard step data interfaces
export interface WizardGoalStep {
  campaignName?: string;
  description?: string;
  executionMode?: ExecutionMode;
}

export interface WizardPatternStep {
  basePattern?: string;
  variations?: string[];
  maxDomains?: number;
  tld?: string;
  variableLength?: number;
  characterSet?: string;
}

export interface WizardTargetingStep {
  keywords?: string[];
  dnsPersonas?: string[];
  httpPersonas?: string[];
  excludeExtensions?: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

export interface WizardReviewStep {
  goal: WizardGoalStep;
  pattern: WizardPatternStep;
  targeting: WizardTargetingStep;
}

// Complete wizard state
export interface CampaignWizardState {
  currentStep: number;
  goal: Partial<WizardGoalStep>;
  pattern: Partial<WizardPatternStep>;
  targeting: Partial<WizardTargetingStep>;
  isValid: boolean;
}

// Classification bucket for domain analysis
export interface ClassificationBucket {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

// Pipeline segment for visualization
export interface PipelineSegment {
  phase: string;
  status: PhaseStatus;
  count: number;
  percentage: number;
  color: string;
}

// KPI data for campaign overview
export interface CampaignKpi {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  format?: 'number' | 'percentage' | 'currency' | 'duration';
}