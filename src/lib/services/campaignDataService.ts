/**
 * Campaign Data Service
 *
 * Provides rich campaign data by combining campaign summaries with detailed data endpoints.
 * This service bridges the architectural gap between the backend's count-based campaign summaries
 * and the frontend's need for rich array data.
 */

import { campaignService } from './campaignService.production';
import { CampaignViewModel, components } from '../types';

// Extract types from the OpenAPI schema
type _GeneratedDomain = components["schemas"]["GeneratedDomain"]; // Unused
type _DNSValidationResult = components["schemas"]["DNSValidationResult"]; // Unused
type HTTPKeywordResult = components["schemas"]["HTTPKeywordResult"];

// Rich campaign data with arrays instead of counts
export interface RichCampaignData extends Omit<CampaignViewModel, 'domains' | 'dnsValidatedDomains' | 'leads'> {
  // Override count properties with actual arrays
  domains: string[];
  dnsValidatedDomains: string[];
  leads: Array<{
    id: string;
    name?: string;
    sourceUrl?: string;
    similarityScore?: number;
    email?: string;
    phone?: string;
    company?: string;
  }>;
  httpKeywordResults: HTTPKeywordResult[];
}

// Cache for rich campaign data to avoid redundant API calls
const richDataCache = new Map<string, {
  data: RichCampaignData;
  timestamp: number;
  expiry: number;
}>();

const CACHE_DURATION = 30000; // 30 seconds

/**
 * Fetches rich campaign data by combining campaign summary with detailed endpoints
 */
