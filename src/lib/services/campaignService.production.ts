// src/lib/services/campaignService.ts
// Production Campaign Service - Direct OpenAPI integration without adapters

import { campaignsApi } from '@/lib/api-client/client';
import type { components } from '@/lib/api-client/types';
import type { UpdateCampaignRequest } from '@/lib/api-client';
import type { FrontendCampaign } from '@/lib/types/frontend-safe-types';
import {
  extractResponseData,
  safeApiCall
} from '@/lib/utils/apiResponseHelpers';

// Use OpenAPI types directly
export type Campaign = components['schemas']['Campaign'];
export type CampaignCreationPayload = components['schemas']['CreateCampaignRequest'];

// Service layer response wrappers aligned with unified backend envelope format
export interface CampaignsListResponse {
  success: boolean;
  data: FrontendCampaign[];
  error: string | null;
  requestId: string;
  message?: string;
}

export interface CampaignDetailResponse {
  success: boolean;
  data?: Campaign;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface CampaignCreationResponse {
  success: boolean;
  data?: Campaign;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface CampaignServiceResponse {
  success: boolean;
  data?: Campaign;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface CampaignDeleteResponse {
  success: boolean;
  data?: null;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface CampaignResultsResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
  requestId: string;
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
    const result = await safeApiCall<FrontendCampaign[]>(
      () => campaignsApi.listCampaigns(100),
      'Getting campaigns'
    );
    
    return {
      success: result.success,
      data: result.data || [],
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaigns retrieved successfully' : result.error || 'Failed to get campaigns'
    };
  }

  async getCampaignById(campaignId: string): Promise<CampaignDetailResponse> {
    const result = await safeApiCall<{ campaign?: Campaign }>(
      () => campaignsApi.getCampaignDetails(campaignId),
      'Getting campaign by ID'
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        requestId: result.requestId
      };
    }
    
    if (!result.data?.campaign?.id) {
      return {
        success: false,
        error: 'Campaign not found or missing required fields',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
      };
    }
    
    return {
      success: true,
      data: result.data.campaign as Campaign,
      error: null,
      requestId: result.requestId,
      message: 'Campaign retrieved successfully'
    };
  }

  // Unified Campaign Creation Method
  async createCampaign(payload: CampaignCreationPayload): Promise<CampaignCreationResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.createCampaign(payload),
      'Creating campaign'
    );
    
    // Handle legacy response format with campaignId
    if (!result.success && result.error?.includes('campaignId')) {
      try {
        const response = await campaignsApi.createCampaign(payload);
        const legacyResult = extractResponseData<{ campaignId?: string; message?: string }>(response);
        
        if (legacyResult?.campaignId) {
          const campaignData = {
            id: legacyResult.campaignId,
            name: 'Created Campaign',
            campaignType: 'domain_generation',
            status: 'pending'
          } as Campaign;
          
          return {
            success: true,
            data: campaignData,
            error: null,
            requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36),
            message: legacyResult.message || 'Campaign created successfully'
          };
        }
      } catch {
        // Fall through to standard error handling
      }
    }
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign created successfully' : result.error || 'Failed to create campaign'
    };
  }

  // Campaign Update Operation using auto-generated OpenAPI client
  async updateCampaign(campaignId: string, updatePayload: UpdateCampaignRequest): Promise<CampaignServiceResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.updateCampaign(campaignId, updatePayload),
      'Updating campaign'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign updated successfully' : result.error || 'Failed to update campaign'
    };
  }

  // Campaign Control Operations
  async startCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.startCampaign(campaignId),
      'Starting campaign'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign started successfully' : result.error || 'Failed to start campaign'
    };
  }

  async pauseCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.pauseCampaign(campaignId),
      'Pausing campaign'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign paused successfully' : result.error || 'Failed to pause campaign'
    };
  }

  async resumeCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.resumeCampaign(campaignId),
      'Resuming campaign'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign resumed successfully' : result.error || 'Failed to resume campaign'
    };
  }

  async cancelCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.cancelCampaign(campaignId),
      'Cancelling campaign'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign cancelled successfully' : result.error || 'Failed to cancel campaign'
    };
  }

  async deleteCampaign(campaignId: string): Promise<CampaignDeleteResponse> {
    // First try to cancel the campaign if it's running
    try {
      await this.cancelCampaign(campaignId);
    } catch (error) {
      console.warn('[CampaignService] Campaign may already be cancelled:', error);
    }
    
    const result = await safeApiCall<null>(
      () => campaignsApi.deleteCampaign(campaignId),
      'Deleting campaign'
    );
    
    return {
      success: result.success,
      data: null,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Campaign deleted successfully' : result.error || 'Failed to delete campaign'
    };
  }

  // DNS Validation method for phase transitions
  async validateDNSForCampaign(campaignId: string): Promise<CampaignServiceResponse> {
    const result = await safeApiCall<Campaign>(
      () => campaignsApi.validateDNSForCampaign(campaignId, {
        campaignId: campaignId,
        onlyInvalidDomains: false
      }),
      'DNS validation for campaign'
    );
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'DNS validation started successfully' : result.error || 'Failed to start DNS validation'
    };
  }


  // Campaign Results
  async getGeneratedDomains(
    campaignId: string,
    options: { limit?: number; cursor?: number } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    const result = await safeApiCall<unknown[] | { domains?: unknown[] }>(
      () => campaignsApi.getGeneratedDomains(campaignId, options?.limit, options?.cursor),
      'Getting generated domains'
    );
    
    const data = Array.isArray(result.data) ? result.data : (result.data as any)?.domains || [];
    
    return {
      success: result.success,
      data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'Generated domains retrieved successfully' : result.error || 'Failed to get generated domains'
    };
  }

  async getDNSValidationResults(
    campaignId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    const result = await safeApiCall<unknown[] | { results?: unknown[] }>(
      () => campaignsApi.getDNSValidationResults(campaignId,
        options?.cursor ? parseInt(options.cursor, 10) : undefined,
        options?.limit ? options.limit.toString() : undefined
      ),
      'Getting DNS validation results'
    );
    
    const data = Array.isArray(result.data) ? result.data : (result.data as any)?.results || [];
    
    return {
      success: result.success,
      data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'DNS validation results retrieved successfully' : result.error || 'Failed to get DNS validation results'
    };
  }

  async getHTTPKeywordResults(
    campaignId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<CampaignResultsResponse<unknown[]>> {
    const result = await safeApiCall<unknown[] | { results?: unknown[] }>(
      () => campaignsApi.getHTTPKeywordResults(campaignId, options?.limit, options?.cursor),
      'Getting HTTP keyword results'
    );
    
    const data = Array.isArray(result.data) ? result.data : (result.data as any)?.results || [];
    
    return {
      success: result.success,
      data,
      error: result.error,
      requestId: result.requestId,
      message: result.success ? 'HTTP keyword results retrieved successfully' : result.error || 'Failed to get HTTP keyword results'
    };
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
