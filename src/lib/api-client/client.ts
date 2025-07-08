// Simple configuration for auto-generated OpenAPI clients
// Exports properly configured clients with auto-detected base URL

import { Configuration } from './api/configuration';
import {
  CampaignsApi,
  KeywordSetsApi,
  PersonasApi,
  ProxiesApi,
  ProxyPoolsApi,
  AuthApi,
  ConfigurationApi,
  ConfigApi
} from './api/api';

// Auto-detect backend URL
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

// Create shared configuration
const config = new Configuration({
  basePath: getSyncBackendUrl(),
});

// Export configured API clients
export const campaignsApi = new CampaignsApi(config);
export const keywordSetsApi = new KeywordSetsApi(config);
export const personasApi = new PersonasApi(config);
export const proxiesApi = new ProxiesApi(config);
export const proxyPoolsApi = new ProxyPoolsApi(config);
export const authApi = new AuthApi(config);
export const configurationApi = new ConfigurationApi(config);
export const configApi = new ConfigApi(config);

// Legacy compatibility - use campaigns API as default apiClient
export const apiClient = campaignsApi;

// Legacy compatibility alias
export const ApiClient = campaignsApi;

// Re-export types for compatibility
export type { components } from './types';
export type {
  Campaign,
  CreateCampaignRequest,
  CampaignDetailsResponse,
  CampaignListResponse,
  KeywordSet,
  CreateKeywordSetRequest,
  UpdateKeywordSetRequest,
  Persona,
  Proxy,
  ProxyPool,
  ProxyPoolRequest
} from './api/models';

// Re-export pattern offset types from api
export type {
  PatternOffsetRequest,
  GetDomainGenerationPatternOffset200Response
} from './api/api';

// Additional type exports for legacy compatibility
export type OperationRequestBody = Record<string, any>;
export type ApiPaths = Record<string, any>;