export const getRichCampaignData = async (campaignId: string): Promise<RichCampaignData | null> => {
  // Check cache first
  const cached = richDataCache.get(campaignId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  try {
    // Get campaign summary via service layer
    const campaignResponse = await campaignService.getCampaignById(campaignId);
    if (campaignResponse.status !== 'success' || !campaignResponse.data) {
      throw new Error(`Failed to fetch campaign: ${campaignResponse.message}`);
    }
    const campaign = campaignResponse.data as CampaignViewModel;

    // Add null check to prevent undefined access errors
    if (!campaign || !campaign.campaignType) {
      console.warn(`[campaignDataService] Invalid campaign data for ${campaignId}:`, campaign);
      console.warn(`[campaignDataService] This may be a deleted campaign or corrupted data. Skipping gracefully.`);
      
      // Return null instead of throwing to allow graceful handling
      return null;
    }

    // Initialize rich data with campaign summary
    const richData: RichCampaignData = {
      ...campaign,
      domains: [],
      dnsValidatedDomains: [],
      leads: [],
      httpKeywordResults: []
    };

    // Determine which APIs to call based on campaign type
    const isHttpKeywordCampaign = campaign.campaignType === 'http_keyword_validation';
    
    // Build requests array - only include HTTP keyword request for HTTP campaigns
    const requests = [
      campaignService.getGeneratedDomains(campaignId, { limit: 1000 }),
      campaignService.getDNSValidationResults(campaignId, { limit: 1000 })
    ];
    
    if (isHttpKeywordCampaign) {
      requests.push(campaignService.getHTTPKeywordResults(campaignId, { limit: 1000 }));
    }

    // Fetch detailed data in parallel
    const responses = await Promise.allSettled(requests);
    
    // Safely destructure with proper bounds checking
    const generatedDomainsResponse = responses[0];
    const dnsValidationResponse = responses[1];
    const httpKeywordResponse = responses[2]; // May be undefined for non-HTTP campaigns

    // Process generated domains with proper error handling
    if (generatedDomainsResponse?.status === 'fulfilled') {
      try {
        const serviceResponse = generatedDomainsResponse.value as any;
        if (serviceResponse.status === 'success' && serviceResponse.data && Array.isArray(serviceResponse.data)) {
          richData.domains = serviceResponse.data
            .map((d: any) => d?.domainName)
            .filter(Boolean) as string[];
        }
      } catch (error) {
        console.warn(`Failed to process domains data for campaign ${campaignId}:`, error);
      }
    } else if (generatedDomainsResponse?.status === 'rejected') {
      console.warn(`Failed to fetch domains for campaign ${campaignId}:`, generatedDomainsResponse.reason);
    }

    // Process DNS validation results with proper error handling
    if (dnsValidationResponse?.status === 'fulfilled') {
      try {
        const serviceResponse = dnsValidationResponse.value as any;
        if (serviceResponse.status === 'success' && serviceResponse.data && Array.isArray(serviceResponse.data)) {
          richData.dnsValidatedDomains = serviceResponse.data
            .filter((d: any) => d?.validationStatus === 'valid')
            .map((d: any) => d?.domainName)
            .filter(Boolean) as string[];
        }
      } catch (error) {
        console.warn(`Failed to process DNS data for campaign ${campaignId}:`, error);
      }
    } else if (dnsValidationResponse?.status === 'rejected') {
      console.warn(`Failed to fetch DNS validation for campaign ${campaignId}:`, dnsValidationResponse.reason);
    }

    // Process HTTP keyword results only for HTTP campaigns
    if (isHttpKeywordCampaign && httpKeywordResponse?.status === 'fulfilled') {
      try {
        const serviceResponse = httpKeywordResponse.value as any;
        if (serviceResponse.status === 'success' && serviceResponse.data && Array.isArray(serviceResponse.data)) {
          richData.httpKeywordResults = serviceResponse.data;
        
          // Extract leads from HTTP keyword results
          const allLeads: RichCampaignData['leads'] = [];
          serviceResponse.data.forEach((result: any) => {
            // Create synthetic lead data from HTTP results
            // In a real implementation, this would come from a dedicated leads endpoint
            if (result.domainName && result.validationStatus === 'valid') {
              const keywordCount = (result.foundAdHocKeywords?.length || 0) +
                                 Object.keys(result.foundKeywordsFromSets || {}).length;
              
              allLeads.push({
                id: result.id || `${result.domainName}-lead`,
                name: result.pageTitle || result.domainName,
                sourceUrl: `https://${result.domainName}`,
                similarityScore: keywordCount > 0 ? Math.min(keywordCount / 5, 1) : undefined,
                company: result.domainName
              });
            }
          });
          richData.leads = allLeads;
        }
      } catch (error) {
        console.warn(`Failed to process HTTP keyword data for campaign ${campaignId}:`, error);
      }
    } else if (isHttpKeywordCampaign && httpKeywordResponse?.status === 'rejected') {
      console.warn(`Failed to fetch HTTP keyword results for campaign ${campaignId}:`, httpKeywordResponse.reason);
    }

    // Cache the result
    richDataCache.set(campaignId, {
      data: richData,
      timestamp: Date.now(),
      expiry: Date.now() + CACHE_DURATION
    });

    return richData;
  } catch (error) {
    console.error(`Failed to fetch rich campaign data for ${campaignId}:`, error);
    
    // Fallback to campaign summary with empty arrays
    try {
      const campaignResponse = await campaignService.getCampaignById(campaignId);
      if (campaignResponse.status === 'success' && campaignResponse.data) {
        return {
          ...campaignResponse.data,
          domains: [],
          dnsValidatedDomains: [],
          leads: [],
          httpKeywordResults: []
        } as RichCampaignData;
      }
      throw new Error(`Failed to fetch campaign: ${campaignResponse.message}`);
    } catch (fallbackError) {
      console.error(`Failed to fetch even basic campaign data for ${campaignId}:`, fallbackError);
      throw error;
    }
  }
};

/**
 * Gets rich campaign data for multiple campaigns
 */
export const getRichCampaignDataBatch = async (campaignIds: string[]): Promise<Map<string, RichCampaignData>> => {
  const results = new Map<string, RichCampaignData>();
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < campaignIds.length; i += batchSize) {
    const batch = campaignIds.slice(i, i + batchSize);
    const batchPromises = batch.map(id => 
      getRichCampaignData(id).then(data => ({ id, data }))
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.data !== null) {
        results.set(result.value.id, result.value.data);
      }
    });
  }
  
  return results;
};

/**
 * Clears the rich data cache for a specific campaign or all campaigns
 */
export const clearRichDataCache = (campaignId?: string): void => {
  if (campaignId) {
    richDataCache.delete(campaignId);
  } else {
    richDataCache.clear();
  }
};

/**
 * Preloads rich data for campaigns to improve performance
 */
export const preloadRichCampaignData = async (campaignIds: string[]): Promise<void> => {
  // Load data in background without waiting
  campaignIds.forEach(id => {
    getRichCampaignData(id).catch(error => {
      console.warn(`Failed to preload rich data for campaign ${id}:`, error);
    });
  });
};