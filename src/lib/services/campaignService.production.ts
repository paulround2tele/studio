// src/lib/services/campaignService.ts
// Production Campaign Service - Direct OpenAPI integration without adapters

import { enhancedApiClient } from '@/lib/utils/enhancedApiClientFactory';
import type { components } from '@/lib/api-client/types';

// Use OpenAPI types directly
export type Campaign = components['schemas']['Campaign'];
export type CampaignCreationPayload = components['schemas']['CreateCampaignRequest'];

// Service layer response wrappers using OpenAPI types as base
export interface CampaignsListResponse {
  status: 'success' | 'error';
  data: Campaign[];
  message?: string;
}

export interface CampaignDetailResponse {
  status: 'success' | 'error';
  data?: Campaign;
  message?: string;
}

export interface CampaignCreationResponse {
  status: 'success' | 'error';
  data?: Campaign;
  message?: string;
}

export interface CampaignOperationResponse {
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
      const response = await enhancedApiClient.listCampaigns();
      
      // Extract data from AxiosResponse
      const result = 'data' in response ? response.data : response;
      
      return {
        status: 'success',
        data: Array.isArray(result) ? result as Campaign[] : [],
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
      const response = await enhancedApiClient.getCampaignById(campaignId);
      const result = 'data' in response ? response.data : response;
      
      // Extract campaign from wrapped response
      const campaign = (result as { campaign?: Campaign }).campaign || result;
      return {
        status: 'success',
        data: campaign as Campaign,
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
      
      const response = await enhancedApiClient.createCampaign(payload);
      const result = 'data' in response ? response.data : response;
      
      console.log('[CampaignService] Campaign created successfully:', result);
      return {
        status: 'success' as const,
        data: result as Campaign,
        message: 'Campaign created successfully'
      };
    } catch (error) {
      console.error('[CampaignService] Campaign creation failed:', error);
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Failed to create campaign'
      };
    }
  }

  // Campaign Control Operations
  async startCampaign(campaignId: string): Promise<CampaignOperationResponse> {
    try {
      console.log('[CampaignService] Starting campaign:', campaignId);
      const response = await enhancedApiClient.startCampaign(campaignId);
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

  async pauseCampaign(campaignId: string): Promise<CampaignOperationResponse> {
    try {
      console.log('[CampaignService] Pausing campaign:', campaignId);
      const response = await enhancedApiClient.pauseCampaign(campaignId);
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

  async resumeCampaign(campaignId: string): Promise<CampaignOperationResponse> {
    try {
      console.log('[CampaignService] Resuming campaign:', campaignId);
      const response = await enhancedApiClient.resumeCampaign(campaignId);
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

  async cancelCampaign(campaignId: string): Promise<CampaignOperationResponse> {
    try {
      console.log('[CampaignService] Cancelling campaign:', campaignId);
      const response = await enhancedApiClient.cancelCampaign(campaignId);
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
      await enhancedApiClient.deleteCampaign(campaignId);
      
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

  // Campaign Results
  async getGeneratedDomains(
    campaignId: string,
    options: { limit?: number; cursor?: number } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    try {
      console.log('[CampaignService] Getting generated domains for campaign:', campaignId, options);
      const response = await enhancedApiClient.campaigns.campaignsCampaignIdResultsGeneratedDomainsGet(campaignId, options?.limit, options?.cursor);
      const result = 'data' in response ? response.data : response;
      
      // Handle case where API returns {} instead of array
      let data: unknown[] = [];
      if (Array.isArray(result)) {
        data = result;
      } else if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        data = result.data;
      }
      
      return {
        status: 'success',
        data,
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
      const response = await enhancedApiClient.campaigns.campaignsCampaignIdResultsDnsValidationGet(campaignId, options?.limit, options?.cursor);
      const result = 'data' in response ? response.data : response;
      
      // Handle case where API returns {} instead of array
      let data: unknown[] = [];
      if (Array.isArray(result)) {
        data = result;
      } else if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        data = result.data;
      }
      
      return {
        status: 'success',
        data,
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
      const response = await enhancedApiClient.campaigns.campaignsCampaignIdResultsHttpKeywordGet(campaignId, options?.limit, options?.cursor);
      const result = 'data' in response ? response.data : response;
      
      // Handle case where API returns {} instead of array
      let data: unknown[] = [];
      if (Array.isArray(result)) {
        data = result;
      } else if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        data = result.data;
      }
      
      return {
        status: 'success',
        data,
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
