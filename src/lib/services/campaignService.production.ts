// src/lib/services/campaignService.ts
// Production Campaign Service - Direct OpenAPI integration without adapters

import { campaignsApi } from '@/lib/api-client/client';
import type { components } from '@/lib/api-client/types';
import type { UpdateCampaignRequest } from '@/lib/api-client';
import type { FrontendCampaign } from '@/lib/types/frontend-safe-types';

// Use OpenAPI types directly
export type Campaign = components['schemas']['Campaign'];
export type CampaignCreationPayload = components['schemas']['CreateCampaignRequest'];

// Service layer response wrappers using frontend-safe types
export interface CampaignsListResponse {
  status: 'success' | 'error';
  data: FrontendCampaign[];
  message?: string;
}

export interface CampaignDetailResponse {
  status: 'success' | 'error';
  data?: FrontendCampaign;
  message?: string;
}

export interface CampaignCreationResponse {
  status: 'success' | 'error';
  data?: Campaign;
  message?: string;
}

export interface CampaignServiceResponse {
  status: 'success' | 'error';
  data?: Campaign;
  message?: string;
}

export interface CampaignDeleteResponse {
  status: 'success' | 'error';
  data?: null;
  message?: string;
}

export interface CampaignResultsResponse<T = unknown> {
  status: 'success' | 'error';
  data: T;
  error?: string;
  message?: string;
}

// Import additional OpenAPI result types for direct use
export type GeneratedDomainsResponse = components['schemas']['GeneratedDomainsResponse'];
export type DNSValidationResultsResponse = components['schemas']['DNSValidationResultsResponse'];
export type HTTPKeywordResultsResponse = components['schemas']['HTTPKeywordResultsResponse'];

class CampaignService {
  private static instance: CampaignService;

  constructor() {
    // Enhanced API client already provides circuit breaker and retry logic
    // No need to duplicate the resilient wrapper
  }

