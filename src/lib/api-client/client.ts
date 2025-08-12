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

// BACKEND-DRIVEN: Runtime auto-detection (matches backend's empty servers design)
const getApiBaseUrl = (): string => {
  // First try configured URL from environment
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return configured.trim();
  }

  // BACKEND-DRIVEN AUTO-DETECTION: Never throw errors, always detect at runtime
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // Development: Use current hostname with backend port :8080
      const apiUrl = `${protocol}//${hostname}:8080/api/v2`;
      console.log(`🔗 [API Client] Auto-detected development API URL: ${apiUrl}`);
      return apiUrl;
    } else {
      // Production: Use same origin as frontend (same hostname, same protocol)
      const apiUrl = `${protocol}//${hostname}/api/v2`;
      console.log(`🔗 [API Client] Auto-detected production API URL: ${apiUrl}`);
      return apiUrl;
    }
  }

  // SSR fallback: Use relative URL (backend serves frontend)
  const fallbackUrl = '/api/v2';
  console.log(`🔗 [API Client] Using SSR fallback URL: ${fallbackUrl}`);
  return fallbackUrl;
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
// Professional type exports using direct model imports
export type { CreateKeywordSetRequest } from './models/create-keyword-set-request';
export type { CreateCampaignRequest } from './models/create-campaign-request';