/**
 * Type Guards for API Response Validation
 * Replaces unsafe `as any` casts with proper runtime type checking
 */

import type { BulkEnrichedDataResponse } from '@/lib/api-client/models/bulk-enriched-data-response';
import type { EnrichedCampaignData } from '@/lib/api-client/models/enriched-campaign-data';
import type { GeneratedDomain } from '@/lib/api-client/models/generated-domain';
import type { LeadItem } from '@/lib/api-client/models/lead-item';
import type { CampaignData } from '@/lib/api-client/models/campaign-data';
import type { UUID } from '@/lib/api-client/uuid-types';

/**
 * Validates if a value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates if a value is an array
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for GeneratedDomain
 */
export function isGeneratedDomain(value: unknown): value is GeneratedDomain {
  if (!isObject(value)) return false;
  
  // Check required/common fields that should be present
  return (
    (typeof value.id === 'string' || value.id === undefined) &&
    (typeof value.domainName === 'string' || value.domainName === undefined) &&
    (typeof value.campaignId === 'string' || value.campaignId === undefined)
  );
}

/**
 * Type guard for LeadItem
 */
export function isLeadItem(value: unknown): value is LeadItem {
  if (!isObject(value)) return false;
  
  // Check required/common fields that should be present
  return (
    (typeof value.id === 'string' || value.id === undefined) &&
    (typeof value.name === 'string' || value.name === null || value.name === undefined) &&
    (typeof value.email === 'string' || value.email === null || value.email === undefined)
  );
}

/**
 * Type guard for CampaignData
 */
export function isCampaignData(value: unknown): value is CampaignData {
  if (!isObject(value)) return false;
  
  return (
    (typeof value.id === 'string' || value.id === undefined) &&
    (typeof value.name === 'string' || value.name === undefined) &&
    (typeof value.currentPhase === 'string' || value.currentPhase === undefined)
  );
}

/**
 * Type guard for EnrichedCampaignData
 */
