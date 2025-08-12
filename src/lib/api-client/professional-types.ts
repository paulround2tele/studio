/* tslint:disable */
/* eslint-disable */
/**
 * Professional Type Alias Layer
 * 
 * Maps long-form generated types to usable aliases for frontend consumption.
 * This file bridges the gap between OpenAPI generator reality and UI development needs.
 * 
 * PROFESSIONAL PATTERN: Import the actual generated types, then create sensible aliases
 * 
 * Created by: Professional Type System Reconstruction
 * Date: 2025-08-12
 */

// ===========================================================================================
// CORE ENTITY TYPES - Professional aliases for primary business objects
// ===========================================================================================

// User Types
export type { GithubComFntelecomllcStudioBackendInternalModelsUser as User } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsLoginRequest as LoginRequest } from './models';
export type { ChangePasswordRequest } from './models';
export type { ApiUserPublicResponse as UserPublicResponse } from './models';

// Proxy Types  
export type { GithubComFntelecomllcStudioBackendInternalModelsProxy as Proxy } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest as CreateProxyRequest } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest as UpdateProxyRequest } from './models';

// Proxy Pool Types
export type { GithubComFntelecomllcStudioBackendInternalModelsProxyPool as ProxyPool } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsProxyPoolMembership as ProxyPoolMembership } from './models';

// ===========================================================================================
// CAMPAIGN SYSTEM TYPES - Professional aliases for campaign-related objects
// ===========================================================================================

// Note: LeadGenerationCampaign doesn't exist in OpenAPI spec
// Using actual request/response types that do exist
export type { ServicesCreateLeadGenerationCampaignRequest as CreateCampaignRequest } from './models';
export type { CreateLeadGenerationCampaign200Response as CreateCampaignResponse } from './models';
export type { LeadGenerationCampaignResponse as CampaignResponse } from './models';
export type { LeadGenerationCampaign as Campaign } from './models';

// Phase Configuration Types
export type { ApiPhaseConfigureRequest as PhaseConfigureRequest } from './models';
export type { ApiPhaseConfig as AnalysisPhaseConfig } from './models';
export type { DNSValidationPhaseConfig } from './models';
export type { HTTPKeywordValidationPhaseConfig } from './models';
export type { ModelsDomainGenerationPhaseConfig as DomainGenerationPhaseConfig } from './models';

// Campaign Phase Types - Using ACTUAL exported enums and types
export type { CampaignCurrentPhaseEnum, CampaignPhaseStatusEnum } from './models/campaign';
export type { CampaignPhase } from './models/campaign-phase';

// Additional Configuration Types (if they exist)
// export type { HTTPValidationConfig } from './models'; // May not exist, commenting out

// Persona Configuration Types (need to verify these exist)
// export type { HttpPersonaConfig } from './models';
// export type { DnsPersonaConfig } from './models';

// ===========================================================================================
// PERSONA TYPES - Professional aliases for persona management
// ===========================================================================================

export type { ApiPersonaResponse as PersonaResponse } from './models';
export type { ApiCreatePersonaRequest as CreatePersonaRequest } from './models';
export type { ApiUpdatePersonaRequest as UpdatePersonaRequest } from './models';
export type { ApiPersonaTestResponse as PersonaTestResponse } from './models';
export type { DNSPersona } from './models';
export type { HTTPPersona } from './models';

// ===========================================================================================
// BULK OPERATIONS TYPES - Professional aliases for bulk operations
// ===========================================================================================

export type { GithubComFntelecomllcStudioBackendInternalModelsBulkDomainGenerationRequest as BulkDomainGenerationRequest } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsBulkDNSValidationRequest as BulkDNSValidationRequest } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsBulkHTTPValidationRequest as BulkHTTPValidationRequest } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsBulkAnalyticsRequest as BulkAnalyticsRequest } from './models';
export type { GithubComFntelecomllcStudioBackendInternalModelsBulkResourceRequest as BulkResourceRequest } from './models';

export type { GithubComFntelecomllcStudioBackendInternalModelsBulkOperationStatus as BulkOperationStatus } from './models';
export type { BulkAnalyzeDomains200Response } from './models';

// ===========================================================================================
// VALIDATION TYPES - Professional aliases for validation operations
// ===========================================================================================

export type { DnsValidationParams } from './models';
export type { HttpKeywordParams } from './models';
export type { DNSValidationRequest } from './models';
export type { HTTPValidationRequest } from './models';

// ===========================================================================================
// DOMAIN & CONTENT TYPES - Professional aliases for domain and content management  
// ===========================================================================================

export type { GeneratedDomain } from './models';
export type { ExtractedContentItem } from './models';
export type { LeadItem } from './models';

// ===========================================================================================
// ENRICHED DATA TYPES - Professional aliases for data enrichment
// ===========================================================================================

export type { ApiBulkEnrichedDataRequest as BulkEnrichedDataRequest } from './models';
export type { BulkEnrichedDataResponse } from './models';
export type { EnrichedCampaignData } from './models';

// ===========================================================================================
// SESSION & AUTH TYPES - Professional aliases for session management  
// ===========================================================================================

export type { ApiSessionData as SessionData } from './models';
export type { ApiSessionResponse as SessionResponse } from './models';

// ===========================================================================================
// PROFESSIONAL USAGE EXAMPLES
// ===========================================================================================

/*
// ✅ PROFESSIONAL IMPORT PATTERN
import type { User, Proxy, CreateCampaignRequest } from '@/lib/api-client/professional-types';

// ❌ AMATEUR IMPORT PATTERN  
import type { User, Proxy } from '@/lib/api-client/models'; // THESE DON'T EXIST

// ✅ PROFESSIONAL COMPONENT USAGE
interface Props {
  user: User;           // Maps to GithubComFntelecomllcStudioBackendInternalModelsUser
  proxies: Proxy[];     // Maps to GithubComFntelecomllcStudioBackendInternalModelsProxy[]
}
*/
