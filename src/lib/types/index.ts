/**
 * Type exports - mapping legacy type names to OpenAPI types
 * This file provides compatibility layer for existing imports
 */

// Re-export OpenAPI types with legacy names for compatibility
export type { components } from '@/lib/api-client/types';

// Core OpenAPI types re-exported
import type { components } from '@/lib/api-client/types';

export type Campaign = components["schemas"]["Campaign"];
export type User = components["schemas"]["User"];
export type Persona = components["schemas"]["Persona"];
export type Proxy = components["schemas"]["Proxy"];
export type GeneratedDomain = components["schemas"]["GeneratedDomain"];
export type DNSValidationResult = components["schemas"]["DNSValidationResult"];
export type HTTPKeywordResult = components["schemas"]["HTTPKeywordResult"];

// Type aliases for enum values
export type CampaignType = NonNullable<Campaign["campaignType"]>;
export type CampaignStatus = Campaign["status"];
export type PersonaType = NonNullable<Persona["personaType"]>;
export type ProxyProtocol = NonNullable<Proxy["protocol"]>;

// UI-specific string union types (corrected to match actual usage)
export type ProxyStatus = "Active" | "Disabled" | "Testing" | "Failed";
export type PersonaStatus = "Active" | "Disabled" | "Testing" | "Failed";

// Re-export from openapi-extensions for UI-specific types
export type {
  CampaignViewModel,
  CampaignSelectedType,
  DomainGenerationPattern,
  DomainSourceSelectionMode
} from './openapi-extensions';

// Unified API Response wrapper for all services
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

// Legacy type aliases for backwards compatibility - with proper null handling
export type CampaignPhase = NonNullable<CampaignType>;
export type CampaignPhaseStatus = CampaignStatus;

// Persona type aliases
export type HttpPersona = Persona;
export type DnsPersona = Persona;

// Configuration details from OpenAPI
export type { HTTPConfigDetails } from '@/lib/api-client/models/httpconfig-details';
export type { DNSConfigDetails } from '@/lib/api-client/models/dnsconfig-details';

// Domain validation items - use OpenAPI GeneratedDomain as base with UI extensions
export interface CampaignValidationItem extends Omit<GeneratedDomain, 'domainName'> {
  id: string;
  domainName: string;
  domain?: string; // Alternative property name for compatibility
  status: string;
  validationStatus?: string;
  validatedAt?: string;
}

// UI-specific content analysis input (different from OpenAPI batch extraction)
export interface AnalyzeContentInput {
  urls: string[];
  content?: string;
  keywords?: string[];
  maxResults?: number;
}

// OpenAPI keyword extraction types for direct API usage
export type BatchKeywordExtractionRequest = components["schemas"]["BatchKeywordExtractionRequest"];
export type KeywordExtractionResult = components["schemas"]["KeywordExtractionAPIResult"];

export type DomainActivityStatus =
  | 'validated'
  | 'pending'
  | 'failed'
  | 'not_validated'
  | 'scanned'
  | 'no_leads'
  | 'generating'
  | 'n_a';

export interface LatestDomainActivity {
  id: string;
  domain: string;
  domainName: string;
  activity: string;
  timestamp: string;
  campaignId: string;
  campaignName: string;
  phase: string;
  status: DomainActivityStatus;
  generatedDate: string;
  dnsStatus: DomainActivityStatus;
  httpStatus: DomainActivityStatus;
  leadScanStatus: DomainActivityStatus;
  leadScore?: number;
  sourceUrl: string;
}

// Domain detail interface for tables
export interface DomainDetail {
  id: string;
  domainName: string;
  generatedDate?: string;
  dnsStatus: DomainActivityStatus;
  httpStatus: DomainActivityStatus;
  leadScanStatus: DomainActivityStatus;
}

// Auth types using OpenAPI base types
export type LoginRequest = components["schemas"]["LoginRequest"];
export type LoginResponse = components["schemas"]["LoginResponse"];
export type RefreshResponse = components["schemas"]["RefreshResponse"];
export type ChangePasswordRequest = components["schemas"]["ChangePasswordRequest"];

// Session management (extending OpenAPI User type)
export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  user?: User;
}

// Role and permission types (UI-specific extensions)
export interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
}