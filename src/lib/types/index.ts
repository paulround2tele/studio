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
export type PersonaResponse = components["schemas"]["Persona"];
export type Proxy = components["schemas"]["Proxy"];
export type ProxyStatus = components["schemas"]["ProxyStatus"];
export type GeneratedDomain = components["schemas"]["GeneratedDomain"];
export type DNSValidationResult = components["schemas"]["DNSValidationResult"];
export type HTTPKeywordResult = components["schemas"]["HTTPKeywordResult"];

// Type aliases for enum values
export type CampaignType = Campaign["campaignType"];
export type CampaignStatus = Campaign["status"];
export type PersonaType = Persona["personaType"];
export type ProxyProtocol = Proxy["protocol"];

// Re-export from openapi-extensions for UI-specific types
export type {
  CampaignViewModel,
  CampaignSelectedType,
  DomainGenerationPattern,
  DomainSourceSelectionMode,
  ApiResponse
} from './openapi-extensions';

// Legacy type aliases for backwards compatibility
export type CampaignPhase = CampaignType;
export type CampaignPhaseStatus = CampaignStatus;

// Persona type aliases
export type HttpPersona = PersonaResponse;
export type DnsPersona = PersonaResponse;
export type PersonaStatus = components["schemas"]["Persona"]["status"];

// Configuration details from OpenAPI
export type HTTPConfigDetails = components["schemas"]["HTTPConfigDetails"];
export type DNSConfigDetails = components["schemas"]["DNSConfigDetails"];

// Mock types for missing legacy interfaces (to be replaced with proper implementations)
export interface CampaignValidationItem {
  id: string;
  domainName: string;
  status: string;
  validatedAt?: string;
}

export interface ExtractedContentItem {
  id: string;
  url: string;
  title?: string;
  content: string;
  extractedAt: string;
}

export interface AnalyzeContentInput {
  urls: string[];
  keywords?: string[];
  maxResults?: number;
}

export interface DomainActivityStatus {
  domain: string;
  status: string;
  lastActivity: string;
}

export interface LatestDomainActivity {
  domain: string;
  activity: string;
  timestamp: string;
  campaignId: string;
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