  static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  // Campaign Management
  async getCampaigns(_options?: { limit?: number; sortBy?: string; sortOrder?: string }): Promise<CampaignsListResponse> {
    try {
      console.log('[CampaignService] Getting campaigns');
      // Request all campaigns with high limit to avoid pagination truncation
      const response = await campaignsApi.listCampaigns(100);
      
      // Handle new Swagger-generated API response format: { success: true, data: Campaign[] }
      const responseData = 'data' in response ? response.data : response;
      let campaignsArray: Campaign[] = [];
      
      if (responseData && typeof responseData === 'object') {
        if ('success' in responseData && responseData.success === true && 'data' in responseData) {
          // New format: { success: true, data: Campaign[], requestId: string }
          const nestedData = responseData.data;
          if (Array.isArray(nestedData)) {
            campaignsArray = nestedData as Campaign[];
          }
        } else if (Array.isArray(responseData)) {
          // Legacy direct array format
          campaignsArray = responseData as Campaign[];
        }
      }
      
      return {
        status: 'success',
        data: campaignsArray,
        message: 'Campaigns retrieved successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Failed to get campaigns:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  async getCampaignById(campaignId: string): Promise<CampaignDetailResponse> {
    try {
      console.log('[CampaignService] Getting campaign by ID:', campaignId);
      const response = await campaignsApi.getCampaignDetails(campaignId);
      
      // Enhanced diagnostic logging to debug response structure
      console.log('[CampaignService] RAW API RESPONSE for', campaignId, ':', JSON.stringify(response, null, 2));
      console.log('[CampaignService] Response type:', typeof response);
      console.log('[CampaignService] Response constructor:', response?.constructor?.name);
      console.log('[CampaignService] Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
      
      // The API should return CampaignDetailsResponse: { campaign: CampaignData, params: CampaignParamsData }
      let campaign: Campaign;
      let responseData: any = response;
      
      // Handle Axios wrapper if present
      if ('data' in response && response.data) {
        responseData = response.data;
        console.log('[CampaignService] Unwrapped Axios response.data:', JSON.stringify(responseData, null, 2));
      }
      
      // Check if we have the expected CampaignDetailsResponse structure
      if (responseData && typeof responseData === 'object' && 'campaign' in responseData) {
        console.log('[CampaignService] Found campaign in response.campaign');
        campaign = responseData.campaign as Campaign;
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        console.log('[CampaignService] Found data in response.data, checking if it contains campaign');
        const nestedData = responseData.data;
        if (nestedData && typeof nestedData === 'object' && 'campaign' in nestedData) {
          campaign = nestedData.campaign as Campaign;
        } else {
          // Assume the nested data is the campaign itself
          campaign = nestedData as Campaign;
        }
      } else {
        // Assume the response itself is the campaign (fallback)
        console.log('[CampaignService] Treating entire response as campaign data');
        campaign = responseData as Campaign;
      }
      
      // Enhanced validation and debugging
      console.log('[CampaignService] EXTRACTED CAMPAIGN:', JSON.stringify(campaign, null, 2));
      console.log('[CampaignService] Campaign type:', typeof campaign);
      console.log('[CampaignService] Campaign keys:', campaign && typeof campaign === 'object' ? Object.keys(campaign) : 'N/A');
      
      if (!campaign || typeof campaign !== 'object') {
        console.error('[CampaignService] VALIDATION FAILED: Invalid campaign data structure');
        console.error('[CampaignService] Expected: object with campaign data');
        console.error('[CampaignService] Received:', campaign);
        throw new Error('Campaign not found in response');
      }
      
      // Handle potential field name inconsistencies
      if (!campaign.campaignType && (campaign as any).campaign_type) {
        console.log('[CampaignService] Converting campaign_type to campaignType');
        (campaign as any).campaignType = (campaign as any).campaign_type;
      }
      
      // Validate required fields
      if (!campaign.id) {
        console.error('[CampaignService] VALIDATION FAILED: Campaign missing required id field');
        throw new Error('Campaign data missing required fields');
      }
      
      console.log('[CampaignService] ✅ Campaign validation successful');
      return {
        status: 'success',
        data: campaign,
        message: 'Campaign retrieved successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Failed to get campaign:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Unified Campaign Creation Method
  async createCampaign(payload: CampaignCreationPayload): Promise<CampaignCreationResponse> {
    try {
      console.log('[CampaignService] Creating campaign with payload:', payload);
      
      const response = await campaignsApi.createCampaign(payload);
      const result = 'data' in response ? response.data : response;
      
      console.log('[CampaignService] Raw API response:', JSON.stringify(response, null, 2));
      console.log('[CampaignService] Extracted result:', JSON.stringify(result, null, 2));
      console.log('[CampaignService] Result type:', typeof result);
      console.log('[CampaignService] Result has campaignId:', result && typeof result === 'object' && 'campaignId' in result);
      
      // Handle the actual response structure: { success: true, data: Campaign, requestId: "..." }
      if (result && typeof result === 'object' && 'success' in result && result.success === true) {
        console.log('[CampaignService] Found success response, checking for data field');
        
        if ('data' in result && result.data && typeof result.data === 'object') {
          const campaignData = result.data as Campaign;
          console.log('[CampaignService] Extracted campaign data from success response:', campaignData);
          
          if (campaignData.id) {
            console.log('[CampaignService] ✅ Campaign created successfully with ID:', campaignData.id);
            
            return {
              status: 'success' as const,
              data: campaignData,
              message: 'Campaign created successfully'
            };
          } else {
            console.error('[CampaignService] Campaign data missing ID field:', campaignData);
          }
        } else {
          console.error('[CampaignService] Success response missing data field:', result);
        }
      }
      
      // Legacy handling for CampaignOperationResponse (if backend still sends this format)
      if (result && typeof result === 'object' && 'campaignId' in result) {
        const operationResponse = result as { success?: boolean; message?: string; campaignId?: string; status?: string };
        
        console.log('[CampaignService] Found legacy campaignId format:', operationResponse.campaignId);
        
        if (operationResponse.campaignId) {
          // Create a minimal Campaign object with the ID from the operation response
          const campaignData = {
            id: operationResponse.campaignId,
            name: 'Created Campaign',
            campaignType: 'domain_generation',
            status: 'pending'
          } as Campaign;
          
          return {
            status: 'success' as const,
            data: campaignData,
            message: operationResponse.message || 'Campaign created successfully'
          };
        }
      }
      
      // Enhanced debugging for unexpected response structure
      console.error('[CampaignService] Response structure analysis:');
      console.error('- Response keys:', result && typeof result === 'object' ? Object.keys(result) : 'N/A');
      console.error('- Full response:', JSON.stringify(response, null, 2));
      console.error('- Extracted result:', JSON.stringify(result, null, 2));
      
      throw new Error('Invalid response structure from campaign creation API');
    } catch (error) {
      console.error('[CampaignService] Campaign creation failed:', error);
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Failed to create campaign'
      };
    }
  }

  // Campaign Update Operation using auto-generated OpenAPI client
  async updateCampaign(campaignId: string, updatePayload: UpdateCampaignRequest): Promise<CampaignServiceResponse> {
    try {
      console.log('[CampaignService] Updating campaign:', campaignId, updatePayload);
      
      const response = await campaignsApi.updateCampaign(campaignId, updatePayload);
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: result as Campaign,
        message: 'Campaign updated successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Campaign update failed:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update campaign'
      };
    }
  }

  // Campaign Control Operations
  async startCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    try {
      console.log('[CampaignService] Starting campaign:', campaignId);
      const response = await campaignsApi.startCampaign(campaignId);
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: result as unknown as Campaign,
        message: 'Campaign started successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Start campaign error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pauseCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    try {
      console.log('[CampaignService] Pausing campaign:', campaignId);
      const response = await campaignsApi.pauseCampaign(campaignId);
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: result as unknown as Campaign,
        message: 'Campaign paused successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Pause campaign error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async resumeCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    try {
      console.log('[CampaignService] Resuming campaign:', campaignId);
      const response = await campaignsApi.resumeCampaign(campaignId);
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: result as unknown as Campaign,
        message: 'Campaign resumed successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Resume campaign error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cancelCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    try {
      console.log('[CampaignService] Cancelling campaign:', campaignId);
      const response = await campaignsApi.cancelCampaign(campaignId);
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: result as unknown as Campaign,
        message: 'Campaign cancelled successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Cancel campaign error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteCampaign(campaignId: string): Promise<CampaignDeleteResponse> {
    try {
      console.log('[CampaignService] Deleting campaign:', campaignId);
      
      // First try to cancel the campaign if it's running
      try {
        await this.cancelCampaign(campaignId);
      } catch (error) {
        console.warn('[CampaignService] Campaign may already be cancelled:', error);
      }
      
      // Then delete it
      await campaignsApi.deleteCampaign(campaignId);
      
      return {
        status: 'success',
        data: null,
        message: 'Campaign deleted successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Delete campaign error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // DNS Validation method for phase transitions
  async validateDNSForCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    try {
      console.log('[CampaignService] Triggering DNS validation for campaign:', campaignId);
      const response = await campaignsApi.validateDNSForCampaign(campaignId, {
        campaignId: campaignId,
        onlyInvalidDomains: false
      });
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: result as unknown as Campaign,
        message: 'DNS validation started successfully'
      };
    } catch (error) {
      console.error('[CampaignService] DNS validation error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to start DNS validation'
      };
    }
  }


  // Campaign Results
  async getGeneratedDomains(
    campaignId: string,
    options: { limit?: number; cursor?: number } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    try {
      console.log('[CampaignService] Getting generated domains for campaign:', campaignId, options);
      const response = await campaignsApi.getGeneratedDomains(campaignId, options?.limit, options?.cursor);
      
      // Extract data from AxiosResponse
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: Array.isArray(result) ? result : (result as any)?.domains || [],
        message: 'Generated domains retrieved successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Failed to get generated domains:', error);
      return {
        status: 'error',
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getDNSValidationResults(
    campaignId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    try {
      console.log('[CampaignService] Getting DNS validation results for campaign:', campaignId, options);
      const response = await campaignsApi.getDNSValidationResults(campaignId,
        options?.cursor ? parseInt(options.cursor, 10) : undefined,
        options?.limit ? options.limit.toString() : undefined
      );
      
      // Extract data from AxiosResponse
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: Array.isArray(result) ? result : (result as any)?.results || [],
        message: 'DNS validation results retrieved successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Failed to get DNS validation results:', error);
      return {
        status: 'error',
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getHTTPKeywordResults(
    campaignId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    try {
      console.log('[CampaignService] Getting HTTP keyword results for campaign:', campaignId, options);
      // TODO: These results methods need to be implemented with correct API client
      const response = await campaignsApi.getHTTPKeywordResults(campaignId, options?.limit, options?.cursor);
      
      // Extract data from AxiosResponse
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: Array.isArray(result) ? result : (result as any)?.results || [],
        message: 'HTTP keyword results retrieved successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Failed to get HTTP keyword results:', error);
      return {
        status: 'error',
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get circuit breaker state for monitoring
   * Enhanced API client handles circuit breaking internally
   */
  getCircuitBreakerState(): string {
    return 'CLOSED'; // Enhanced API client handles this internally
  }

  /**
   * Reset circuit breaker manually
   * Enhanced API client handles circuit breaking internally
   */
  resetCircuitBreaker(): void {
    // No-op - enhanced API client handles circuit breaking internally
  }
}

// Export singleton and functions for backward compatibility
export const campaignService = CampaignService.getInstance();

export const getCampaigns = (options?: { limit?: number; sortBy?: string; sortOrder?: string }) => campaignService.getCampaigns(options);
export const getCampaignById = (campaignId: string) => campaignService.getCampaignById(campaignId);
export const createCampaign = (payload: CampaignCreationPayload) => campaignService.createCampaign(payload);
export const startCampaign = (campaignId: string) => campaignService.startCampaign(campaignId);
export const pauseCampaign = (campaignId: string) => campaignService.pauseCampaign(campaignId);
export const resumeCampaign = (campaignId: string) => campaignService.resumeCampaign(campaignId);
export const cancelCampaign = (campaignId: string) => campaignService.cancelCampaign(campaignId);
export const deleteCampaign = (campaignId: string) => campaignService.deleteCampaign(campaignId);
export const getGeneratedDomains = (campaignId: string, options?: Parameters<typeof campaignService.getGeneratedDomains>[1]) => 
  campaignService.getGeneratedDomains(campaignId, options);
export const getDNSValidationResults = (campaignId: string, options?: Parameters<typeof campaignService.getDNSValidationResults>[1]) =>
  campaignService.getDNSValidationResults(campaignId, options);
export const getHTTPKeywordResults = (campaignId: string, options?: Parameters<typeof campaignService.getHTTPKeywordResults>[1]) =>
  campaignService.getHTTPKeywordResults(campaignId, options);
export const validateDNSForCampaign = (campaignId: string) => campaignService.validateDNSForCampaign(campaignId);

// Legacy aliases for compatibility
export const createCampaignUnified = createCampaign;
export const chainCampaign = cancelCampaign; // Legacy alias
export const startCampaignPhase = startCampaign;
export const stopCampaign = cancelCampaign;
export const listCampaigns = getCampaigns;

// Mock analyzeContent function for backward compatibility
export const analyzeContent = async (input: unknown, campaignId: string, itemId: string): Promise<Record<string, unknown>> => {
  console.log('[CampaignService] analyzeContent called (mock implementation):', { input, campaignId, itemId });
  // This is a mock implementation since the backend API for this is not yet implemented
  return Promise.resolve({
    status: 'success',
    data: {
      summary: 'AI analysis completed (mock)',
      advancedKeywords: ['keyword1', 'keyword2'],
      categories: ['category1'],
      sentiment: 'Positive'
    }
  });
};

export default campaignService;
