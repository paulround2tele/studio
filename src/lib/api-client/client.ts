// Auto-generated API client configuration
// Uses pure OpenAPI-generated clients with auto-detected base URL

import { Configuration } from './api/configuration';
import { CampaignsApi } from './api/api/campaigns-api';

// Auto-detect backend URL - handles dev/prod environments
const getSyncBackendUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return configured;
  }
  
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    
    if (port === '3000') {
      return `${protocol}//${hostname}:8080/api/v2`;
    }
    
    return `${protocol}//${hostname}${port ? `:${port}` : ''}/api/v2`;
  }
  
  return 'http://localhost:8080/api/v2';
};

// Create configuration with auto-detected base URL
const getApiConfiguration = () => {
  const baseURL = getSyncBackendUrl();
  return new Configuration({
    basePath: baseURL,
  });
};

// Create pre-configured API client instances
export const campaignsApi = new CampaignsApi(getApiConfiguration());

// Legacy compatibility wrapper for existing code
export const apiClient = {
  createCampaign: async (data: any) => {
    const response = await campaignsApi.createCampaign(data);
    return response.data;
  },
  
  getCampaigns: async () => {
    const response = await campaignsApi.listCampaigns();
    return response.data;
  },
  
  getCampaignDetails: async (campaignId: string) => {
    const response = await campaignsApi.getCampaignDetails(campaignId);
    return response.data;
  },
  
  startCampaign: async (campaignId: string) => {
    const response = await campaignsApi.startCampaign(campaignId);
    return response.data;
  },
  
  getGeneratedDomains: async (campaignId: string, limit?: number, cursor?: number) => {
    const response = await campaignsApi.getGeneratedDomains(campaignId, limit, cursor);
    return response.data;
  }
};

// Re-export types for compatibility
export type { components } from './types';
export type { 
  Campaign,
  CreateCampaignRequest,
  CampaignDetailsResponse 
} from './api/models';