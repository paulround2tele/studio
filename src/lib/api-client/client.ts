import type { paths, components } from './types';

// Type-safe API client using openapi-typescript generated types
type ApiPaths = paths;

// Extract operation types from paths
type GetOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } }
} ? R : unknown;

type PostOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } } | { 201: { content: { 'application/json': infer R } } }
} ? R : unknown;

type PutOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } }
} ? R : unknown;

type DeleteOperationResponse<T> = T extends {
  responses: { 200: { content: { 'application/json': infer R } } }
} ? R : unknown;

type OperationRequestBody<T> = T extends {
  requestBody: { content: { 'application/json': infer R } }
} ? R : never;

// Enhanced request configuration
interface RequestConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class ApiClient {
  private baseUrl: string;
  private config: RequestConfig;

  constructor(baseUrl?: string) {
    // Use environment variable for backend URL, fallback to provided baseUrl or default
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    this.baseUrl = baseUrl || backendUrl;
    
    // Enhanced configuration with retry logic
    this.config = {
      timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000'),
    };
    
    // Debug logging for API client initialization
    console.log('API_CLIENT_DEBUG - Initialized with:', {
      backendUrl,
      baseUrl: this.baseUrl,
      envVar: process.env.NEXT_PUBLIC_API_URL,
      config: this.config
    });
  }

