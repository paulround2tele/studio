// PROFESSIONAL API CLIENT BRIDGE - Clean method access with proper error handling
// Generated: August 12, 2025 by ULTIMATE COMPREHENSIVE RECONSTRUCTION
// Purpose: Professional wrapper for OpenAPI generated clients with proper configuration

import {
  CampaignsApi,
  PersonasApi,
  ProxiesApi,
  AuthenticationApi,
  KeywordSetsApi,
  BulkOperationsApi,
  Configuration
} from './index';

import type {
  Campaign,
  CreateCampaignPayload,
  CampaignPhase,
  PersonaResponse,
  CreatePersonaRequest,
  UpdatePersonaRequest,
  Proxy,
  ApiResponse
} from './types-bridge';

// ===================================================================================================
// PROFESSIONAL CONFIGURATION - Environment-aware setup
// ===================================================================================================

const createConfiguration = (): Configuration => {
  // Runtime environment detection
  const basePath = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

  return new Configuration({
    basePath,
    // Add authentication headers if available
    apiKey: typeof window !== 'undefined' 
      ? localStorage.getItem('apiKey') || undefined
      : process.env.API_KEY
  });
};

// ===================================================================================================
// API CLIENT INSTANCES - Properly configured
// ===================================================================================================

const config = createConfiguration();

// Create API instances
const campaignApiInstance = new CampaignsApi(config);
const personaApiInstance = new PersonasApi(config);
const proxyApiInstance = new ProxiesApi(config);
const authApiInstance = new AuthenticationApi(config);
const keywordSetApiInstance = new KeywordSetsApi(config);
const bulkApiInstance = new BulkOperationsApi(config);

// ===================================================================================================
// PROFESSIONAL API CLIENT - Using ACTUAL generated method names
// ===================================================================================================

