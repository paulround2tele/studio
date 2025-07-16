/**
 * Campaign Data Service
 *
 * Provides rich campaign data by combining campaign summaries with detailed data endpoints.
 * This service bridges the architectural gap between the backend's count-based campaign summaries
 * and the frontend's need for rich array data.
 *
 * Features real-time cache invalidation via WebSocket phase transition events.
 */

import { campaignService } from './campaignService.production';
import { CampaignViewModel, components } from '../types';
import { PhaseTransitionMessage, WebSocketMessageTypes as _WebSocketMessageTypes } from '../websocket/message-handlers';

// Extract types from the OpenAPI schema
type _GeneratedDomain = components['schemas']['GeneratedDomain']; // Unused
type _DNSValidationResult = components['schemas']['DNSValidationResult']; // Unused
type HTTPKeywordResult = components['schemas']['HTTPKeywordResult'];

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

// WebSocket event listener for real-time cache invalidation
let isWebSocketListenerInitialized = false;

/**
 * Initializes WebSocket listeners for real-time cache invalidation
 */
const initializePhaseTransitionListener = () => {
  if (isWebSocketListenerInitialized) return;
  
  // This will be connected to the global WebSocket client when available
  // For now, we'll use a simple event system that can be connected later
  if (typeof window !== 'undefined') {
    window.addEventListener('phase_transition', (event: any) => {
      const phaseTransitionData = event.detail as PhaseTransitionMessage['data'];
      console.log(`[campaignDataService] Phase transition detected: ${phaseTransitionData.campaignId} → ${phaseTransitionData.newPhase}`);
      
      // Immediately invalidate cache for the affected campaign
      clearRichDataCache(phaseTransitionData.campaignId);
      
      // Broadcast cache invalidation event for other components
      window.dispatchEvent(new CustomEvent('campaign_cache_invalidated', {
        detail: {
          campaignId: phaseTransitionData.campaignId,
          reason: 'phase_transition',
          newPhase: phaseTransitionData.newPhase
        }
      }));
    });
    
    // 🔧 PHASE TRANSITION FIX: Listen for force refresh events from navigation
    window.addEventListener('force_campaign_refresh', (event: any) => {
      const { campaignId } = event.detail || {};
      if (campaignId) {
        console.log(`[campaignDataService] Force refresh requested for campaign ${campaignId}`);
        clearRichDataCache(campaignId);
        
        // Also trigger a broader cache clear event for components
        window.dispatchEvent(new CustomEvent('campaign_cache_invalidated', {
          detail: { campaignId, reason: 'force_refresh' }
        }));
      }
    });
    
    isWebSocketListenerInitialized = true;
    console.log('[campaignDataService] Phase transition listener initialized');
  }
};

/**
 * Handles phase transition events from WebSocket messages
 */
export const handlePhaseTransition = (message: PhaseTransitionMessage): void => {
  console.log(`[campaignDataService] WebSocket phase transition: ${message.data.campaignId} → ${message.data.newPhase}`);
  
  // Immediately invalidate cache
  clearRichDataCache(message.data.campaignId);
  
  // Dispatch browser event for components not directly subscribed to WebSocket
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('phase_transition', { detail: message.data }));
  }
};

/**
 * Fetches rich campaign data by combining campaign summary with detailed endpoints
 */
