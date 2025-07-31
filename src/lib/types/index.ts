/**
 * Type exports - mapping legacy type names to OpenAPI types
 * This file provides compatibility layer for existing imports
 */

// Re-export OpenAPI types with legacy names for compatibility
export type { components } from '@/lib/api-client/types';

// Core OpenAPI types re-exported
import type { components } from '@/lib/api-client/types';

// Import the proper ErrorInfo and Metadata types from the generated models
import type { ErrorInfo } from '@/lib/api-client/models/error-info';
import type { Metadata } from '@/lib/api-client/models/metadata';

export type Campaign = components["schemas"]["LeadGenerationCampaign"];
export type User = components["schemas"]["User"];
export type Persona = components["schemas"]["Persona"];
export type Proxy = components["schemas"]["Proxy"];
export type GeneratedDomain = components["schemas"]["GeneratedDomain"];
export type DNSValidationResult = components["schemas"]["DNSValidationResult"];
export type HTTPKeywordResult = components["schemas"]["HTTPKeywordResult"];

// Phase-based architecture types (replacing legacy CampaignType and CampaignStatus)
export type CampaignPhase = NonNullable<Campaign["currentPhase"]>;
export type CampaignPhaseStatus = NonNullable<Campaign["phaseStatus"]>;
export type PersonaType = NonNullable<Persona["personaType"]>;
export type ProxyProtocol = NonNullable<Proxy["protocol"]>;

// Legacy compatibility exports - these redirect to phases-only architecture
export type CampaignStatus = CampaignPhaseStatus;
export type CampaignType = CampaignPhase;
export type CampaignTypeEnum = CampaignPhase;

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

// Unified API Response wrapper for all services - Compatible with both string and ErrorInfo
export interface ApiResponse<T = unknown> {
  success: boolean;           // Always boolean, not string
  data?: T;                   // Actual response data
  error?: ErrorInfo | string | null;   // ErrorInfo object OR string for compatibility
  metadata?: Metadata;        // Structured metadata object
  requestId: string;          // UUID for request tracking
}

// Legacy type aliases for backwards compatibility - now using proper OpenAPI definitions
// Note: These are duplicated above but kept for backwards compatibility
export type CampaignPhaseCompat = components['schemas']['LeadGenerationCampaign']['currentPhase'];
export type CampaignPhaseStatusCompat = components['schemas']['LeadGenerationCampaign']['phaseStatus'];

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
  | 'Pending'
  | 'Failed'
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
export type RefreshResponse = components['schemas']['SessionRefreshResponse'];
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

// Pagination types using backend-generated PageInfo and Metadata
export type { PageInfo } from '@/lib/api-client/models/page-info';
export type { Metadata } from '@/lib/api-client/models/metadata';

// Frontend pagination helpers (compatible with backend PageInfo)
export interface PaginationParams {
  current?: number;  // matches backend PageInfo.current
  pageSize?: number; // matches backend PageInfo.pageSize
  count?: number;    // matches backend PageInfo.count
  total?: number;    // matches backend PageInfo.total
}

// Pagination context for different UI areas
export type PaginationContext = 'dashboard' | 'detail' | 'list';

// Default page sizes for different contexts
export const getDefaultPageSize = (context?: PaginationContext): number => {
  switch (context) {
    case 'dashboard': return 50;
    case 'detail': return 100;
    case 'list': return 25;
    default: return 20;
  }
};

// Common pagination options
export const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const;

// Simple pagination state management
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  changePageSize: (size: number) => void;
  reset: () => void;
}

export interface PaginationHook {
  state: PaginationState;
  actions: PaginationActions;
  params: PaginationParams;
}