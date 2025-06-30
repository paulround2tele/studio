// src/lib/utils/apiClientFactory.ts
// Factory for creating properly configured API clients
import { Configuration } from '@/lib/api-client/configuration';
import { getApiConfig } from '@/lib/config/environment';
import axios, { type AxiosInstance } from 'axios';

// Import all generated API classes
import { AuthApi } from '@/lib/api-client/api/auth-api';
import { CampaignsApi } from '@/lib/api-client/api/campaigns-api';
import { KeywordSetsApi } from '@/lib/api-client/api/keyword-sets-api';
import { PersonasApi } from '@/lib/api-client/api/personas-api';
import { ProxiesApi } from '@/lib/api-client/api/proxies-api';
import { ProxyPoolsApi } from '@/lib/api-client/api/proxy-pools-api';
import { ConfigApi } from '@/lib/api-client/api/config-api';
import { WebSocketApi } from '@/lib/api-client/api/web-socket-api';

/**
 * Creates a properly configured axios instance for API clients
 * - Uses environment-based baseURL (no hardcoding)
 * - Includes credentials for session-based auth
 * - Adds required CSRF headers
 */
function createApiClientInstance(): AxiosInstance {
  const apiConfig = getApiConfig();
  
  return axios.create({
    baseURL: apiConfig.baseUrl,
    withCredentials: true, // Include cookies for session auth
    headers: {
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Creates a properly configured Configuration instance for generated API clients
 */
function createApiConfiguration(): Configuration {
  const apiConfig = getApiConfig();
  
  return new Configuration({
    basePath: apiConfig.baseUrl,
  });
}

// Singleton instances
let axiosInstance: AxiosInstance | null = null;
let configuration: Configuration | null = null;

/**
 * Get shared axios instance with proper configuration
 */
export function getApiClientInstance(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = createApiClientInstance();
  }
  return axiosInstance;
}

/**
 * Get shared configuration instance
 */
export function getApiConfiguration(): Configuration {
  if (!configuration) {
    configuration = createApiConfiguration();
  }
  return configuration;
}

/**
 * Create API client with proper configuration
 * Use this for all generated API clients
 */
export function createConfiguredApiClient<T>(ApiClass: new (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) => T): T {
  const config = getApiConfiguration();
  const axiosInst = getApiClientInstance();
  
  return new ApiClass(config, undefined, axiosInst);
}

// Specific API client factory functions
export function createAuthApi(): AuthApi {
  return createConfiguredApiClient(AuthApi);
}

export function createCampaignsApi(): CampaignsApi {
  return createConfiguredApiClient(CampaignsApi);
}

export function createKeywordSetsApi(): KeywordSetsApi {
  return createConfiguredApiClient(KeywordSetsApi);
}

export function createPersonasApi(): PersonasApi {
  return createConfiguredApiClient(PersonasApi);
}

export function createProxiesApi(): ProxiesApi {
  return createConfiguredApiClient(ProxiesApi);
}

export function createConfigApi(): ConfigApi {
  return createConfiguredApiClient(ConfigApi);
}

export function createWebSocketApi(): WebSocketApi {
  return createConfiguredApiClient(WebSocketApi);
}

export function createProxyPoolsApi(): ProxyPoolsApi {
  return createConfiguredApiClient(ProxyPoolsApi);
}
