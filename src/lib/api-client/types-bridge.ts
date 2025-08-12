// PROFESSIONAL TYPE BRIDGE - Clean import paths for commonly used types
// Generated: August 12, 2025 by ULTIMATE COMPREHENSIVE RECONSTRUCTION
// Purpose: Bridge amateur import expectations with professional OpenAPI reality

import type {
  // Campaign System - THE SHOCKING DISCOVERY: THESE ALL EXIST!
  Campaign as CampaignModel,
  CampaignCurrentPhaseEnum,
  CampaignPhaseStatusEnum,
  CampaignDetailsResponse,
  CreateCampaignRequest,
  ServicesCreateLeadGenerationCampaignRequest,
  
  // Persona System - ALL PROFESSIONAL GENERATED TYPES
  ApiPersonaResponse,
  ApiCreatePersonaRequest,
  ApiUpdatePersonaRequest,
  ApiPersonaDeleteResponse,
  ApiPersonaTestResponse,
  
  // Proxy System - LONG NAMES BUT THEY EXIST
  GithubComFntelecomllcStudioBackendInternalModelsProxy,
  CreateProxyRequest as ApiCreateProxyRequest,
  UpdateProxyRequest as ApiUpdateProxyRequest,
  ApiProxyDetailsResponse,
  ApiProxyTestResponse,
  
  // User/Auth System - PROFESSIONAL BACKEND TYPES
  GithubComFntelecomllcStudioBackendInternalModelsUser,
  GithubComFntelecomllcStudioBackendInternalModelsLoginRequest,
  ApiSessionResponse,
  ApiUserPublicResponse,
  
  // Keyword Set System
  ApiKeywordSetResponse,
  ApiCreateKeywordSetRequest,
  ApiUpdateKeywordSetRequest,
  ApiKeywordSetDeleteResponse,
  
  // Utility Types
  ApiAPIResponse
} from './models';

// ===================================================================================================
// PROFESSIONAL TYPE ALIASES - Clean names that match amateur expectations but use REAL types
// ===================================================================================================

// Campaign System Aliases
export type Campaign = CampaignModel;
export type CampaignPhase = CampaignCurrentPhaseEnum;  
export type CampaignStatus = CampaignPhaseStatusEnum;
export type CampaignDetails = CampaignDetailsResponse;
export type CreateCampaignPayload = ServicesCreateLeadGenerationCampaignRequest;

// Persona System Aliases  
export type PersonaResponse = ApiPersonaResponse;
export type CreatePersonaRequest = ApiCreatePersonaRequest;  
export type UpdatePersonaRequest = ApiUpdatePersonaRequest;
export type PersonaDeleteResponse = ApiPersonaDeleteResponse;
export type PersonaTestResponse = ApiPersonaTestResponse;

// Proxy System Aliases
export type Proxy = GithubComFntelecomllcStudioBackendInternalModelsProxy;
export type CreateProxyRequest = ApiCreateProxyRequest;
export type UpdateProxyRequest = ApiUpdateProxyRequest; 
export type ProxyDetailsResponse = ApiProxyDetailsResponse;
export type ProxyTestResponse = ApiProxyTestResponse;

// User/Auth System Aliases
export type User = GithubComFntelecomllcStudioBackendInternalModelsUser;
export type LoginRequest = GithubComFntelecomllcStudioBackendInternalModelsLoginRequest;
export type SessionResponse = ApiSessionResponse;
export type UserPublicResponse = ApiUserPublicResponse;

// Keyword Set System Aliases
export type KeywordSetResponse = ApiKeywordSetResponse;
export type CreateKeywordSetRequest = ApiCreateKeywordSetRequest;
export type UpdateKeywordSetRequest = ApiUpdateKeywordSetRequest;
export type KeywordSetDeleteResponse = ApiKeywordSetDeleteResponse;

// ===================================================================================================
// API RESPONSE WRAPPER - Handle the generic APIResponse envelope
// ===================================================================================================

export type ApiResponse<T = any> = ApiAPIResponse & { 
  data?: T;
  success?: boolean;
  requestId?: string;
  metadata?: any;
};

// ===================================================================================================
// FRONTEND UI EXTENSIONS - UI-only properties that don't exist in backend
// ===================================================================================================

// Campaign UI extensions (for frontend-specific properties not in backend schema)
export interface CampaignViewModel extends Campaign {
  // UI-only properties that don't exist in backend schema
  isLoading?: boolean;
  uiState?: 'editing' | 'viewing' | 'creating';
  localChanges?: boolean;
  