export function isEnrichedCampaignData(value: unknown): value is EnrichedCampaignData {
  if (!isObject(value)) return false;
  
  const data = value as Record<string, unknown>;
  
  // Validate optional campaign field
  if (data.campaign !== undefined && !isCampaignData(data.campaign)) {
    return false;
  }
  
  // Validate optional domains array
  if (data.domains !== undefined) {
    if (!isArray(data.domains) || !data.domains.every(isGeneratedDomain)) {
      return false;
    }
  }
  
  // Validate optional leads array
  if (data.leads !== undefined) {
    if (!isArray(data.leads) || !data.leads.every(isLeadItem)) {
      return false;
    }
  }
  
  // Validate optional dnsValidatedDomains array
  if (data.dnsValidatedDomains !== undefined) {
    if (!isArray(data.dnsValidatedDomains) || !data.dnsValidatedDomains.every(item => typeof item === 'string')) {
      return false;
    }
  }
  
  // Validate optional httpKeywordResults array
  if (data.httpKeywordResults !== undefined) {
    if (!isArray(data.httpKeywordResults)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Type guard for BulkEnrichedDataResponse
 */
export function isBulkEnrichedDataResponse(value: unknown): value is BulkEnrichedDataResponse {
  if (!isObject(value)) return false;
  
  const data = value as Record<string, unknown>;
  
  // Validate optional campaigns field
  if (data.campaigns !== undefined) {
    if (!isObject(data.campaigns)) return false;
    
    // Validate each campaign in the campaigns map
    for (const [key, campaignData] of Object.entries(data.campaigns)) {
      if (typeof key !== 'string' || !isEnrichedCampaignData(campaignData)) {
        return false;
      }
    }
  }
  
  // Validate optional totalCount field
  if (data.totalCount !== undefined && typeof data.totalCount !== 'number') {
    return false;
  }
  
  // Validate optional metadata field (allow any object for metadata)
  if (data.metadata !== undefined && !isObject(data.metadata)) {
    return false;
  }
  
  return true;
}

/**
 * Type guard for campaign IDs array response
 */
export function isCampaignIdsResponse(value: unknown): value is Array<{ campaignId?: string; id?: string }> {
  if (!isArray(value)) return false;
  
  return value.every(item => 
    isObject(item) && 
    (typeof (item as any).campaignId === 'string' || typeof (item as any).id === 'string')
  );
}

/**
 * Safe type assertion with runtime validation
 * Throws descriptive error if validation fails
 */
export function assertBulkEnrichedDataResponse(value: unknown): BulkEnrichedDataResponse {
  if (!isBulkEnrichedDataResponse(value)) {
    throw new Error('Invalid BulkEnrichedDataResponse: Response does not match expected structure');
  }
  return value;
}

/**
 * Safe type assertion for campaign IDs response
 */
export function assertCampaignIdsResponse(value: unknown): Array<{ campaignId?: string; id?: string }> {
  if (!isCampaignIdsResponse(value)) {
    throw new Error('Invalid Campaign IDs Response: Response does not match expected structure');
  }
  return value;
}

/**
 * Enhanced domain extraction with type safety
 * Handles both object and string domain formats for backward compatibility
 */
export function extractDomainName(domain: unknown): string {
  if (typeof domain === 'string') {
    return domain;
  }
  
  if (isGeneratedDomain(domain)) {
    // Try GeneratedDomain fields first
    if (domain.domainName) return domain.domainName;
    if (domain.id) return domain.id;
  }
  
  // Fallback for unknown domain structure (including legacy formats)
  if (isObject(domain)) {
    const domainObj = domain as Record<string, unknown>;
    if (typeof domainObj.name === 'string') return domainObj.name;
    if (typeof domainObj.domainName === 'string') return domainObj.domainName;
    if (typeof domainObj.domain === 'string') return domainObj.domain;
  }
  
  return '';
}

/**
 * Safe campaign type converter
 * Converts CampaignViewModel to LeadGenerationCampaign compatible structure
 */
export function convertCampaignToLeadGeneration(campaign: any): any {
  if (!campaign) return campaign;
  
  // Create a compatible structure by ensuring UUID types are properly handled
  return {
    ...campaign,
    currentPhaseId: campaign.currentPhaseId as UUID | undefined,
    id: campaign.id as UUID,
    // Ensure all other UUID fields are properly typed
    ...(campaign.keywordSetId && { keywordSetId: campaign.keywordSetId as UUID }),
    ...(campaign.personaId && { personaId: campaign.personaId as UUID }),
    ...(campaign.proxyPoolId && { proxyPoolId: campaign.proxyPoolId as UUID })
  };
}

// Local EnrichedCampaignData interface for hooks compatibility
export interface LocalEnrichedCampaignData {
  id: UUID;
  name: string;
  currentPhase?: string;
  phaseStatus?: string;
  overallProgress?: number;
  domains?: GeneratedDomain[];
  leads?: LeadItem[];
  phases?: any[];
  statistics?: any;
  metadata?: any;
}

/**
 * Calculate progress percentage from progress map
 */
function calculateProgressPercentage(progress?: { [key: string]: object }): number {
  if (!progress || typeof progress !== 'object') return 0;
  
  // Try to extract a percentage value from the progress object
  const progressValues = Object.values(progress);
  if (progressValues.length === 0) return 0;
  
  // Look for a percentage field in the progress data
  for (const value of progressValues) {
    if (value && typeof value === 'object') {
      const progressObj = value as Record<string, unknown>;
      if (typeof progressObj.percentage === 'number') {
        return progressObj.percentage;
      }
      if (typeof progressObj.progress === 'number') {
        return progressObj.progress;
      }
    }
  }
  
  return 0;
}

/**
 * Type-safe campaigns map extractor that converts API types to local types
 */
export function extractCampaignsMap(response: BulkEnrichedDataResponse): Map<string, LocalEnrichedCampaignData> {
  const campaignsMap = new Map<string, LocalEnrichedCampaignData>();
  
  if (response.campaigns) {
    Object.entries(response.campaigns).forEach(([campaignId, campaignData]) => {
      if (campaignId && campaignData) {
        // Transform API EnrichedCampaignData to local format
        const localCampaignData: LocalEnrichedCampaignData = {
          id: campaignId as UUID,
          name: campaignData.campaign?.name || '',
          currentPhase: campaignData.campaign?.currentPhase,
          phaseStatus: campaignData.campaign?.phaseStatus,
          overallProgress: calculateProgressPercentage(campaignData.campaign?.progress),
          domains: campaignData.domains || [],
          leads: campaignData.leads || [],
          phases: [], // API doesn't provide phases array, initialize empty
          statistics: {}, // API doesn't provide statistics, initialize empty
          metadata: campaignData.campaign || {} // Use campaign data as metadata
        };
        campaignsMap.set(campaignId, localCampaignData);
      }
    });
  }
  
  return campaignsMap;
}