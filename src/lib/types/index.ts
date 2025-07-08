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
  DomainSourceSelectionMode,
  ApiResponse
} from './openapi-extensions';

// Legacy type aliases for backwards compatibility - with proper null handling
export type CampaignPhase = NonNullable<CampaignType>;
export type CampaignPhaseStatus = CampaignStatus;

// Persona type aliases
export type HttpPersona = Persona;
export type DnsPersona = Persona;

// Configuration details from OpenAPI
export type HTTPConfigDetails = components["schemas"]["HTTPConfigDetails"];
export type DNSConfigDetails = components["schemas"]["DNSConfigDetails"];

// Mock types for missing legacy interfaces (to be replaced with proper implementations)
export interface CampaignValidationItem {
  id: string;
  domainName: string;
  domain?: string; // Alternative property name
  status: string;
  validationStatus?: string;
  validatedAt?: string;
}

export interface ExtractedContentItem {
  id: string;
  url: string;
  sourceUrl?: string;
  title?: string;
  content: string;
  text: string; // Legacy property for compatibility
  extractedAt: string;
}

export interface AnalyzeContentInput {
  urls: string[];
  content?: string;
  keywords?: string[];
  maxResults?: number;
}

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

// Auth types (mock for now - should be replaced with proper OpenAPI types)
export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

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