export const apiClient = {
  // ===============================================================================================
  // CAMPAIGN OPERATIONS - Using ACTUAL method names discovered from analysis
  // ===============================================================================================
  campaigns: {
    // List all campaigns - ACTUAL METHOD: getCampaignsStandalone()
    list: async (): Promise<any> => {
      try {
        const response = await campaignApiInstance.getCampaignsStandalone();
        return response.data;
      } catch (error) {
        console.error('Failed to list campaigns:', error);
        throw error;
      }
    },

    // Create new campaign - ACTUAL METHOD: createLeadGenerationCampaign()
    create: async (data: CreateCampaignPayload): Promise<any> => {
      try {
        const response = await campaignApiInstance.createLeadGenerationCampaign(data);
        return response.data;
      } catch (error) {
        console.error('Failed to create campaign:', error);
        throw error;
      }
    },

    // Get campaign progress - ACTUAL METHOD: getCampaignProgressStandalone()
    getProgress: async (campaignId: string): Promise<any> => {
      try {
        const response = await campaignApiInstance.getCampaignProgressStandalone(campaignId);
        return response.data;
      } catch (error) {
        console.error(`Failed to get campaign progress for ${campaignId}:`, error);
        throw error;
      }
    },

    // Start campaign phase - ACTUAL METHOD: startPhaseStandalone()
    startPhase: async (campaignId: string, phase: any): Promise<any> => {
      try {
        const response = await campaignApiInstance.startPhaseStandalone(campaignId, phase);
        return response.data;
      } catch (error) {
        console.error(`Failed to start phase ${phase} for campaign ${campaignId}:`, error);
        throw error;
      }
    },

    // Configure campaign phase - ACTUAL METHOD: configurePhaseStandalone()
    configurePhase: async (campaignId: string, phase: any, config: any): Promise<any> => {
      try {
        const response = await campaignApiInstance.configurePhaseStandalone(campaignId, phase, config);
        return response.data;
      } catch (error) {
        console.error(`Failed to configure phase ${phase} for campaign ${campaignId}:`, error);
        throw error;
      }
    },

    // Get campaign phase status - ACTUAL METHOD: getPhaseStatusStandalone()
    getPhaseStatus: async (campaignId: string, phase: any): Promise<any> => {
      try {
        const response = await campaignApiInstance.getPhaseStatusStandalone(campaignId, phase);
        return response.data;
      } catch (error) {
        console.error(`Failed to get phase status ${phase} for campaign ${campaignId}:`, error);
        throw error;
      }
    },

    // Get campaign domains status - ACTUAL METHOD: getCampaignDomainsStatus()
    getDomainsStatus: async (campaignId: string): Promise<any> => {
      try {
        const response = await campaignApiInstance.getCampaignDomainsStatus(campaignId);
        return response.data;
      } catch (error) {
        console.error(`Failed to get domains status for campaign ${campaignId}:`, error);
        throw error;
      }
    }
  },

  // ===============================================================================================
  // PERSONA OPERATIONS - Using ACTUAL method names from personas-api.ts
  // ===============================================================================================
  personas: {
    // List all personas - ACTUAL METHOD: personasGet()
    list: async (limit?: number, offset?: number, isEnabled?: boolean, personaType?: string): Promise<any> => {
      try {
        const response = await personaApiInstance.personasGet(limit, offset, isEnabled, personaType);
        return response.data;
      } catch (error) {
        console.error('Failed to list personas:', error);
        throw error;
      }
    },

    // Create new persona - ACTUAL METHOD: personasPost()
    create: async (data: CreatePersonaRequest): Promise<any> => {
      try {
        const response = await personaApiInstance.personasPost(data);
        return response.data;
      } catch (error) {
        console.error('Failed to create persona:', error);
        throw error;
      }
    },

    // Update persona - ACTUAL METHOD: personasIdPut()
    update: async (id: string, data: UpdatePersonaRequest): Promise<any> => {
      try {
        const response = await personaApiInstance.personasIdPut(id, data);
        return response.data;
      } catch (error) {
        console.error(`Failed to update persona ${id}:`, error);
        throw error;
      }
    },

    // Delete persona - ACTUAL METHOD: personasIdDelete()
    delete: async (id: string): Promise<any> => {
      try {
        const response = await personaApiInstance.personasIdDelete(id);
        return response.data;
      } catch (error) {
        console.error(`Failed to delete persona ${id}:`, error);
        throw error;
      }
    },

    // Test persona - ACTUAL METHOD: personasIdTestPost()
    test: async (id: string): Promise<any> => {
      try {
        const response = await personaApiInstance.personasIdTestPost(id);
        return response.data;
      } catch (error) {
        console.error(`Failed to test persona ${id}:`, error);
        throw error;
      }
    },

    // Get persona by ID - ACTUAL METHOD: personasIdGet()
    getById: async (id: string): Promise<any> => {
      try {
        const response = await personaApiInstance.personasIdGet(id);
        return response.data;
      } catch (error) {
        console.error(`Failed to get persona ${id}:`, error);
        throw error;
      }
    }
  },

  // ===============================================================================================
  // PROXY OPERATIONS - Using ACTUAL method names from proxies-api.ts
  // ===============================================================================================
  proxies: {
    // List all proxies - ACTUAL METHOD: proxiesGet()
    list: async (limit?: number, offset?: number, protocol?: string, isEnabled?: boolean, isHealthy?: boolean): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesGet(limit, offset, protocol, isEnabled, isHealthy);
        return response.data;
      } catch (error) {
        console.error('Failed to list proxies:', error);
        throw error;
      }
    },

    // Create new proxy - ACTUAL METHOD: proxiesPost()
    create: async (data: any): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesPost(data);
        return response.data;
      } catch (error) {
        console.error('Failed to create proxy:', error);
        throw error;
      }
    },

    // Update proxy - ACTUAL METHOD: proxiesProxyIdPut()
    update: async (proxyId: string, data: any): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesProxyIdPut(proxyId, data);
        return response.data;
      } catch (error) {
        console.error(`Failed to update proxy ${proxyId}:`, error);
        throw error;
      }
    },

    // Delete proxy - ACTUAL METHOD: proxiesProxyIdDelete()
    delete: async (proxyId: string): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesProxyIdDelete(proxyId);
        return response.data;
      } catch (error) {
        console.error(`Failed to delete proxy ${proxyId}:`, error);
        throw error;
      }
    },

    // Test proxy - ACTUAL METHOD: proxiesProxyIdTestPost()
    test: async (proxyId: string): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesProxyIdTestPost(proxyId);
        return response.data;
      } catch (error) {
        console.error(`Failed to test proxy ${proxyId}:`, error);
        throw error;
      }
    },

    // Health check proxy - ACTUAL METHOD: proxiesProxyIdHealthCheckPost()
    healthCheck: async (proxyId: string): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesProxyIdHealthCheckPost(proxyId);
        return response.data;
      } catch (error) {
        console.error(`Failed to health check proxy ${proxyId}:`, error);
        throw error;
      }
    },

    // Bulk test proxies - ACTUAL METHOD: proxiesBulkTestPost()
    bulkTest: async (data: any): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesBulkTestPost(data);
        return response.data;
      } catch (error) {
        console.error('Failed to bulk test proxies:', error);
        throw error;
      }
    },

    // Bulk update proxies - ACTUAL METHOD: proxiesBulkUpdatePut()
    bulkUpdate: async (data: any): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesBulkUpdatePut(data);
        return response.data;
      } catch (error) {
        console.error('Failed to bulk update proxies:', error);
        throw error;
      }
    },

    // Bulk delete proxies - ACTUAL METHOD: proxiesBulkDeleteDelete()
    bulkDelete: async (data: any): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesBulkDeleteDelete(data);
        return response.data;
      } catch (error) {
        console.error('Failed to bulk delete proxies:', error);
        throw error;
      }
    },

    // Get proxy status - ACTUAL METHOD: proxiesStatusGet()
    getStatus: async (): Promise<any> => {
      try {
        const response = await proxyApiInstance.proxiesStatusGet();
        return response.data;
      } catch (error) {
        console.error('Failed to get proxy status:', error);
        throw error;
      }
    }
  },

  // ===============================================================================================
  // AUTHENTICATION OPERATIONS - Using ACTUAL method names from authentication-api.ts
  // ===============================================================================================
  auth: {
    // Login user - ACTUAL METHOD: loginUser()
    login: async (credentials: any): Promise<any> => {
      try {
        const response = await authApiInstance.loginUser(credentials);
        return response.data;
      } catch (error) {
        console.error('Failed to login:', error);
        throw error;
      }
    },

    // Logout user - ACTUAL METHOD: logoutUser()
    logout: async (): Promise<any> => {
      try {
        const response = await authApiInstance.logoutUser();
        return response.data;
      } catch (error) {
        console.error('Failed to logout:', error);
        throw error;
      }
    },

    // Get current user - ACTUAL METHOD: getCurrentUser()
    me: async (): Promise<any> => {
      try {
        const response = await authApiInstance.getCurrentUser();
        return response.data;
      } catch (error) {
        console.error('Failed to get current user:', error);
        throw error;
      }
    },

    // Change password - ACTUAL METHOD: changePassword()
    changePassword: async (data: any): Promise<any> => {
      try {
        const response = await authApiInstance.changePassword(data);
        return response.data;
      } catch (error) {
        console.error('Failed to change password:', error);
        throw error;
      }
    },

    // Refresh session - ACTUAL METHOD: refreshSession()
    refresh: async (): Promise<any> => {
      try {
        const response = await authApiInstance.refreshSession();
        return response.data;
      } catch (error) {
        console.error('Failed to refresh session:', error);
        throw error;
      }
    }
  }
};

