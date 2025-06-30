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


export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use environment variable for backend URL, fallback to provided baseUrl or default
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    this.baseUrl = baseUrl || `${backendUrl}/api/v2`;
  }

  // Generic request method with type safety
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

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include', // Include cookies for session auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
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
    return this.request<GetOperationResponse<ApiPaths['/me']['get']>>(
      '/me', 
      'GET'
    );
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
}

// Export a default instance
export const apiClient = new ApiClient();

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
