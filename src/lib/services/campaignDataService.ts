/**
 * Campaign Data Service
 *
 * Provides rich campaign data by combining campaign summaries with detailed data endpoints.
 * This service bridges the architectural gap between the backend's count-based campaign summaries
 * and the frontend's need for rich array data.
 */

import { apiClient } from '../api-client/client';
import { CampaignViewModel, components } from '../types';

// Extract types from the OpenAPI schema
type GeneratedDomainsResponse = components["schemas"]["GeneratedDomainsResponse"];
type DNSValidationResultsResponse = components["schemas"]["DNSValidationResultsResponse"];
type HTTPKeywordResultsResponse = components["schemas"]["HTTPKeywordResultsResponse"];
type CampaignDetailsResponse = components["schemas"]["CampaignDetailsResponse"];
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
export const getRichCampaignData = async (campaignId: string): Promise<RichCampaignData> => {
  // Check cache first
  const cached = richDataCache.get(campaignId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  try {
    // Get campaign summary
    const campaignResponse = await apiClient.getCampaignById(campaignId);
    const campaignDetails = campaignResponse as CampaignDetailsResponse;
    const campaign = campaignDetails.campaign as CampaignViewModel;

    // Initialize rich data with campaign summary
    const richData: RichCampaignData = {
      ...campaign,
      domains: [],
      dnsValidatedDomains: [],
      leads: [],
      httpKeywordResults: []
    };

    // Fetch detailed data in parallel
    const [
      generatedDomainsResponse,
      dnsValidationResponse,
      httpKeywordResponse
    ] = await Promise.allSettled([
      apiClient.getCampaignGeneratedDomains(campaignId, { limit: 1000 }),
      apiClient.getCampaignDNSValidationResults(campaignId, { limit: 1000 }),
      apiClient.getCampaignHTTPKeywordResults(campaignId, { limit: 1000 })
    ]);

    // Process generated domains
    if (generatedDomainsResponse.status === 'fulfilled') {
      const domainsData = generatedDomainsResponse.value as GeneratedDomainsResponse;
      if (domainsData.data) {
        richData.domains = domainsData.data
          .map(d => d.domainName)
          .filter(Boolean) as string[];
      }
    }

    // Process DNS validation results
    if (dnsValidationResponse.status === 'fulfilled') {
      const dnsData = dnsValidationResponse.value as DNSValidationResultsResponse;
      if (dnsData.data) {
        richData.dnsValidatedDomains = dnsData.data
          .filter(d => d.validationStatus === 'valid')
          .map(d => d.domainName)
          .filter(Boolean) as string[];
      }
    }

    // Process HTTP keyword results
    if (httpKeywordResponse.status === 'fulfilled') {
      const httpData = httpKeywordResponse.value as HTTPKeywordResultsResponse;
      if (httpData.data) {
        richData.httpKeywordResults = httpData.data;
        
        // Extract leads from HTTP keyword results
        const allLeads: RichCampaignData['leads'] = [];
        httpData.data.forEach(result => {
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
      const campaignResponse = await apiClient.getCampaignById(campaignId);
      const campaignDetails = campaignResponse as CampaignDetailsResponse;
      const campaign = campaignDetails.campaign as CampaignViewModel;
      
      return {
        ...campaign,
        domains: [],
        dnsValidatedDomains: [],
        leads: [],
        httpKeywordResults: []
      };
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
      if (result.status === 'fulfilled') {
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