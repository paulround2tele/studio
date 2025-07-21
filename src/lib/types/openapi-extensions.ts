/**
 * OpenAPI Type Extensions - Minimal UI-specific extensions
 * 
 * This file extends OpenAPI types ONLY with UI-specific properties.
 * All core data contracts use OpenAPI types directly.
 */

import type { components } from '@/lib/api-client/types';

// Core OpenAPI types (re-exported for convenience)
export type Campaign = components["schemas"]["Campaign"];
export type PersonaResponse = components["schemas"]["Persona"];
export type CreatePersonaRequest = components["schemas"]["CreatePersonaRequest"];
export type UpdatePersonaRequest = components["schemas"]["UpdatePersonaRequest"];
export type CreateCampaignRequest = components["schemas"]["CreateCampaignRequest"];
export type { CampaignDetailsResponse } from '@/lib/api-client/models/campaign-details-response';

// Type aliases for UI compatibility (using phases-only architecture)
export type CampaignSelectedType = Campaign["currentPhase"];
export type CampaignStatus = Campaign["phaseStatus"];
export type PersonaType = PersonaResponse["personaType"];

// UI-specific extensions only (NOT replacing OpenAPI types)
export interface CampaignUIExtensions {
  // UI-only fields for form management
  selectedType?: CampaignSelectedType;
  description?: string;
  domainSourceConfig?: {
    type?: string;
    sourceCampaignId?: string;
    sourcePhase?: CampaignPhase;
    uploadedDomains?: string[];
  };
  domainGenerationConfig?: {
    generationPattern?: string;
    constantPart?: string;
    allowedCharSet?: string;
    tlds?: string[];
    prefixVariableLength?: number;
    suffixVariableLength?: number;
    maxDomainsToGenerate?: number;
  };
  leadGenerationSpecificConfig?: {
    targetKeywords?: string[];
    scrapingRateLimit?: {
      requests: number;
      per: string;
    };
    requiresJavaScriptRendering?: boolean;
  };
  initialDomainsToProcessCount?: number;
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignment?: {
    mode: string;
    proxyId?: string;
  };
  // Legacy campaign param access
  dnsValidationParams?: {
    rotationIntervalSeconds?: number;
    processingSpeedPerMinute?: number;
    batchSize?: number;
    retryAttempts?: number;
  };
  httpKeywordValidationParams?: {
    rotationIntervalSeconds?: number;
    processingSpeedPerMinute?: number;
    batchSize?: number;
    retryAttempts?: number;
    targetHttpPorts?: number[];
  };
}

// Extended Campaign type for UI (extends OpenAPI Campaign)
export type CampaignViewModel = Campaign & CampaignUIExtensions;

// Form-specific types
export type DomainGenerationPattern = "prefix_variable" | "suffix_variable" | "both_variable" | "constant_only";
export type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
export type CampaignPhase = components['schemas']['Campaign']['currentPhase'];

// Note: ApiResponse moved to main types/index.ts for unified usage across all services