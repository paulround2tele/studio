// Shared types for Campaign Forms to prevent conflicts
import type { components } from '@/lib/api-client/types';

export type DomainGenerationPattern = "prefix_variable" | "suffix_variable" | "both_variable";
export type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
export type CampaignPhase = components['schemas']['Campaign']['currentPhase'];

// Import OpenAPI types for full sequence support
export type DNSValidationRequest = components['schemas']['DNSValidationRequest'];
export type HTTPKeywordValidationRequest = components['schemas']['HTTPKeywordValidationRequest'];

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
  
  // Full sequence mode parameters
  fullSequenceMode?: boolean; // UI toggle for showing advanced options
  dnsValidationParams?: {
    personaIds?: string[];
    rotationIntervalSeconds?: number;
    processingSpeedPerMinute?: number;
    batchSize?: number;
    retryAttempts?: number;
  };
  httpKeywordParams?: {
    personaIds?: string[]; // Required: HTTP personas
    keywordSetIds?: string[]; // Optional: Predefined keyword sets
    keywords?: string[]; // Optional: Custom keywords (from keyword sets)
    adHocKeywords?: string[]; // Optional: Ad-hoc custom keywords
    proxyIds?: string[]; // Optional: Specific proxies to use
    proxyPoolId?: string; // Optional: Proxy pool selection
    proxySelectionStrategy?: string; // Optional: Proxy rotation strategy
    targetHttpPorts?: number[]; // Optional: HTTP ports to target
    rotationIntervalSeconds?: number; // Optional: Proxy rotation interval
    processingSpeedPerMinute?: number; // Optional: Processing speed
    batchSize?: number; // Optional: Batch processing size
    retryAttempts?: number; // Optional: Retry attempts on failure
  };
  
  // Domain source configuration
  domainSourceSelectionMode?: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  // Campaign tuning parameters (legacy - now part of phase params)
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