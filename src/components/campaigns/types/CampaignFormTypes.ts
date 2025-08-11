/**
 * LEGACY TYPES - DEPRECATED
 *
 * This file contains legacy form types that are being phased out in favor of
 * the new phase-centric architecture. These types are kept for backward
 * compatibility with existing legacy components that have not yet been migrated.
 *
 * For new development, use SimpleCampaignFormTypes.ts instead.
 *
 * @deprecated Use SimpleCampaignFormTypes.ts for new campaign forms
 */
import type { LeadGenerationCampaign, DNSValidationRequest as DNSValidationRequestModel, HTTPValidationRequest as HTTPValidationRequestModel } from '@/lib/api-client/models';

export type DomainGenerationPattern = "prefix_variable" | "suffix_variable" | "both_variable";
export type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
export type CampaignPhase = LeadGenerationCampaign['currentPhase'];

// Import OpenAPI types for full sequence support (legacy)
export type DNSValidationRequest = DNSValidationRequestModel;
export type HTTPKeywordValidationRequest = HTTPValidationRequestModel;

/**
 * LEGACY CampaignFormValues interface
 *
 * This interface contains all the legacy parameters that were used in the old
 * full-sequence campaign creation workflow. In the new phase-centric architecture,
 * campaigns are created with only basic info and domain generation, then phases
 * are configured individually through the Phase Dashboard.
 *
 * @deprecated Use SimpleCampaignFormValues for new campaign creation
 */
export interface CampaignFormValues {
  name: string;
  description?: string;
  
  // Domain generation (still used)
  generationPattern: DomainGenerationPattern;
  constantPart: string;
  allowedCharSet: string;
  tldsInput: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  maxDomainsToGenerate?: number;
  
  // LEGACY: Full sequence mode - no longer supported in phase-centric architecture
  launchSequence?: boolean;
  fullSequenceMode?: boolean;
  
  // LEGACY: Phase parameters - now configured individually in Phase Dashboard
  dnsValidationParams?: {
    personaIds?: string[];
    rotationIntervalSeconds?: number;
    processingSpeedPerMinute?: number;
    batchSize?: number;
    retryAttempts?: number;
  };
  httpKeywordParams?: {
    personaIds?: string[];
    keywordSetIds?: string[];
    keywords?: string[];
    adHocKeywords?: string[];
    proxyIds?: string[];
    proxyPoolId?: string;
    proxySelectionStrategy?: string;
    targetHttpPorts?: number[];
    rotationIntervalSeconds?: number;
    processingSpeedPerMinute?: number;
    batchSize?: number;
    retryAttempts?: number;
  };
  
  // LEGACY: Domain source configuration - not used in phase-centric workflow
  domainSourceSelectionMode?: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  
  // LEGACY: Campaign tuning parameters - now part of individual phase configuration
  rotationIntervalSeconds?: number;
  processingSpeedPerMinute?: number;
  batchSize?: number;
  retryAttempts?: number;
  targetHttpPorts?: number[];
  
  // LEGACY: Keyword validation configuration - now part of HTTP phase configuration
  targetKeywordsInput?: string;
  
  // LEGACY: Operational assignments - now handled by phase configuration
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode?: string;
}