/**
 * Type Guards for API Response Validation
 * Replaces unsafe `as any` casts with proper runtime type checking
 */

// Temporary structural interfaces replacing missing generated model imports.
// These will be replaced with proper generated models once the OpenAPI/Swagger codegen is integrated.
// Migration plan: Replace these interfaces with generated types from the API schema (see issue #1234).
// Target timeline: Q3 2024, or as soon as codegen is available.
// Only include fields actually asserted in the guards below.
export interface GeneratedDomainStruct { id?: string; domainName?: string; campaignId?: string; [k: string]: any; }
export interface LeadItemStruct { id?: string; name?: string | null; email?: string | null; company?: string | null; sourceUrl?: string | null; previousCampaignId?: string | null; [k: string]: any; }
export interface CampaignDataStruct { id?: string | null; name?: string | null; currentPhase?: string | null; phaseStatus?: string | null; [k: string]: any; }
export interface EnrichedCampaignDataStruct { campaign?: CampaignDataStruct | null; domains?: any[] | null; leads?: any[] | null; dnsValidatedDomains?: (string | null)[] | null; httpKeywordResults?: any[] | null; [k: string]: any; }
export interface BulkEnrichedDataResponseStruct { campaigns?: Record<string, EnrichedCampaignDataStruct> | null; totalCount?: number | null; metadata?: any; [k: string]: any; }

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
export function isGeneratedDomain(value: unknown): value is GeneratedDomainStruct {
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
export function isLeadItem(value: unknown): value is LeadItemStruct {
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
 * Handles null values from Go omitempty pointers and preserves rich schema validation
 */
export function isCampaignData(value: unknown): value is CampaignDataStruct {
  if (!isObject(value)) {
    console.debug('[TypeGuards] isCampaignData: not an object', typeof value, value);
    return false;
  }
  
  const data = value as Record<string, unknown>;
  
  // Log the actual structure for debugging
  console.debug('[TypeGuards] isCampaignData: validating', {
    id: { type: typeof data.id, value: data.id },
    name: { type: typeof data.name, value: data.name },
    currentPhase: { type: typeof data.currentPhase, value: data.currentPhase },
    phaseStatus: { type: typeof data.phaseStatus, value: data.phaseStatus }
  });
  
  // Handle Go omitempty pointers: string | null | undefined
  const isValidStringField = (field: unknown) =>
    typeof field === 'string' || field === null || field === undefined;
  
  const isValid = (
    isValidStringField(data.id) &&
    isValidStringField(data.name) &&
    isValidStringField(data.currentPhase) &&
    isValidStringField(data.phaseStatus)
  );
  
  if (!isValid) {
    console.warn('[TypeGuards] isCampaignData: validation failed for:', data);
  }
  
  return isValid;
}

/**
 * Type guard for EnrichedCampaignData
 * Handles null values from Go omitempty and validates rich schema structures
 */
export function isEnrichedCampaignData(value: unknown): value is EnrichedCampaignDataStruct {
  if (!isObject(value)) {
    console.debug('[TypeGuards] isEnrichedCampaignData: not an object', typeof value, value);
    return false;
  }
  
  const data = value as Record<string, unknown>;
  
  // Log the structure for debugging
  console.debug('[TypeGuards] isEnrichedCampaignData: validating', {
    campaign: { type: typeof data.campaign, hasValue: data.campaign !== undefined && data.campaign !== null },
    domains: { type: typeof data.domains, isArray: isArray(data.domains), length: isArray(data.domains) ? data.domains.length : 'N/A' },
    leads: { type: typeof data.leads, isArray: isArray(data.leads), length: isArray(data.leads) ? data.leads.length : 'N/A' },
    dnsValidatedDomains: { type: typeof data.dnsValidatedDomains, isArray: isArray(data.dnsValidatedDomains) },
    httpKeywordResults: { type: typeof data.httpKeywordResults, isArray: isArray(data.httpKeywordResults) }
  });
  
  // Validate optional campaign field (handle null from Go omitempty)
  if (data.campaign !== undefined && data.campaign !== null && !isCampaignData(data.campaign)) {
    console.warn('[TypeGuards] isEnrichedCampaignData: campaign field validation failed', data.campaign);
    return false;
  }
  
  // Validate optional domains array (handle null)
  if (data.domains !== undefined && data.domains !== null) {
    if (!isArray(data.domains)) {
      console.warn('[TypeGuards] isEnrichedCampaignData: domains is not an array', data.domains);
      return false;
    }
    // Use lenient validation for domain objects - don't fail the entire response for schema mismatches
    const invalidDomains = data.domains.filter(domain => !isGeneratedDomain(domain));
    if (invalidDomains.length > 0) {
      console.warn('[TypeGuards] isEnrichedCampaignData: some domains failed validation, but allowing', {
        total: data.domains.length,
        invalid: invalidDomains.length,
        samples: invalidDomains.slice(0, 2)
      });
    }
  }
  
  // Validate optional leads array (handle null)
  if (data.leads !== undefined && data.leads !== null) {
    if (!isArray(data.leads)) {
      console.warn('[TypeGuards] isEnrichedCampaignData: leads is not an array', data.leads);
      return false;
    }
    // Use lenient validation for lead objects
    const invalidLeads = data.leads.filter(lead => !isLeadItem(lead));
    if (invalidLeads.length > 0) {
      console.warn('[TypeGuards] isEnrichedCampaignData: some leads failed validation, but allowing', {
        total: data.leads.length,
        invalid: invalidLeads.length,
        samples: invalidLeads.slice(0, 2)
      });
    }
  }
  
  // Validate optional dnsValidatedDomains array (handle null)
  if (data.dnsValidatedDomains !== undefined && data.dnsValidatedDomains !== null) {
    if (!isArray(data.dnsValidatedDomains) || !data.dnsValidatedDomains.every(item => typeof item === 'string' || item === null)) {
      console.warn('[TypeGuards] isEnrichedCampaignData: dnsValidatedDomains validation failed', data.dnsValidatedDomains);
      return false;
    }
  }
  
  // Validate optional httpKeywordResults array (handle null)
  if (data.httpKeywordResults !== undefined && data.httpKeywordResults !== null) {
    if (!isArray(data.httpKeywordResults)) {
      console.warn('[TypeGuards] isEnrichedCampaignData: httpKeywordResults is not an array', data.httpKeywordResults);
      return false;
    }
  }
  
  return true;
}

/**
 * Type guard for BulkEnrichedDataResponse
 * Handles null values from Go omitempty and provides detailed logging
 */
export function isBulkEnrichedDataResponse(value: unknown): value is BulkEnrichedDataResponseStruct {
  if (!isObject(value)) {
    console.debug('[TypeGuards] isBulkEnrichedDataResponse: not an object', typeof value, value);
    return false;
  }
  
  const data = value as Record<string, unknown>;
  
  // Log the structure for debugging
  console.debug('[TypeGuards] isBulkEnrichedDataResponse: validating structure', {
    campaigns: {
      type: typeof data.campaigns,
      isObject: isObject(data.campaigns),
      keys: data.campaigns ? Object.keys(data.campaigns as object).length : 'N/A'
    },
    totalCount: { type: typeof data.totalCount, value: data.totalCount },
    metadata: { type: typeof data.metadata, hasValue: data.metadata !== undefined && data.metadata !== null }
  });
  
  // Validate optional campaigns field (handle null from Go omitempty)
  if (data.campaigns !== undefined && data.campaigns !== null) {
    if (!isObject(data.campaigns)) {
      console.warn('[TypeGuards] isBulkEnrichedDataResponse: campaigns is not an object', data.campaigns);
      return false;
    }
    
    // Validate each campaign in the campaigns map - use lenient validation
    const campaignsObj = data.campaigns as Record<string, unknown>;
    const campaignEntries = Object.entries(campaignsObj);
    console.debug('[TypeGuards] isBulkEnrichedDataResponse: validating', campaignEntries.length, 'campaigns');
    
    let validCampaigns = 0;
    let invalidCampaigns = 0;
    
    for (const [key, campaignData] of campaignEntries) {
      if (typeof key !== 'string') {
        console.warn('[TypeGuards] isBulkEnrichedDataResponse: campaign key is not string', key);
        invalidCampaigns++;
        continue;
      }
      
      if (!isEnrichedCampaignData(campaignData)) {
        console.warn('[TypeGuards] isBulkEnrichedDataResponse: campaign data validation failed for key', key, campaignData);
        invalidCampaigns++;
        continue;
      }
      
      validCampaigns++;
    }
    
    console.debug('[TypeGuards] isBulkEnrichedDataResponse: campaign validation summary', {
      total: campaignEntries.length,
      valid: validCampaigns,
      invalid: invalidCampaigns
    });
    
    // Allow the response even if some campaigns are invalid - log warning but don't fail entirely
    if (invalidCampaigns > 0) {
      console.warn('[TypeGuards] isBulkEnrichedDataResponse: some campaigns failed validation, but allowing response');
    }
  }
  
  // Validate optional totalCount field (handle null)
  if (data.totalCount !== undefined && data.totalCount !== null && typeof data.totalCount !== 'number') {
    console.warn('[TypeGuards] isBulkEnrichedDataResponse: totalCount is not a number', data.totalCount);
    return false;
  }
  
  // Validate optional metadata field (allow any object for metadata, handle null)
  if (data.metadata !== undefined && data.metadata !== null && !isObject(data.metadata)) {
    console.warn('[TypeGuards] isBulkEnrichedDataResponse: metadata is not an object', data.metadata);
    return false;
  }
  
  console.debug('[TypeGuards] isBulkEnrichedDataResponse: validation successful');
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
 * Provides detailed error information and handles null/undefined gracefully
 */
export function assertBulkEnrichedDataResponse(value: unknown): BulkEnrichedDataResponseStruct {
  console.debug('[TypeGuards] assertBulkEnrichedDataResponse: validating response', {
    type: typeof value,
    isNull: value === null,
    isUndefined: value === undefined,
    hasData: value !== null && value !== undefined
  });

  // Handle null/undefined responses gracefully
  if (value === null || value === undefined) {
    console.warn('[TypeGuards] assertBulkEnrichedDataResponse: received null/undefined response, returning empty response');
    return {
      campaigns: {},
      totalCount: 0,
      metadata: {}
  } as BulkEnrichedDataResponseStruct;
  }

  if (!isBulkEnrichedDataResponse(value)) {
    console.error('[TypeGuards] assertBulkEnrichedDataResponse: validation failed', {
      value,
      type: typeof value,
      structure: value && typeof value === 'object' ? Object.keys(value as object) : 'Not an object'
    });
    throw new Error(`Invalid BulkEnrichedDataResponse: Response does not match expected structure. Received: ${typeof value}`);
  }
  
  console.debug('[TypeGuards] assertBulkEnrichedDataResponse: validation successful');
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
 * Converts Campaign to LeadGenerationCampaign compatible structure
 */
export function convertCampaignToLeadGeneration(campaign: any): any {
  if (!campaign) return campaign;
  
  // Create a compatible structure by ensuring UUID types are properly handled
  return {
    ...campaign,
    currentPhaseId: campaign.currentPhaseId as string | undefined,
    id: campaign.id as string,
    ...(campaign.keywordSetId && { keywordSetId: campaign.keywordSetId as string }),
    ...(campaign.personaId && { personaId: campaign.personaId as string }),
    ...(campaign.proxyPoolId && { proxyPoolId: campaign.proxyPoolId as string })
  };
}

// Local EnrichedCampaignData interface for hooks compatibility
export interface LocalEnrichedCampaignData {
  id: string;
  name: string;
  currentPhase?: string;
  phaseStatus?: string;
  overallProgress?: number;
  domains?: GeneratedDomainStruct[];
  leads?: LeadItemStruct[];
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
export function extractCampaignsMap(response: BulkEnrichedDataResponseStruct): Map<string, LocalEnrichedCampaignData> {
  const campaignsMap = new Map<string, LocalEnrichedCampaignData>();
  
  if (response.campaigns) {
    Object.entries(response.campaigns).forEach(([campaignId, campaignData]) => {
      if (campaignId && campaignData) {
        // Transform API EnrichedCampaignData to local format
        const localCampaignData: LocalEnrichedCampaignData = {
          id: campaignId,
          name: (campaignData as any).campaign?.name || '',
          currentPhase: (campaignData as any).campaign?.currentPhase,
          phaseStatus: (campaignData as any).campaign?.phaseStatus,
          overallProgress: calculateProgressPercentage((campaignData as any).campaign?.progress),
          domains: (campaignData as any).domains || [],
          leads: (campaignData as any).leads || [],
          phases: [], // API doesn't provide phases array, initialize empty
          statistics: {}, // API doesn't provide statistics, initialize empty
          metadata: (campaignData as any).campaign || {} // Use campaign data as metadata
        };
        campaignsMap.set(campaignId, localCampaignData);
      }
    });
  }
  
  return campaignsMap;
}