export const getRichCampaignData = async (campaignId: string): Promise<RichCampaignData | null> => {
  // Initialize phase transition listener on first call
  initializePhaseTransitionListener();
  
  // Check cache first
  const cached = richDataCache.get(campaignId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  try {
    // Get campaign summary via service layer
    const campaignResponse = await campaignService.getCampaignById(campaignId);
    if (campaignResponse.success !== true || !campaignResponse.data) {
      throw new Error(`Failed to fetch campaign: ${campaignResponse.message}`);
    }
    const campaign = campaignResponse.data as CampaignViewModel;

    // 🔧 CRITICAL FIX: Enhanced null check to handle transition states
    if (!campaign || !campaign.campaignType) {
      console.warn(`[campaignDataService] Invalid campaign data for ${campaignId}:`, campaign);
      console.warn(`[campaignDataService] This may be a campaign in transition state or corrupted data.`);
      
      // 🔧 ENHANCED RETRY LOGIC: Multiple attempts with progressive delays for phase transitions
      const maxRetries = 3;
      const baseDelay = 500;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[campaignDataService] Retry attempt ${attempt}/${maxRetries} for campaign ${campaignId}`);
        
        // Progressive delay: 500ms, 1000ms, 1500ms
        const delay = baseDelay * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          const retryResponse = await campaignService.getCampaignById(campaignId);
          if (retryResponse.success === true && retryResponse.data?.campaignType) {
            console.log(`[campaignDataService] Retry ${attempt} successful, campaign type: ${retryResponse.data.campaignType}`);
            // Update campaign with retry result and continue processing
            Object.assign(campaign, retryResponse.data);
            break; // Success, exit retry loop
          } else if (attempt === maxRetries) {
            console.warn(`[campaignDataService] All retries exhausted, returning null for graceful handling`);
            return null;
          }
        } catch (retryError) {
          console.warn(`[campaignDataService] Retry ${attempt} error:`, retryError);
          if (attempt === maxRetries) {
            return null;
          }
        }
      }
      
      // Final check after retries
      if (!campaign || !campaign.campaignType) {
        console.warn(`[campaignDataService] Campaign still invalid after retries, likely permanently unavailable`);
        return null;
      }
    }

    // Initialize rich data with campaign summary
    const richData: RichCampaignData = {
      ...campaign,
      domains: [],
      dnsValidatedDomains: [],
      leads: [],
      httpKeywordResults: []
    };

    // 🔥 PHASE-AWARE DOMAIN LOADING: DNS validation and HTTP validation campaigns are essentially
    // domain generation campaigns that have transitioned to validation phases. They ALWAYS need generated domains.
    const isHttpKeywordCampaign = campaign.campaignType === 'http_keyword_validation';
    const isDNSValidationCampaign = campaign.campaignType === 'dns_validation';
    
    // 🔧 CRITICAL FIX: Robust domain generation history detection
    // Always attempt to load domains for campaigns with generation history, regardless of transition state
    const hasDomainGenerationHistory =
      campaign.domainGenerationParams !== undefined ||
      campaign.campaignType === 'domain_generation' ||
      campaign.campaignType === 'dns_validation' ||
      campaign.campaignType === 'http_keyword_validation' ||
      // FALLBACK: If we have DNS params, we likely have domain history
      campaign.dnsValidationParams !== undefined;
    
    console.log(`[campaignDataService] Phase-aware loading for campaign ${campaignId}:`, {
      campaignType: campaign.campaignType,
      hasDomainGenerationHistory,
      isDNSValidationCampaign,
      isHttpKeywordCampaign
    });
    
    // Build requests array with phase-aware logic
    const requests = [];
    
    // ALWAYS load generated domains for campaigns with domain generation history
    if (hasDomainGenerationHistory) {
      console.log(`[campaignDataService] Loading generated domains for ${campaign.campaignType} campaign`);
      requests.push(campaignService.getGeneratedDomains(campaignId, { limit: 1000 }));
    }
    
    // ALWAYS load DNS validation results for all campaigns (they return empty if not applicable)
    requests.push(campaignService.getDNSValidationResults(campaignId, { limit: 1000 }));
    
    // Load HTTP keyword results only for HTTP campaigns
    if (isHttpKeywordCampaign) {
      requests.push(campaignService.getHTTPKeywordResults(campaignId, { limit: 1000 }));
    }

    // Fetch detailed data in parallel
    const responses = await Promise.allSettled(requests);
    
    // 🔧 CRITICAL FIX: Handle conditional response array based on what was actually requested
    let responseIndex = 0;
    let generatedDomainsResponse;
    let dnsValidationResponse;
    let httpKeywordResponse;
    
    // Map responses based on what was actually requested
    if (hasDomainGenerationHistory) {
      generatedDomainsResponse = responses[responseIndex++];
    }
    dnsValidationResponse = responses[responseIndex++];
    if (isHttpKeywordCampaign) {
      httpKeywordResponse = responses[responseIndex++];
    }

    console.log(`[campaignDataService] Response mapping for ${campaignId}:`, {
      requestCount: requests.length,
      responseCount: responses.length,
      hasGeneratedDomainsResponse: !!generatedDomainsResponse,
      hasDnsValidationResponse: !!dnsValidationResponse,
      hasHttpKeywordResponse: !!httpKeywordResponse
    });

    // Process generated domains with proper error handling (only if requested)
    if (hasDomainGenerationHistory && generatedDomainsResponse?.status === 'fulfilled') {
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
      if (campaignResponse.success === true && campaignResponse.data) {
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