/**
 * OpenAPI Type Extensions - Minimal UI-specific extensions
 * 
 * This file extends OpenAPI types ONLY with UI-specific properties.
 * All core data contracts use OpenAPI types directly.
 */

import type { components } from '@/lib/api-client/types';

// Core OpenAPI types (re-exported for convenience)
export type Campaign = components["schemas"]["Campaign"];
export type PersonaResponse = components["schemas"]["PersonaResponse"];
export type CreatePersonaRequest = components["schemas"]["CreatePersonaRequest"];
export type UpdatePersonaRequest = components["schemas"]["UpdatePersonaRequest"];
export type CreateCampaignRequest = components["schemas"]["CreateCampaignRequest"];
export type CampaignDetailsResponse = components["schemas"]["CampaignDetailsResponse"];

// Type aliases for UI compatibility (matching OpenAPI enum values exactly)
export type CampaignSelectedType = Campaign["campaignType"];
export type CampaignStatus = Campaign["status"];
export type PersonaType = PersonaResponse["personaType"];

// UI-specific extensions only (NOT replacing OpenAPI types)
export interface CampaignUIExtensions {
  // UI-only fields for form management
  selectedType?: CampaignSelectedType;
  description?: string;
  domainSourceConfig?: {
    type?: string;
    sourceCampaignId?: string;
    sourcePhase?: string;
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
export type CampaignPhase = CampaignSelectedType;

// API Response wrapper for UI compatibility
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{ field?: string; message: string; }>;
}