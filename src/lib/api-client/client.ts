// Clean API Client Configuration
// Auto-generated API instances with proper configuration
// DO NOT manually add custom methods - use the auto-generated APIs directly

import {
  AuthenticationApi,
  CampaignsApi,
  DatabaseApi,
  ServerSettingsApi,
  KeywordSetsApi,
  KeywordExtractionApi,
  PersonasApi,
  ProxiesApi,
  ProxyPoolsApi,
  HealthApi,
  FeatureFlagsApi,
  Configuration
} from './index';

// BACKEND-DRIVEN: Pure environment variable approach (no hardcoded fallbacks)
const getApiBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured || !configured.trim()) {
    throw new Error(
      'CONFIGURATION ERROR: NEXT_PUBLIC_API_URL environment variable is required. ' +
      'Please set it to your backend API URL (e.g., http://localhost:8080/api/v2)'
    );
  }
  return configured.trim();
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
export const databaseApi = new DatabaseApi(apiConfiguration);
export const serverSettingsApi = new ServerSettingsApi(apiConfiguration);
export const configApi = serverSettingsApi; // Alias - config endpoints are under server-settings
export const configurationApi = serverSettingsApi; // Alias - config endpoints are under server-settings
export const keywordSetsApi = new KeywordSetsApi(apiConfiguration);
export const keywordExtractionApi = new KeywordExtractionApi(apiConfiguration);
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
export type CreateKeywordSetRequest = components['schemas']['CreateKeywordSetRequest'];
export type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];