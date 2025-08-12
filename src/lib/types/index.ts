/**
 * PROFESSIONAL TYPE SYSTEM - Reality-Based Architecture
 * Aligned with actual backend schema from OpenAPI generation
 * 
 * CRITICAL: All types now map to ACTUAL backend schemas, not fantasies
 */

import type { components } from '@/lib/api-client/types';

// ✅ CORE BACKEND TYPES - ACTUAL SCHEMA PATHS
export type APIResponse = components["schemas"]["api.APIResponse"];
export type User = components["schemas"]["github_com_fntelecomllc_studio_backend_internal_models.User"];
export type CreateCampaignRequest = components["schemas"]["services.CreateLeadGenerationCampaignRequest"];
export type PersonaResponse = components["schemas"]["api.PersonaResponse"];
export type CreatePersonaRequest = components["schemas"]["api.CreatePersonaRequest"];
export type UpdatePersonaRequest = components["schemas"]["api.UpdatePersonaRequest"];

// ✅ PROFESSIONAL RESPONSE HANDLING TYPES
export type ErrorInfo = components["schemas"]["api.ErrorInfo"];
export type Metadata = components["schemas"]["api.Metadata"];

// ✅ CAMPAIGN DATA - Generic until backend provides dedicated response schema
export type CampaignData = Record<string, any>;
export type CampaignListData = CampaignData[];

// ✅ LEGACY COMPATIBILITY - Map old names to new reality
export type ApiResponse<T = any> = APIResponse; // For compatibility with existing imports
export type Persona = PersonaResponse; // Map to actual backend type
export type Proxy = components["schemas"]["github_com_fntelecomllc_studio_backend_internal_models.Proxy"];

// ✅ UI STATUS TYPES - Not backed by schemas (frontend-only)
export type ProxyStatus = "Active" | "Disabled" | "Testing" | "Failed";
export type PersonaStatus = "Active" | "Disabled" | "Testing" | "Failed";

// ✅ PERSONA TYPE ALIASES - For UI compatibility
export type HttpPersona = PersonaResponse;
export type DnsPersona = PersonaResponse;

// ✅ CAMPAIGN UI TYPES - Frontend data structures (no backend equivalent)
export interface CampaignViewModel {
  id: string;
  name: string;
  description?: string;
  status: string;
  phase: string;
  progress?: number;
  createdAt: string;
  updatedAt?: string;
  // Add other UI-specific fields as needed
}

export type CampaignPhase = string; // Generic string until backend provides enum
export type CampaignPhaseStatus = string; // Generic string until backend provides enum  
export type CampaignSelectedType = string; // UI-specific type
export type CampaignType = CampaignPhase; // Legacy alias

// ✅ PAGINATION - Missing from our reconstruction
export interface PageInfo {
  current: number;
  pageSize: number;
  total: number;
  count: number;
}

// ✅ RE-EXPORT GENERATED TYPES FOR DIRECT USE
export type { components } from '@/lib/api-client/types';

// ✅ UI-SPECIFIC TYPES - Not backed by OpenAPI schemas
export interface AnalyzeContentInput {
  urls: string[];
  content?: string;
  keywords?: string[];
  maxResults?: number;
}

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

export interface DomainDetail {
  id: string;
  domainName: string;
  generatedDate?: string;
  dnsStatus: DomainActivityStatus;
  httpStatus: DomainActivityStatus;
  leadScanStatus: DomainActivityStatus;
}

// ✅ SESSION MANAGEMENT - UI Extensions
export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  user?: User;
}

// ✅ PAGINATION HELPERS - UI State Management
export interface PaginationParams {
  current?: number;
  pageSize?: number;
  count?: number;
  total?: number;
}

export type PaginationContext = 'dashboard' | 'detail' | 'list';

export const getDefaultPageSize = (context?: PaginationContext): number => {
  switch (context) {
    case 'dashboard': return 50;
    case 'detail': return 100;
    case 'list': return 25;
    default: return 20;
  }
};

export const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100] as const;

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