  // PROFESSIONAL MAPPING: These exist in Campaign but components may expect different names
  // progress vs progressPercentage - both exist, components can use either
  // domains: number - EXISTS in backend ✅
  // leads: number - EXISTS in backend ✅  
  // currentPhase: CampaignCurrentPhaseEnum - EXISTS in backend ✅
  // phaseStatus: CampaignPhaseStatusEnum - EXISTS in backend ✅
  // errorMessage: string - EXISTS in backend ✅
  
  // AMATEUR PROPERTIES THAT DON'T EXIST (to be removed from components):
  // description - NOT IN BACKEND ❌
  // phases - NOT IN BACKEND ❌  
  // overallProgress - use 'progress' or 'progressPercentage' instead ❌
}

// Persona UI extensions
export interface PersonaViewModel extends PersonaResponse {
  isLoading?: boolean;
  testStatus?: 'idle' | 'testing' | 'success' | 'failed';
  lastTestResult?: PersonaTestResponse;
}

// Proxy UI extensions  
export interface ProxyViewModel extends Proxy {
  isLoading?: boolean;
  healthStatus?: 'unknown' | 'healthy' | 'unhealthy';
  lastHealthCheck?: string;
  testResults?: ProxyTestResponse;
}

// ===================================================================================================
// ENUM RE-EXPORTS - Make enums easily accessible
// ===================================================================================================

// Re-export the actual enums for easy access
export { CampaignCurrentPhaseEnum, CampaignPhaseStatusEnum } from './models';

// Create const assertions for TypeScript strict mode
export const CAMPAIGN_PHASES = {
  SETUP: 'setup' as const,
  GENERATION: 'generation' as const,
  DNS_VALIDATION: 'dns_validation' as const,
  HTTP_KEYWORD_VALIDATION: 'http_keyword_validation' as const,
  ANALYSIS: 'analysis' as const,
} as const;

export const CAMPAIGN_STATUSES = {
  NOT_STARTED: 'not_started' as const,
  IN_PROGRESS: 'in_progress' as const,
  PAUSED: 'paused' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
} as const;

// ===================================================================================================
// LEGACY COMPATIBILITY TYPES - For gradual migration
// ===================================================================================================

// These allow existing components to gradually migrate
export type Persona = PersonaResponse; // Simple alias during migration
export type HttpPersona = PersonaResponse;
export type DnsPersona = PersonaResponse;

// ===================================================================================================
// UTILITY TYPES - Common patterns used throughout the app
// ===================================================================================================

export type UUID = string; // Re-export for convenience

// Generic list response pattern
export type ListResponse<T> = ApiResponse<T[]>;

// Generic CRUD operation results
export type CreateResult<T> = ApiResponse<T>;
export type UpdateResult<T> = ApiResponse<T>;  
export type DeleteResult = ApiResponse<{ success: boolean; message?: string }>;

// Pagination utilities (if backend supports it)
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===================================================================================================
// TYPE GUARDS - Runtime type checking utilities
// ===================================================================================================

export const isApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
  return obj && typeof obj === 'object' && ('success' in obj || 'data' in obj);
};

export const isCampaign = (obj: any): obj is Campaign => {
  return obj && typeof obj === 'object' && 'id' in obj && 'name' in obj;
};

export const isPersonaResponse = (obj: any): obj is PersonaResponse => {
  return obj && typeof obj === 'object' && 'id' in obj;
};

// ===================================================================================================
// EXPORT SUMMARY
// ===================================================================================================

/*
 * PROFESSIONAL TYPE BRIDGE SUMMARY:
 * 
 * This file bridges the gap between amateur import expectations and professional OpenAPI reality.
 * All types are mapped to ACTUAL generated types that exist in the codebase.
 * 
 * Key Discoveries:
 * ✅ Campaign interface EXISTS with all needed properties
 * ✅ All enums EXIST (CampaignCurrentPhaseEnum, CampaignPhaseStatusEnum)  
 * ✅ Professional persona/proxy types EXIST with proper schemas
 * ✅ User authentication types EXIST in backend models
 * 
 * Usage:
 * import type { Campaign, PersonaResponse, CampaignPhase } from '@/lib/api-client/types-bridge';
 * 
 * This replaces ALL the broken imports from '@/lib/types' with working professional types.
 */
