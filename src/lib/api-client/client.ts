// Clean API Client Configuration
// Auto-generated API instances with proper configuration
// DO NOT manually add custom methods - use the auto-generated APIs directly

import {
  AuthApi,
  CampaignsApi,
  ConfigApi,
  ConfigurationApi,
  KeywordSetsApi,
  PersonasApi,
  ProxiesApi,
  ProxyPoolsApi,
  UtilitiesApi,
  Configuration
} from './index';

// Get API base URL from environment or use default
const getApiBaseUrl = (): string => {
  // Check for environment variable first (runtime)
  if (typeof window !== 'undefined') {
    // Browser environment
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v2';
  } else {
    // Server environment
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v2';
  }
};

// Create configuration instance with proper base URL
const apiConfiguration = new Configuration({
  basePath: getApiBaseUrl(),
  baseOptions: {
    withCredentials: true, // Enable cookies for session auth
    headers: {
      'X-Requested-With': 'XMLHttpRequest', // Required for SessionProtection middleware CSRF protection
    }
  }
});

// Export pre-configured API instances
export const authApi = new AuthApi(apiConfiguration);
export const authenticationApi = authApi; // Alias for backwards compatibility
export const campaignsApi = new CampaignsApi(apiConfiguration);
export const configApi = new ConfigApi(apiConfiguration);
export const configurationApi = new ConfigurationApi(apiConfiguration);
export const keywordSetsApi = new KeywordSetsApi(apiConfiguration);
export const personasApi = new PersonasApi(apiConfiguration);
export const proxiesApi = new ProxiesApi(apiConfiguration);
export const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration);
export const utilitiesApi = new UtilitiesApi(apiConfiguration);

// Legacy alias - use campaignsApi directly instead
export const apiClient = campaignsApi;

// Export types for convenience
export type { components } from './types';

// Import components type to use for re-exports
import type { components } from './types';

// Re-export specific types that are commonly used
export type CreateKeywordSetRequest = components['schemas']['CreateKeywordSetRequest'];
export type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];