// Shared types for Campaign Forms to prevent conflicts
import type { components } from '@/lib/api-client/types';

export type DomainGenerationPattern = "prefix_variable" | "suffix_variable" | "both_variable";
export type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
export type CampaignPhase = components['schemas']['Campaign']['currentPhase'];

// Unified CampaignFormValues interface for phases-based workflow
export interface CampaignFormValues {
  name: string;
  description?: string;
  // Phases-based workflow - all campaigns start with domain generation
  generationPattern: DomainGenerationPattern;
  constantPart: string;
  allowedCharSet: string;
  tldsInput: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  maxDomainsToGenerate?: number;
  launchSequence?: boolean;
  // Domain source configuration
  domainSourceSelectionMode?: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  // Campaign tuning parameters
  rotationIntervalSeconds?: number;
  processingSpeedPerMinute?: number;
  batchSize?: number;
  retryAttempts?: number;
  targetHttpPorts?: number[];
  // Keyword validation configuration
  targetKeywordsInput?: string;
  // Operational assignments
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode?: string;
}