// ===================================================================================================
// INDIVIDUAL API INSTANCES - Export for direct usage if needed
// ===================================================================================================

export const campaignApi = campaignApiInstance;
export const personaApi = personaApiInstance;
export const proxyApi = proxyApiInstance;
export const authApi = authApiInstance;
export const keywordSetApi = keywordSetApiInstance;
export const bulkApi = bulkApiInstance;

// ===================================================================================================
// ERROR HANDLING UTILITIES
// ===================================================================================================

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// ===================================================================================================
// EXPORT SUMMARY & PHASE 1 COMPLETION
// ===================================================================================================

/*
 * PROFESSIONAL API CLIENT BRIDGE COMPLETION - PHASE 1
 * 
 * ✅ DISCOVERED ACTUAL METHOD NAMES:
 * - getCampaignsStandalone() for listing campaigns
 * - createLeadGenerationCampaign() for campaign creation  
 * - getCampaignProgressStandalone() for campaign progress
 * - personasGet() for listing personas
 * - personasPost() for creating personas
 * - personasIdPut() for updating personas
 * - personasIdDelete() for deleting personas
 * - personasIdTestPost() for testing personas
 * 
 * ✅ PROFESSIONAL CONFIGURATION with environment detection
 * ✅ PROPER ERROR HANDLING with try/catch blocks
 * ✅ TYPESCRIPT COMPATIBLE - no type assertion issues
 * 
 * Usage:
 * import { apiClient } from '@/lib/api-client/client-bridge';
 * const campaigns = await apiClient.campaigns.list();
 * 
 * PHASE 1 READY FOR VALIDATION AND GIT COMMIT
 */