  // Enhanced request method with retry logic and better error handling
  private async request<TResponse = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    options?: {
      params?: Record<string, string | number | boolean>;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<TResponse> {
    const url = new URL(`${this.baseUrl}${path}`);
    
    // Add query parameters
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log('API_CLIENT_DEBUG - Making request attempt:', {
          attempt,
          method,
          url: url.toString(),
          baseUrl: this.baseUrl,
          path,
          hasBody: !!options?.body
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          credentials: 'include', // Include cookies for session auth
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('API_CLIENT_DEBUG - Response received:', {
          attempt,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            console.error('API_CLIENT_DEBUG - Failed to parse error response as JSON:', jsonError);
            errorData = {
              message: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
              url: response.url
            };
          }
          
          const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          
          // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          lastError = error;
          
          // Retry on server errors
          if (attempt < this.config.retryAttempts) {
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`API_CLIENT_DEBUG - Retrying in ${delay}ms (attempt ${attempt}/${this.config.retryAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw error;
        }

        const responseData = await response.json();
        console.log('API_CLIENT_DEBUG - Successful response parsed');
        return responseData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Handle network errors and timeouts with retry
        if (error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')
        )) {
          console.warn('API_CLIENT_DEBUG - Network error, retrying:', {
            attempt,
            error: error.message,
            willRetry: attempt < this.config.retryAttempts
          });
          
          if (attempt < this.config.retryAttempts) {
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        console.error('API_CLIENT_DEBUG - Network or parsing error:', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          url: url.toString(),
          method
        });
        
        // If this is not the last attempt and it's a retryable error, continue
        if (attempt < this.config.retryAttempts) {
          continue;
        }
        
        throw lastError;
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Request failed after all retry attempts');
  }

  // AUTH API METHODS
  async login(credentials: OperationRequestBody<ApiPaths['/auth/login']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/auth/login']['post']>>(
      '/auth/login', 
      'POST', 
      { body: credentials }
    );
  }

  async logout() {
    return this.request<PostOperationResponse<ApiPaths['/auth/logout']['post']>>(
      '/auth/logout', 
      'POST'
    );
  }

  async refreshSession() {
    return this.request<PostOperationResponse<ApiPaths['/auth/refresh']['post']>>(
      '/auth/refresh', 
      'POST'
    );
  }

  async getCurrentUser() {
    try {
      return await this.request<GetOperationResponse<ApiPaths['/me']['get']>>(
        '/me',
        'GET'
      );
    } catch (error) {
      // Handle 401 responses gracefully for authentication checks
      if (error instanceof Error && error.message.includes('401')) {
        console.log('API_CLIENT_DEBUG - Authentication check: No valid session (401)');
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async changePassword(data: OperationRequestBody<ApiPaths['/change-password']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/change-password']['post']>>(
      '/change-password', 
      'POST', 
      { body: data }
    );
  }

  // CAMPAIGN API METHODS
  async listCampaigns() {
    return this.request<GetOperationResponse<ApiPaths['/campaigns']['get']>>(
      '/campaigns', 
      'GET'
    );
  }

  async createCampaign(data: OperationRequestBody<ApiPaths['/campaigns']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns']['post']>>(
      '/campaigns', 
      'POST', 
      { body: data }
    );
  }

  async getCampaignById(campaignId: string) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}']['get']>>(
      `/campaigns/${campaignId}`, 
      'GET'
    );
  }

  async deleteCampaign(campaignId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/campaigns/{campaignId}']['delete']>>(
      `/campaigns/${campaignId}`, 
      'DELETE'
    );
  }

  async startCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/start']['post']>>(
      `/campaigns/${campaignId}/start`, 
      'POST'
    );
  }

  async pauseCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/pause']['post']>>(
      `/campaigns/${campaignId}/pause`, 
      'POST'
    );
  }

  async resumeCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/resume']['post']>>(
      `/campaigns/${campaignId}/resume`, 
      'POST'
    );
  }

  async cancelCampaign(campaignId: string) {
    return this.request<PostOperationResponse<ApiPaths['/campaigns/{campaignId}/cancel']['post']>>(
      `/campaigns/${campaignId}/cancel`, 
      'POST'
    );
  }

  async getCampaignGeneratedDomains(campaignId: string, params?: { limit?: number; cursor?: number }) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}/results/generated-domains']['get']>>(
      `/campaigns/${campaignId}/results/generated-domains`, 
      'GET',
      { params }
    );
  }

  async getCampaignDNSValidationResults(campaignId: string, params?: { limit?: number; cursor?: string }) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}/results/dns-validation']['get']>>(
      `/campaigns/${campaignId}/results/dns-validation`, 
      'GET',
      { params }
    );
  }

  async getCampaignHTTPKeywordResults(campaignId: string, params?: { limit?: number; cursor?: string }) {
    return this.request<GetOperationResponse<ApiPaths['/campaigns/{campaignId}/results/http-keyword']['get']>>(
      `/campaigns/${campaignId}/results/http-keyword`, 
      'GET',
      { params }
    );
  }

  // PERSONA API METHODS
  async listPersonas() {
    return this.request<GetOperationResponse<ApiPaths['/personas']['get']>>(
      '/personas', 
      'GET'
    );
  }

  async createPersona(data: OperationRequestBody<ApiPaths['/personas']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/personas']['post']>>(
      '/personas', 
      'POST', 
      { body: data }
    );
  }

  async getPersonaById(id: string) {
    return this.request<GetOperationResponse<ApiPaths['/personas/{id}']['get']>>(
      `/personas/${id}`, 
      'GET'
    );
  }

  async updatePersona(id: string, data: OperationRequestBody<ApiPaths['/personas/{id}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/personas/{id}']['put']>>(
      `/personas/${id}`, 
      'PUT', 
      { body: data }
    );
  }

  async deletePersona(id: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/personas/{id}']['delete']>>(
      `/personas/${id}`, 
      'DELETE'
    );
  }

  async testPersona(id: string) {
    return this.request<PostOperationResponse<ApiPaths['/personas/{id}/test']['post']>>(
      `/personas/${id}/test`, 
      'POST'
    );
  }

  // PROXY API METHODS
  async listProxies() {
    return this.request<GetOperationResponse<ApiPaths['/proxies']['get']>>(
      '/proxies', 
      'GET'
    );
  }

  async createProxy(data: OperationRequestBody<ApiPaths['/proxies']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/proxies']['post']>>(
      '/proxies', 
      'POST', 
      { body: data }
    );
  }

  async updateProxy(proxyId: string, data: OperationRequestBody<ApiPaths['/proxies/{proxyId}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/proxies/{proxyId}']['put']>>(
      `/proxies/${proxyId}`, 
      'PUT', 
      { body: data }
    );
  }

  async deleteProxy(proxyId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/proxies/{proxyId}']['delete']>>(
      `/proxies/${proxyId}`, 
      'DELETE'
    );
  }

  async testProxy(proxyId: string) {
    return this.request<PostOperationResponse<ApiPaths['/proxies/{proxyId}/test']['post']>>(
      `/proxies/${proxyId}/test`, 
      'POST'
    );
  }

  async forceProxyHealthCheck(proxyId: string) {
    return this.request<PostOperationResponse<ApiPaths['/proxies/{proxyId}/health-check']['post']>>(
      `/proxies/${proxyId}/health-check`, 
      'POST'
    );
  }

  async forceAllProxiesHealthCheck() {
    return this.request<PostOperationResponse<ApiPaths['/proxies/health-check']['post']>>(
      '/proxies/health-check', 
      'POST'
    );
  }

  async getProxyStatuses() {
    return this.request<GetOperationResponse<ApiPaths['/proxies/status']['get']>>(
      '/proxies/status', 
      'GET'
    );
  }

  // PROXY POOL API METHODS
  async listProxyPools() {
    return this.request<GetOperationResponse<ApiPaths['/proxy-pools']['get']>>(
      '/proxy-pools', 
      'GET'
    );
  }

  async createProxyPool(data: OperationRequestBody<ApiPaths['/proxy-pools']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/proxy-pools']['post']>>(
      '/proxy-pools', 
      'POST', 
      { body: data }
    );
  }

  async updateProxyPool(poolId: string, data: OperationRequestBody<ApiPaths['/proxy-pools/{poolId}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/proxy-pools/{poolId}']['put']>>(
      `/proxy-pools/${poolId}`, 
      'PUT', 
      { body: data }
    );
  }

  async deleteProxyPool(poolId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/proxy-pools/{poolId}']['delete']>>(
      `/proxy-pools/${poolId}`, 
      'DELETE'
    );
  }

  async addProxyToPool(poolId: string, data: OperationRequestBody<ApiPaths['/proxy-pools/{poolId}/proxies']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/proxy-pools/{poolId}/proxies']['post']>>(
      `/proxy-pools/${poolId}/proxies`, 
      'POST', 
      { body: data }
    );
  }

  async removeProxyFromPool(poolId: string, proxyId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/proxy-pools/{poolId}/proxies/{proxyId}']['delete']>>(
      `/proxy-pools/${poolId}/proxies/${proxyId}`, 
      'DELETE'
    );
  }

  // KEYWORD SET API METHODS
  async listKeywordSets(params?: { limit?: number; offset?: number; isEnabled?: boolean }) {
    return this.request<GetOperationResponse<ApiPaths['/keywords/sets']['get']>>(
      '/keywords/sets', 
      'GET',
      { params }
    );
  }

  async createKeywordSet(data: OperationRequestBody<ApiPaths['/keywords/sets']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/keywords/sets']['post']>>(
      '/keywords/sets', 
      'POST', 
      { body: data }
    );
  }

  async getKeywordSetById(setId: string) {
    return this.request<GetOperationResponse<ApiPaths['/keywords/sets/{setId}']['get']>>(
      `/keywords/sets/${setId}`, 
      'GET'
    );
  }

  async updateKeywordSet(setId: string, data: OperationRequestBody<ApiPaths['/keywords/sets/{setId}']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/keywords/sets/{setId}']['put']>>(
      `/keywords/sets/${setId}`, 
      'PUT', 
      { body: data }
    );
  }

  async deleteKeywordSet(setId: string) {
    return this.request<DeleteOperationResponse<ApiPaths['/keywords/sets/{setId}']['delete']>>(
      `/keywords/sets/${setId}`, 
      'DELETE'
    );
  }

  // CONFIG API METHODS
  async getFeatureFlags() {
    return this.request<GetOperationResponse<ApiPaths['/config/features']['get']>>(
      '/config/features', 
      'GET'
    );
  }

  async updateFeatureFlags(data: OperationRequestBody<ApiPaths['/config/features']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/config/features']['post']>>(
      '/config/features', 
      'POST', 
      { body: data }
    );
  }

  // CONFIG API METHODS - All configurations with proper typing
  async getDNSConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/dns']['get']>>(
      '/config/dns',
      'GET'
    );
  }

  async updateDNSConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/dns']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/dns']['post']>>(
      '/config/dns',
      'POST',
      { body: data }
    );
  }

  async getHTTPConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/http']['get']>>(
      '/config/http',
      'GET'
    );
  }

  async updateHTTPConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/http']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/http']['post']>>(
      '/config/http',
      'POST',
      { body: data }
    );
  }

  async getLoggingConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/logging']['get']>>(
      '/config/logging',
      'GET'
    );
  }

  async updateLoggingConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/logging']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/logging']['post']>>(
      '/config/logging',
      'POST',
      { body: data }
    );
  }

  async getWorkerConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/worker']['get']>>(
      '/config/worker',
      'GET'
    );
  }

  async updateWorkerConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/worker']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/worker']['post']>>(
      '/config/worker',
      'POST',
      { body: data }
    );
  }

  async getRateLimiterConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/rate-limit']['get']>>(
      '/config/rate-limit',
      'GET'
    );
  }

  async updateRateLimiterConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/rate-limit']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/rate-limit']['post']>>(
      '/config/rate-limit',
      'POST',
      { body: data }
    );
  }

  async getProxyManagerConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/proxy-manager']['get']>>(
      '/config/proxy-manager',
      'GET'
    );
  }

  async updateProxyManagerConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/proxy-manager']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/proxy-manager']['post']>>(
      '/config/proxy-manager',
      'POST',
      { body: data }
    );
  }

  async getServerConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/server']['get']>>(
      '/config/server',
      'GET'
    );
  }

  async updateServerConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/server']['put']>) {
    return this.request<PutOperationResponse<ApiPaths['/api/v2/config/server']['put']>>(
      '/config/server',
      'PUT',
      { body: data }
    );
  }

  async getAuthConfig() {
    return this.request<GetOperationResponse<ApiPaths['/api/v2/config/auth']['get']>>(
      '/config/auth',
      'GET'
    );
  }

  async updateAuthConfig(data: OperationRequestBody<ApiPaths['/api/v2/config/auth']['post']>) {
    return this.request<PostOperationResponse<ApiPaths['/api/v2/config/auth']['post']>>(
      '/config/auth',
      'POST',
      { body: data }
    );
  }
}

// Export a default instance
export const apiClient = new ApiClient();

// Legacy function aliases for backward compatibility
export const getCampaigns = () => apiClient.listCampaigns();
export const getCampaignById = (id: string) => apiClient.getCampaignById(id);
export const getGeneratedDomainsForCampaign = (campaignId: string, params?: { limit?: number; cursor?: number }) =>
  apiClient.getCampaignGeneratedDomains(campaignId, params);
export const getDnsCampaignDomains = (campaignId: string, params?: { limit?: number; cursor?: string }) =>
  apiClient.getCampaignDNSValidationResults(campaignId, params);
export const getHttpCampaignItems = (campaignId: string, params?: { limit?: number; cursor?: string }) =>
  apiClient.getCampaignHTTPKeywordResults(campaignId, params);
export const startCampaignPhase = (campaignId: string) => apiClient.startCampaign(campaignId);
export const pauseCampaign = (campaignId: string) => apiClient.pauseCampaign(campaignId);
export const resumeCampaign = (campaignId: string) => apiClient.resumeCampaign(campaignId);
export const stopCampaign = (campaignId: string) => apiClient.cancelCampaign(campaignId);

// Chain campaign method - assuming this creates a follow-up campaign
export const chainCampaign = async (_campaignId: string) => {
  // This would need to be implemented based on business logic
  // For now, we'll throw an error to indicate it needs implementation
  throw new Error('chainCampaign not yet implemented - needs business logic definition');
};

// Export generated types for use in services
export type {
  components,
  paths as ApiPaths,
  GetOperationResponse,
  PostOperationResponse,
  PutOperationResponse,
  DeleteOperationResponse,
  OperationRequestBody
};
