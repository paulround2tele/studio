// Clean API Client Configuration
// Auto-generated API instances with proper configuration
// DO NOT manually add custom methods - use the auto-generated APIs directly

import {
  AuthenticationApi,
  CampaignsApi,
  ServerSettingsApi,
  KeywordSetsApi,
  PersonasApi,
  ProxiesApi,
  ProxyPoolsApi,
  HealthApi,
  FeatureFlagsApi,
  Configuration
} from './index';

// Import proper environment configuration - NO HARDCODED URLS
import { getApiConfig } from '@/lib/config/environment';

// Get API base URL from environment configuration system
const getApiBaseUrl = (): string => {
  const apiConfig = getApiConfig();
  return apiConfig.baseUrl;
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
export const authenticationApi = new AuthenticationApi(apiConfiguration);
export const authApi = authenticationApi; // Alias for backwards compatibility
export const campaignsApi = new CampaignsApi(apiConfiguration);
export const serverSettingsApi = new ServerSettingsApi(apiConfiguration);
export const configApi = serverSettingsApi; // Alias - config endpoints are under server-settings
export const configurationApi = serverSettingsApi; // Alias - config endpoints are under server-settings
export const keywordSetsApi = new KeywordSetsApi(apiConfiguration);
export const personasApi = new PersonasApi(apiConfiguration);
export const proxiesApi = new ProxiesApi(apiConfiguration);
export const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration);
export const healthApi = new HealthApi(apiConfiguration);
export const utilitiesApi = healthApi; // Alias - utilities like ping are under health
export const featureFlagsApi = new FeatureFlagsApi(apiConfiguration);

// Legacy alias - use campaignsApi directly instead
export const apiClient = campaignsApi;

// Export types for convenience
export type { components } from './types';

// Import components type to use for re-exports
import type { components } from './types';

// Re-export specific types that are commonly used
export type CreateKeywordSetRequest = components['schemas']['api.CreateKeywordSetRequest'];
export type CreateCampaignRequest = components['schemas']['services.CreateCampaignRequest'];